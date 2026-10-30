import { useChat, type UIMessage } from "@ai-sdk/react";
import type { ToolUIPart, UIMessagePart } from "ai";
import { emitTo, listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { tryResolveModel } from "../config";
import { openAiWindow } from "../lib/aiWindow";
import {
  AI_WINDOW_COMMAND_EVENT,
  AI_WINDOW_READY_EVENT,
  AI_WINDOW_SNAPSHOT_EVENT,
  type AiWindowCommand,
  type AiWindowSnapshot,
} from "../lib/aiWindowBridge";
import { native } from "../lib/native";
import { checkReadable } from "../lib/security";
import { usePlanStore } from "../store/planStore";
import { useTodosStore } from "../store/todoStore";
import { useWorkspaceEnvStore } from "@/modules/workspace";
import { buildComposerMessage } from "../lib/composerMessage";
import { useSnippetsStore } from "../store/snippetsStore";
import { resolvePath } from "../tools/tools";
import {
  flushPersist,
  useChatStore,
  type AgentRunStatus,
} from "../store/chatStore";
import { getOrCreateChat } from "../store/chatRuntime";

/**
 * Headless bridge that owns the single chat engine and mirrors its lifecycle
 * into the store and the native AI window.
 *
 * Side effects:
 *  - Patches `agentMeta` on every status / approvals change.
 *  - Auto-opens the AI window when an approval is pending.
 *  - For pending `write_file` calls, opens an AI diff tab in the editor area
 *    so the user can review the proposed change before approving.
 *  - Persists messages of the active session on every change.
 */

export type DiffOpenInput = {
  path: string;
  originalContent: string;
  proposedContent: string;
  approvalId: string;
  isNewFile: boolean;
};

export type AgentRunBridgeProps = {
  openAiDiffTab: (input: DiffOpenInput) => number | null;
  closeAiDiffTab: (approvalId: string) => void;
};

export function AgentRunBridge(props: AgentRunBridgeProps) {
  const sessionId = useChatStore((s) => s.activeSessionId);
  if (!sessionId) return null;
  return <Bridge sessionId={sessionId} {...props} />;
}

type BridgeProps = { sessionId: string } & AgentRunBridgeProps;

type WriteFileInput = { path?: unknown; content?: unknown };

type ToolPartLike = ToolUIPart & {
  approval?: { id: string };
  input?: WriteFileInput;
};

type AnyPart = UIMessagePart<Record<string, never>, Record<string, never>>;

function Bridge({
  sessionId,
  openAiDiffTab,
  closeAiDiffTab,
}: BridgeProps) {
  const chat = useMemo(() => getOrCreateChat(sessionId), [sessionId]);
  const { status, messages, error, clearError, addToolApprovalResponse } =
    useChat<UIMessage>({ chat });
  const patch = useChatStore((s) => s.patchAgentMeta);
  const persistMessages = useChatStore((s) => s.persistMessages);
  const setApprovalResponder = useChatStore((s) => s.setApprovalResponder);
  const sessions = useChatStore((s) => s.sessions);
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const agentMeta = useChatStore((s) => s.agentMeta);
  const planActive = usePlanStore((s) => s.active);
  const planQueue = usePlanStore((s) => s.queue);
  const todos = useTodosStore((s) => s.bySession[sessionId]);
  const workspaceRoot = useChatStore((s) => s.live.getWorkspaceRoot());
  const workspaceEnv = useWorkspaceEnvStore((s) => s.env);
  const aiWindowOpen = useChatStore((s) => s.aiWindow.open);

  const modelLabel = useMemo(
    () => tryResolveModel(selectedModelId)?.label ?? selectedModelId,
    [selectedModelId],
  );
  const snapshot = useMemo<AiWindowSnapshot>(
    () => ({
      sessionId,
      sessions,
      messages,
      status,
      error: error?.message ?? null,
      selectedModelId,
      modelLabel,
      agentMeta,
      planActive,
      planQueue,
      todos: todos ?? [],
      workspaceRoot,
      workspaceEnv,
    }),
    [
      sessionId,
      sessions,
      messages,
      status,
      error,
      selectedModelId,
      modelLabel,
      agentMeta,
      planActive,
      planQueue,
      todos,
      workspaceRoot,
      workspaceEnv,
    ],
  );
  const emitSnapshot = useCallback(() => {
    if (!useChatStore.getState().aiWindow.open) return;
    void emitTo("ai", AI_WINDOW_SNAPSHOT_EVENT, snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!aiWindowOpen) return;
    const timer = setTimeout(
      emitSnapshot,
      status === "streaming" || status === "submitted" ? 60 : 0,
    );
    return () => clearTimeout(timer);
  }, [aiWindowOpen, emitSnapshot, status]);

  useEffect(() => {
    let alive = true;
    const unlisten = listen(AI_WINDOW_READY_EVENT, () => {
      if (alive) emitSnapshot();
    });
    return () => {
      alive = false;
      void unlisten.then((fn) => fn());
    };
  }, [emitSnapshot]);

  useEffect(() => {
    let disposed = false;
    const unlisten = listen<AiWindowCommand>(
      AI_WINDOW_COMMAND_EVENT,
      (event) => {
        if (disposed) return;
        const command = event.payload;
        const store = useChatStore.getState();
        switch (command.type) {
          case "send": {
            const message = buildComposerMessage(
              command.submission,
              useSnippetsStore.getState().snippets,
            );
            if (message.kind === "handled") return;
            store.patchAgentMeta({ hitStepCap: false, compactionNotice: null });
            void chat.sendMessage({
              role: "user",
              parts: message.parts,
            } as Parameters<typeof chat.sendMessage>[0]);
            return;
          }
          case "stop":
            void chat.stop();
            return;
          case "continue":
            store.patchAgentMeta({ hitStepCap: false });
            void chat.sendMessage({
              text: "Continue from where you stopped. Don't recap, just keep going.",
            });
            return;
          case "approval":
            void addToolApprovalResponse({
              id: command.id,
              approved: command.approved,
            });
            return;
          case "clear-error":
            clearError();
            return;
          case "select-model":
            store.setSelectedModelId(command.id);
            return;
          case "new-session":
            store.newSession();
            return;
          case "switch-session":
            store.switchSession(command.id);
            return;
          case "delete-session":
            store.deleteSession(command.id);
            return;
          case "disable-plan":
            usePlanStore.getState().disable();
            return;
          case "plan-remove":
            usePlanStore.getState().removeOne(command.id);
            return;
          case "plan-clear":
            usePlanStore.getState().clear();
            return;
          case "plan-apply":
            void usePlanStore.getState().applyAll().then((results) => {
              const failed = results.filter((result) => !result.ok);
              if (failed.length > 0) {
                console.error("plan apply failures:", failed);
              }
            });
            return;
        }
      },
    );
    return () => {
      disposed = true;
      void unlisten.then((fn) => fn());
    };
  }, [chat, addToolApprovalResponse, clearError]);

  // Expose the approval responder so the diff tab can resolve approvals.
  // We keep it in a ref-stable closure so identity is stable per render.
  useEffect(() => {
    setApprovalResponder((id, approved) =>
      addToolApprovalResponse({ id, approved }),
    );
    return () => setApprovalResponder(null);
  }, [setApprovalResponder, addToolApprovalResponse]);

  useEffect(() => {
    persistMessages(sessionId, messages);
  }, [sessionId, messages, persistMessages]);

  // Flush the debounced write whenever the chat goes idle (or errors),
  // and on unmount, so a closed app or session-switch never loses the tail.
  useEffect(() => {
    if (status !== "submitted" && status !== "streaming") {
      flushPersist(sessionId);
    }
  }, [sessionId, status]);
  useEffect(() => {
    return () => flushPersist(sessionId);
  }, [sessionId]);

  const approvalsPending = useMemo(() => {
    let n = 0;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const p of m.parts) {
        if ((p as { state?: string }).state === "approval-requested") n++;
      }
    }
    return n;
  }, [messages]);

  useEffect(() => {
    let runStatus: AgentRunStatus;
    if (approvalsPending > 0) runStatus = "awaiting-approval";
    else if (status === "submitted") runStatus = "thinking";
    else if (status === "streaming") runStatus = "streaming";
    else if (status === "error") runStatus = "error";
    else runStatus = "idle";
    patch({
      status: runStatus,
      approvalsPending,
      ...(runStatus === "idle" || runStatus === "error"
        ? { step: null }
        : {}),
      ...(runStatus === "idle" ? { error: null } : {}),
    });
  }, [status, approvalsPending, patch]);

  useEffect(() => {
    if (approvalsPending > 0 && !useChatStore.getState().aiWindow.open) {
      void openAiWindow();
    }
  }, [approvalsPending]);

  // ---- AI diff tab management ----------------------------------------------
  // We track which approvalIds have already opened a tab so re-renders don't
  // open duplicates. Reset when the session changes.
  const openedRef = useRef<Set<string>>(new Set());
  const fileMutationFingerprintRef = useRef<string>("");
  useEffect(() => {
    openedRef.current = new Set();
    fileMutationFingerprintRef.current = "";
  }, [sessionId]);

  // Cheap fingerprint of file-mutation tool parts only. The diff-tab effect
  // is the most expensive thing on the streaming path, so we skip it when
  // only text/reasoning tokens have arrived (the common case).
  const fileMutationFingerprint = useMemo(() => {
    let fp = "";
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const p of m.parts as AnyPart[]) {
        const t = (p as { type?: string }).type;
        if (
          t === "tool-write_file" ||
          t === "tool-edit" ||
          t === "tool-multi_edit"
        ) {
          const state = (p as { state?: string }).state ?? "";
          const id =
            (p as { approval?: { id?: string } }).approval?.id ?? "";
          fp += `${id}:${state}|`;
        }
      }
    }
    return fp;
  }, [messages]);

  useEffect(() => {
    type Pending = {
      approvalId: string;
      path: string;
      /**
       * Either a literal proposed content (write_file), or a function that
       * derives proposed content from the on-disk original (edit/multi_edit).
       */
      derive:
        | { kind: "literal"; content: string }
        | { kind: "edits"; edits: EditOp[] };
    };
    if (fileMutationFingerprint === fileMutationFingerprintRef.current) {
      return;
    }
    fileMutationFingerprintRef.current = fileMutationFingerprint;

    const pending: Pending[] = [];
    const toClose = new Set<string>();

    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts as AnyPart[]) {
        const info = extractFileMutation(part);
        if (!info) continue;
        const { state, approvalId, path, derive } = info;
        if (!approvalId) continue;
        if (state === "approval-requested") {
          if (!openedRef.current.has(approvalId)) {
            pending.push({ approvalId, path, derive });
          }
        } else if (
          state === "approval-responded" ||
          state === "output-available" ||
          state === "output-error"
        ) {
          if (openedRef.current.has(approvalId)) toClose.add(approvalId);
        }
      }
    }

    for (const id of toClose) {
      openedRef.current.delete(id);
      closeAiDiffTab(id);
    }

    if (pending.length === 0) return;

    let cancelled = false;
    void (async () => {
      const cwd = useChatStore.getState().live.getCwd();
      for (const p of pending) {
        if (cancelled) return;
        // Mark as opened up-front so a re-render mid-await doesn't double-open.
        openedRef.current.add(p.approvalId);
        let abs: string;
        try {
          abs = resolvePath(p.path, cwd);
        } catch {
          abs = p.path;
        }
        const original = await readOriginal(abs);
        if (cancelled) return;
        let proposed = "";
        if (p.derive.kind === "literal") {
          proposed = p.derive.content;
        } else {
          const r = applyEditsLocally(original.content, p.derive.edits);
          if (!r.ok) {
            // Edit precondition failed (string not found / not unique).
            // Skip opening the tab; the approval modal will surface the error.
            continue;
          }
          proposed = r.content;
        }
        openAiDiffTab({
          path: abs,
          originalContent: original.content,
          proposedContent: proposed,
          approvalId: p.approvalId,
          isNewFile: original.isNewFile,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, fileMutationFingerprint, openAiDiffTab, closeAiDiffTab]);

  return null;
}

type EditOp = { old_string: string; new_string: string; replace_all?: boolean };

type FileMutation =
  | {
      state: string;
      approvalId: string | null;
      path: string;
      derive: { kind: "literal"; content: string };
    }
  | {
      state: string;
      approvalId: string | null;
      path: string;
      derive: { kind: "edits"; edits: EditOp[] };
    };

function extractFileMutation(part: AnyPart): FileMutation | null {
  const type = (part as { type?: string }).type;
  const p = part as ToolPartLike;
  const state = (p as { state?: string }).state ?? "";
  const approvalId = p.approval?.id ?? null;

  if (type === "tool-write_file") {
    const input = (p.input ?? {}) as WriteFileInput;
    const path = typeof input.path === "string" ? input.path : "";
    const content = typeof input.content === "string" ? input.content : "";
    if (!path) return null;
    return { state, approvalId, path, derive: { kind: "literal", content } };
  }
  if (type === "tool-edit") {
    const input = (p.input ?? {}) as {
      path?: unknown;
      old_string?: unknown;
      new_string?: unknown;
      replace_all?: unknown;
    };
    const path = typeof input.path === "string" ? input.path : "";
    const oldStr = typeof input.old_string === "string" ? input.old_string : "";
    const newStr = typeof input.new_string === "string" ? input.new_string : "";
    if (!path) return null;
    return {
      state,
      approvalId,
      path,
      derive: {
        kind: "edits",
        edits: [
          {
            old_string: oldStr,
            new_string: newStr,
            replace_all: Boolean(input.replace_all),
          },
        ],
      },
    };
  }
  if (type === "tool-multi_edit") {
    const input = (p.input ?? {}) as { path?: unknown; edits?: unknown };
    const path = typeof input.path === "string" ? input.path : "";
    if (!path || !Array.isArray(input.edits)) return null;
    const edits: EditOp[] = (input.edits as Record<string, unknown>[])
      .map((e) => ({
        old_string: typeof e.old_string === "string" ? e.old_string : "",
        new_string: typeof e.new_string === "string" ? e.new_string : "",
        replace_all: Boolean(e.replace_all),
      }))
      .filter((e) => e.old_string.length > 0);
    if (edits.length === 0) return null;
    return { state, approvalId, path, derive: { kind: "edits", edits } };
  }
  return null;
}

function applyEditsLocally(
  original: string,
  edits: EditOp[],
): { ok: true; content: string } | { ok: false } {
  let content = original;
  for (const e of edits) {
    if (e.old_string === e.new_string || e.old_string.length === 0)
      return { ok: false };
    if (e.replace_all) {
      if (!content.includes(e.old_string)) return { ok: false };
      content = content.split(e.old_string).join(e.new_string);
    } else {
      const first = content.indexOf(e.old_string);
      if (first === -1) return { ok: false };
      const second = content.indexOf(e.old_string, first + 1);
      if (second !== -1) return { ok: false };
      content =
        content.slice(0, first) +
        e.new_string +
        content.slice(first + e.old_string.length);
    }
  }
  return { ok: true, content };
}

async function readOriginal(
  abs: string,
): Promise<{ content: string; isNewFile: boolean }> {
  // The fs guard rejects sensitive paths even on read; mirror that here so
  // the user sees an empty "before" rather than an error tab.
  const safety = checkReadable(abs);
  if (!safety.ok) return { content: "", isNewFile: false };
  try {
    const r = await native.readFile(abs);
    if (r.kind === "text") return { content: r.content, isNewFile: false };
    // Binary or oversized — we can't render the original sensibly. Show the
    // proposed content as a "new" view; the user can still cancel.
    return { content: "", isNewFile: false };
  } catch (e) {
    const msg = String(e).toLowerCase();
    const notFound =
      msg.includes("no such file") ||
      msg.includes("not found") ||
      msg.includes("os error 2");
    return { content: "", isNewFile: notFound };
  }
}
