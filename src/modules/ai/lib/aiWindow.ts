import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { openSettingsWindow } from "@/modules/settings/openSettingsWindow";
import { listModels, listProviders, providerNeedsKey } from "../config";
import {
  AI_WINDOW_PREFILL_EVENT,
  type AiWindowPrefill,
} from "./aiWindowBridge";
import { useChatStore } from "../store/chatStore";

let pendingPrefill: AiWindowPrefill | null = null;

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

export async function openAiWindow(): Promise<void> {
  useChatStore.getState().openAiWindow();
  try {
    await invoke("open_ai_window");
  } catch (error) {
    useChatStore.getState().closeAiWindow();
    console.error("open_ai_window failed:", error);
  }
}

export async function closeAiWindow(): Promise<void> {
  useChatStore.getState().closeAiWindow();
  try {
    await invoke("close_ai_window");
  } catch (error) {
    useChatStore.getState().openAiWindow();
    console.error("close_ai_window failed:", error);
  }
}

export async function toggleAiWindow(): Promise<void> {
  if (useChatStore.getState().aiWindow.open) await closeAiWindow();
  else await openAiWindow();
}

export function prefillAiWindow(
  payload: Omit<AiWindowPrefill, "at">,
): void {
  if (!hasUsableAiProvider()) {
    void openSettingsWindow("models");
    return;
  }
  const next = { ...payload, at: Date.now() };
  if (useChatStore.getState().aiWindow.open) {
    void emitTo("ai", AI_WINDOW_PREFILL_EVENT, next);
  } else {
    pendingPrefill = next;
  }
  void openAiWindow();
}

export function flushAiWindowPrefill(): void {
  const next = pendingPrefill;
  if (!next) return;
  pendingPrefill = null;
  void emitTo("ai", AI_WINDOW_PREFILL_EVENT, next);
}
