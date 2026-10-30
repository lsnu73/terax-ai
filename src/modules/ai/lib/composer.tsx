import { invoke } from "@tauri-apps/api/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { currentWorkspaceEnv } from "@/modules/workspace";
import type { Snippet } from "./snippets";
import type { SlashCommandMeta } from "./slashCommands";
import {
  buildComposerMessage,
  type ComposerFile,
  type ComposerSubmission,
} from "./composerMessage";
import { getChat, useChatStore } from "../store/chatStore";
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

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const next: FileAttachment[] = [];
    for (const file of Array.from(list)) {
      const attachment = await readAttachment(file);
      if (attachment) next.push(attachment);
    }
    if (next.length) setFiles((previous) => [...previous, ...next]);
  };

  const addAttachments = (attachments: FileAttachment[]) => {
    setFiles((previous) => {
      const existing = new Set(previous.map((file) => file.id));
      return [
        ...previous,
        ...attachments.filter((file) => !existing.has(file.id)),
      ];
    });
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

  const attachFileByPath = useCallback(async (path: string) => {
    try {
      type ReadResult =
        | { kind: "text"; content: string; size: number }
        | { kind: "binary"; size: number }
        | { kind: "toolarge"; size: number; limit: number };
      const result = await invoke<ReadResult>("fs_read_file", {
        path,
        workspace: currentWorkspaceEnv(),
      });
      if (result.kind !== "text") {
        console.warn("attachFileByPath: skipped non-text file", path, result);
        return;
      }
      const name = path.split(/[\\/]/).pop() || path;
      const id = `path-${path}`;
      setFiles((previous) => {
        if (previous.some((file) => file.id === id)) return previous;
        return [
          ...previous,
          {
            id,
            name,
            kind: "text",
            mediaType: "text/plain",
            text: result.content,
            size: result.size,
          },
        ];
      });
      useChatStore.getState().focusInput();
    } catch (error) {
      console.error("attachFileByPath failed:", error);
    }
  }, []);

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
    if (!store.aiWindow.open) store.openAiWindow();
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

async function readAttachment(file: File): Promise<FileAttachment | null> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
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
