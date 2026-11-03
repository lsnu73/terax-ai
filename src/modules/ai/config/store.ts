import { create } from "zustand";
import { normalizeAiConfig } from "./normalize";
import {
  getAiConfig,
  setAiConfig as setRegistryConfig,
} from "./registry";
import { onAiConfigChange, readAiConfig, writeAiConfig } from "./persist";
import type { AiConfig } from "./types";

type State = {
  config: AiConfig;
  warnings: string[];
  hydrated: boolean;
  init: () => Promise<void>;
  reload: () => Promise<void>;
  replace: (next: AiConfig) => Promise<void>;
  setWarnings: (warnings: string[]) => void;
};

let initPromise: Promise<void> | null = null;

function apply(next: AiConfig): void {
  setRegistryConfig(next);
  useAiConfigStore.setState({ config: next });
}

export const useAiConfigStore = create<State>((set) => ({
  config: getAiConfig(),
  warnings: [],
  hydrated: false,

  init: () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const loaded = await readAiConfig();
      apply(loaded.config);
      set({
        hydrated: true,
        warnings: loaded.warnings,
      });
      void onAiConfigChange(() => {
        void readAiConfig().then((next) => {
          apply(next.config);
          set({ warnings: next.warnings });
        });
      });
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
    return initPromise;
  },

  reload: async () => {
    const loaded = await readAiConfig();
    apply(loaded.config);
    set({ hydrated: true, warnings: loaded.warnings });
  },

  replace: async (next) => {
    const normalized = normalizeAiConfig(next);
    await writeAiConfig(normalized.config);
    apply(normalized.config);
    set({ warnings: normalized.warnings, hydrated: true });
  },

  setWarnings: (warnings) => set({ warnings }),
}));

/** 供请求链路使用的非 React 访问入口。 */
export function getAiConfigSnapshot(): AiConfig {
  return getAiConfig();
}
