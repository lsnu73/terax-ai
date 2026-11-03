export type AgentStatus = "working" | "waiting";

export type AgentSource = "terminal" | "local";

type AgentSignalKind =
  | "started"
  | "working"
  | "attention"
  | "finished"
  | "exited";

export type AgentSignal = {
  id: number;
  kind: AgentSignalKind;
  agent: string | null;
};

export type AgentSession = {
  leafId: number;
  tabId: number;
  agent: string;
  status: AgentStatus;
  startedAt: number;
  lastActivityAt: number;
  attentionSince: number | null;
};

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

type NotificationBase = {
  id: string;
  title: string;
  body?: string;
  at: number;
  read: boolean;
  action?: NotificationAction;
  cancel?: NotificationAction;
  onDismiss?: () => void;
};

export type AgentEventNotification = NotificationBase & {
  source: AgentSource;
  leafId: number;
  tabId: number;
  agent: string;
  kind: AgentNotificationKind;
};

export type RuntimeNotification = NotificationBase & {
  source: "runtime";
  runtimeId: string | number;
  kind: RuntimeNotificationKind;
  dismissal?: { dismissed: boolean };
};

export type AgentNotification = AgentEventNotification | RuntimeNotification;
export type NewAgentNotification =
  | Omit<AgentEventNotification, "id" | "at" | "read">
  | Omit<RuntimeNotification, "id" | "at" | "read">;

export type AgentNotificationKind = "attention" | "finished" | "error";
export type RuntimeNotificationKind =
  | "message"
  | "success"
  | "info"
  | "warning"
  | "error";
export type NotificationKind = AgentNotificationKind;

export type LocalAgentState = {
  agent: string;
  status: AgentStatus;
} | null;
