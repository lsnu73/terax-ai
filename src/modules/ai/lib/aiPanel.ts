import { openSettings } from "@/modules/settings/openSettings";
import { listModels, listProviders, providerNeedsKey } from "../config";
import { useChatStore } from "../store/chatStore";
import { useAiPanelStore } from "../store/aiPanelStore";
import type { AiPanelPrefill } from "./aiPanelBridge";

export function hasUsableAiProvider(): boolean {
  const { apiKeys } = useChatStore.getState();
  return (
    listProviders().some(
      (provider) =>
        provider.models.length > 0 &&
        (!providerNeedsKey(provider) || Boolean(apiKeys[provider.id])),
    ) && listModels().length > 0
  );
}

export function openAiPanel(): void {
  useAiPanelStore.getState().openPanel();
}

export function closeAiPanel(): void {
  useAiPanelStore.getState().closePanel();
}

export function toggleAiPanel(): void {
  useAiPanelStore.getState().togglePanel();
}

export function prefillAiPanel(
  payload: Omit<AiPanelPrefill, "at">,
): void {
  if (!hasUsableAiProvider()) {
    openSettings("models");
    return;
  }
  useAiPanelStore.getState().prefillPanel(payload);
}
