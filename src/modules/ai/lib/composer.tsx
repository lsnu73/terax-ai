import { invoke } from "@tauri-apps/api/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { currentWorkspaceEnv } from "@/modules/workspace";
import type { Snippet } from "./snippets";
import type { SlashCommandMeta } from "./slashCommands";
import {
  buildComposerMessage,
  type ComposerFile,
  type ComposerSubmission,
} from "./composerMessage";
import { getChat, useChatStore } from "../store/chatStore";
import { useAiPanelStore } from "../store/aiPanelStore";
import { useSnippetsStore } from "../store/snippetsStore";

export type FileAttachment = ComposerFile;

const MAX_TEXT_INLINE = 200_000;
export const ACCEPTED_FILES =
  "image/*,.txt,.md,.json,.yaml,.yml,.toml,.sh,.zsh,.bash,.py,.js,.jsx,.ts,.tsx,.rs,.go,.java,.c,.cpp,.h,.hpp,.html,.css,.csv,.log,.env,.config,.conf,.ini,Dockerfile,.dockerfile";

type ComposerCtx = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  files: FileAttachment[];
  addFiles: (list: FileList | null) => Promise<void>;
  addAttachments: (attachments: FileAttachment[]) => void;
  attachFileByPath: (path: string) => Promise<void>;
  attachFilesByPaths: (paths: string[]) => Promise<void>;
  removeFile: (id: string) => void;
  pickedSnippets: Snippet[];
  addSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: string) => void;
  pickedCommands: SlashCommandMeta[];
  addCommand: (command: SlashCommandMeta) => void;
  removeCommand: (name: string) => void;
  isBusy: boolean;
  submit: () => void;
  stop: () => void;
  canSend: boolean;
};

const Ctx = createContext<ComposerCtx | null>(null);

export function useComposer(): ComposerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useComposer must be used inside <AiComposerProvider>");
  }
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
  sendSubmission?: (submission: ComposerSubmission) => Promise<void>;
  stopSubmission?: () => void;
};

