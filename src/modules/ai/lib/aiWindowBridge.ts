import type { ChatStatus, UIMessage } from "ai";
import type { WorkspaceEnv } from "@/modules/workspace";
import type { AgentMeta } from "../store/chatStore";
import type { QueuedEdit } from "../store/planStore";
import type { Todo } from "./todos";
import type { ComposerSubmission } from "./composerMessage";
import type { SessionMeta } from "./sessions";

export const AI_WINDOW_SNAPSHOT_EVENT = "terax://ai-window-snapshot";
export const AI_WINDOW_COMMAND_EVENT = "terax://ai-window-command";
export const AI_WINDOW_READY_EVENT = "terax://ai-window-ready";
export const AI_WINDOW_CLOSED_EVENT = "terax://ai-window-closed";
export const AI_WINDOW_PREFILL_EVENT = "terax://ai-window-prefill";

export type AiWindowSelection = {
  text: string;
  source: "terminal" | "editor";
};

export type AiWindowPrefill = {
  at: number;
  text?: string;
  selection?: AiWindowSelection;
  attachmentPaths?: string[];
};

export type AiWindowSnapshot = {
  sessionId: string | null;
  sessions: SessionMeta[];
  messages: UIMessage[];
  status: ChatStatus;
  error: string | null;
  selectedModelId: string;
  modelLabel: string;
  agentMeta: AgentMeta;
  planActive: boolean;
  planQueue: QueuedEdit[];
  todos: Todo[];
  workspaceRoot: string | null;
  workspaceEnv: WorkspaceEnv;
};

export type AiWindowCommand =
  | { type: "send"; submission: ComposerSubmission }
  | { type: "stop" }
  | { type: "continue" }
  | { type: "approval"; id: string; approved: boolean }
  | { type: "clear-error" }
  | { type: "select-model"; id: string }
  | { type: "new-session" }
  | { type: "switch-session"; id: string }
  | { type: "delete-session"; id: string }
  | { type: "disable-plan" }
  | { type: "plan-remove"; id: string }
  | { type: "plan-clear" }
  | { type: "plan-apply" };
