import { usePreferencesStore } from "@/modules/settings/preferences";
import { toast, type ExternalToast } from "sonner";
import { useAgentStore } from "../store/agentStore";
import type { NotificationAction, RuntimeNotificationKind } from "./types";

export type RuntimeToastOptions = Omit<
  ExternalToast,
  "description" | "action" | "cancel" | "onDismiss"
> & {
  description?: string;
  action?: NotificationAction;
  cancel?: NotificationAction;
  onDismiss?: () => void;
};

let runtimeSeq = 0;

function show(
  kind: RuntimeNotificationKind,
  title: string,
  options: RuntimeToastOptions = {},
): string | number {
  const { description, action, cancel, onDismiss, ...toastOptions } = options;
  const id = options.id ?? `runtime:${++runtimeSeq}`;
  const previous = useAgentStore.getState().notifications.find(
    (n) => n.source === "runtime" && n.runtimeId === id,
  );
  const dismissal =
    (previous?.source === "runtime" ? previous.dismissal : undefined) ??
    { dismissed: false };
  const handleDismiss = () => {
    if (dismissal.dismissed) return;
    dismissal.dismissed = true;
    onDismiss?.();
  };

  useAgentStore.getState().pushNotification({
    source: "runtime",
    runtimeId: id,
    kind,
    title,
    body: description,
    action,
    cancel,
    onDismiss: handleDismiss,
    dismissal,
  });

  if (usePreferencesStore.getState().notificationDisplayMode === "toast") {
    toast[kind](title, {
      ...toastOptions,
      id,
      description,
      action,
      cancel,
      onDismiss: () => {
        useAgentStore.getState().dismissNotification(id);
        handleDismiss();
      },
    });
  }
  return id;
}

export const runtimeToast = Object.assign(
  (title: string, options?: RuntimeToastOptions) =>
    show("message", title, options),
  {
    message: (title: string, options?: RuntimeToastOptions) =>
      show("message", title, options),
    success: (title: string, options?: RuntimeToastOptions) =>
      show("success", title, options),
    info: (title: string, options?: RuntimeToastOptions) =>
      show("info", title, options),
    warning: (title: string, options?: RuntimeToastOptions) =>
      show("warning", title, options),
    error: (title: string, options?: RuntimeToastOptions) =>
      show("error", title, options),
    dismiss: (id: string | number) => {
      toast.dismiss(id);
      useAgentStore.getState().dismissNotification(id);
    },
  },
);