export function AiComposerProvider({
  children,
  sendSubmission,
  stopSubmission,
}: ProviderProps) {
  const { t } = useTranslation();
  const sessionId = useChatStore((s) => s.activeSessionId);
  const status = useChatStore((s) => s.agentMeta.status);
  const agentBusy = status === "thinking" || status === "streaming";
  const [remoteSending, setRemoteSending] = useState(false);
  const isBusy = agentBusy || remoteSending;

  const [value, setValue] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [pickedSnippets, setPickedSnippets] = useState<Snippet[]>([]);
  const [pickedCommands, setPickedCommands] = useState<SlashCommandMeta[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusSignal = useChatStore((s) => s.focusSignal);

  useEffect(() => {
    if (focusSignal === 0) return;
    textareaRef.current?.focus();
  }, [focusSignal]);

  const prevIsBusyRef = useRef(false);
  useEffect(() => {
    if (prevIsBusyRef.current && !isBusy) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    prevIsBusyRef.current = isBusy;
  }, [isBusy]);

  const filesRef = useRef<FileAttachment[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  /** 按 id 去重后加入附件。 */
  const mergeAttachments = useCallback((attachments: FileAttachment[]) => {
    if (attachments.length === 0) return;
    const existing = new Set(filesRef.current.map((file) => file.id));
    const fresh = attachments.filter((file) => !existing.has(file.id));
    if (fresh.length === 0) return;
    // 同步写 ref：连续两次附加（例如同时拖入多个文件）时后一次也能看到前一次。
    filesRef.current = [...filesRef.current, ...fresh];
    setFiles((previous) => [...previous, ...fresh]);
  }, []);

  /**
   * 添加成功不再弹通知——附件 chip 会立即出现在输入框上方，本身就是反馈。
   * 只有“没有出现在列表里”的结果（二进制、超出大小限制）才需要提示原因。
   */
  const announceAttachments = useCallback(
    (skipped: number) => {
      if (skipped > 0) {
        toast.warning(t("ai.composer.attachSkipped", { count: skipped }));
      }
    },
    [t],
  );

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const next: FileAttachment[] = [];
    let skipped = 0;
    for (const file of incoming) {
      const attachment = await readAttachment(file);
      if (attachment) next.push(attachment);
      else skipped += 1;
    }
    if (next.length > 0) mergeAttachments(next);
    announceAttachments(skipped);
  };

  const addAttachments = (attachments: FileAttachment[]) => {
    mergeAttachments(attachments);
  };

  const removeFile = (id: string) =>
    setFiles((previous) => previous.filter((file) => file.id !== id));

  const addSnippet = (snippet: Snippet) =>
    setPickedSnippets((previous) =>
      previous.some((item) => item.id === snippet.id)
        ? previous
        : [...previous, snippet],
    );
  const removeSnippet = (id: string) =>
    setPickedSnippets((previous) =>
      previous.filter((snippet) => snippet.id !== id),
    );

  const addCommand = (command: SlashCommandMeta) =>
    setPickedCommands((previous) =>
      previous.some((item) => item.name === command.name)
        ? previous
        : [...previous, command],
    );
  const removeCommand = (name: string) =>
    setPickedCommands((previous) =>
      previous.filter((command) => command.name !== name),
    );

  const attachFilesByPaths = useCallback(
    async (paths: string[]) => {
      const unique = [...new Set(paths.filter((path) => path.length > 0))];
      if (unique.length === 0) return;
      const results = await Promise.all(unique.map(readAttachmentByPath));
      const attachments = results.flatMap((result) =>
        result.ok ? [result.attachment] : [],
      );
      const failed = results.filter(
        (result): result is Extract<PathAttachmentResult, { ok: false }> =>
          !result.ok && result.reason === "error",
      );
      const skipped = results.length - attachments.length - failed.length;
      if (attachments.length > 0) mergeAttachments(attachments);
      announceAttachments(skipped);
      for (const failure of failed) {
        toast.error(
          t("ai.composer.attachFailed", {
            name: failure.name,
            message: failure.message ?? "",
          }),
        );
      }
      useChatStore.getState().focusInput();
    },
    [announceAttachments, mergeAttachments, t],
  );

  const attachFileByPath = useCallback(
    (path: string) => attachFilesByPaths([path]),
    [attachFilesByPaths],
  );

  useEffect(() => {
    const onAttach = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path === "string" && path.length > 0) {
        void attachFileByPath(path);
      }
    };
    window.addEventListener("terax:ai-attach-file", onAttach);
    return () => window.removeEventListener("terax:ai-attach-file", onAttach);
  }, [attachFileByPath]);

  const clear = () => {
    setValue("");
    setFiles([]);
    filesRef.current = [];
    setPickedSnippets([]);
    setPickedCommands([]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = () => {
    if (isBusy) return;
    const trimmed = value.trim();
    if (
      !trimmed &&
      files.length === 0 &&
      pickedSnippets.length === 0 &&
      pickedCommands.length === 0
    ) {
      return;
    }
    const submission: ComposerSubmission = {
      text: value,
      files,
      snippets: pickedSnippets,
      commands: pickedCommands,
    };
    if (sendSubmission) {
      setRemoteSending(true);
      void sendSubmission(submission)
        .then(clear)
        .catch((error: unknown) => {
          console.error("AI window send failed:", error);
        })
        .finally(() => setRemoteSending(false));
      return;
    }
    if (!sessionId) return;
    const message = buildComposerMessage(
      submission,
      useSnippetsStore.getState().snippets,
    );
    if (message.kind === "handled") {
      clear();
      return;
    }
    const store = useChatStore.getState();
    store.patchAgentMeta({ hitStepCap: false, compactionNotice: null });
    useAiPanelStore.getState().openPanel();
    void (async () => {
      const { getOrCreateChat } = await import("../store/chatRuntime");
      const chat = getOrCreateChat(sessionId);
      void chat.sendMessage({
        role: "user",
        parts: message.parts,
      } as Parameters<typeof chat.sendMessage>[0]);
    })();
    clear();
  };

  const stop = () => {
    if (stopSubmission) {
      stopSubmission();
      return;
    }
    if (!sessionId) return;
    void getChat(sessionId)?.stop();
  };

  const canSend =
    !isBusy &&
    (value.trim().length > 0 ||
      files.length > 0 ||
      pickedSnippets.length > 0 ||
      pickedCommands.length > 0);

  const ctx: ComposerCtx = {
    textareaRef,
    value,
    setValue,
    files,
    addFiles,
    addAttachments,
    attachFileByPath,
    attachFilesByPaths,
    removeFile,
    pickedSnippets,
    addSnippet,
    removeSnippet,
    pickedCommands,
    addCommand,
    removeCommand,
    isBusy,
    submit,
    stop,
    canSend,
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

type ReadFileResult =
  | { kind: "text"; content: string; size: number }
  | { kind: "binary"; size: number }
  | { kind: "toolarge"; size: number; limit: number };

type PathAttachmentResult =
  | { ok: true; attachment: FileAttachment }
  | {
      ok: false;
      name: string;
      reason: "binary" | "too-large" | "error";
      message?: string;
    };

/**
 * 从绝对路径读附件（右键“附加到 Agent”、@ 文件选择、拖拽投放都走这里）。
 * 文本内联进消息；二进制/超大文件不回传内容，交给调用方给出可见提示。
 */
async function readAttachmentByPath(
  path: string,
): Promise<PathAttachmentResult> {
  const name = path.split(/[\\/]/).pop() || path;
  try {
    const result = await invoke<ReadFileResult>("fs_read_file", {
      path,
      workspace: currentWorkspaceEnv(),
    });
    if (result.kind === "text") {
      return {
        ok: true,
        attachment: {
          id: `path-${path}`,
          name,
          kind: "text",
          mediaType: "text/plain",
          text: result.content,
          size: result.size,
        },
      };
    }
    if (result.kind === "binary") {
      return { ok: false, name, reason: "binary" };
    }
    return { ok: false, name, reason: "too-large" };
  } catch (error) {
    return {
      ok: false,
      name,
      reason: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readAttachment(file: File): Promise<FileAttachment | null> {  const id = `${file.name}-${file.size}-${file.lastModified}`;
  if (file.type.startsWith("image/")) {
    const url = await readAsDataURL(file);
    return {
      id,
      name: file.name,
      kind: "image",
      mediaType: file.type || "image/png",
      url,
      size: file.size,
    };
  }
  if (file.size > MAX_TEXT_INLINE) return null;
  const text = await file.text();
  return {
    id,
    name: file.name,
    kind: "text",
    mediaType: file.type || "text/plain",
    text,
    size: file.size,
  };
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
