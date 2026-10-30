import { useEffect, useState } from "react";
import { toast } from "sonner";
import { t } from "@/modules/i18n";
import {
  getDefaultModelId,
  listModels,
  listProviders,
  providerNeedsKey,
  useAiConfigStore,
} from "@/modules/ai/config";
import { firePendingReviewForSession } from "@/modules/agents/lib/review";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { onKeysChanged } from "@/modules/settings/store";
import { getAllKeys } from "../lib/keyring";
import { useAgentsStore } from "../store/agentsStore";
import { useChatStore } from "../store/chatStore";
import { useSnippetsStore } from "../store/snippetsStore";

/**
 * AI 子系统的启动接线：hydrate 模型配置、加载并同步 Provider 密钥、
 * hydrate 偏好设置并同步默认模型，最后 hydrate 会话/Agent/代码片段存储。
 * 返回外壳需要的两个派生标志。
 */
export function useAiBootstrap({ mirror = false }: { mirror?: boolean } = {}): {
  hasComposer: boolean;
  keysLoaded: boolean;
} {
  const apiKeys = useChatStore((s) => s.apiKeys);
  const setApiKeys = useChatStore((s) => s.setApiKeys);
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const hydrateSessions = useChatStore((s) => s.hydrateSessions);

  useEffect(() => {
    if (!mirror && activeSessionId) firePendingReviewForSession(activeSessionId);
  }, [activeSessionId, mirror]);

  const configHydrated = useAiConfigStore((s) => s.hydrated);
  const config = useAiConfigStore((s) => s.config);
  const initConfig = useAiConfigStore((s) => s.init);

  const hasComposer =
    listProviders().some(
      (p) => p.models.length > 0 && (!providerNeedsKey(p) || !!apiKeys[p.id]),
    ) && listModels().length > 0;

  const prefsHydrated = usePreferencesStore((s) => s.hydrated);
  const [keysLoaded, setKeysLoaded] = useState(false);

  useEffect(() => {
    void initConfig().catch((error: unknown) => {
      toast.error(t("ai.sessions.configLoadFailed"), {
        id: "ai-config-load",
        description: String(error),
      });
    });
  }, [initConfig]);

  // `config` 是通过 registry 读取的，不经过这个闭包，所以 Biome 看不出
  // 重新加载它的必要性；Provider/钥匙串变化确实需要触发重载。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 registry 快照
  useEffect(() => {
    if (!configHydrated) return;
    let alive = true;
    const reload = () => {
      void getAllKeys().then((keys) => {
        if (!alive) return;
        setApiKeys(keys);
        setKeysLoaded(true);
      });
    };
    reload();
    const unlistenP = onKeysChanged(reload);
    return () => {
      alive = false;
      void unlistenP.then((fn) => fn());
    };
  }, [configHydrated, setApiKeys, config]);

  // 默认模型存放在 JSON 配置中，配置 hydrate 完成后选择器立即同步。
  const initPrefs = usePreferencesStore((s) => s.init);
  useEffect(() => {
    void initPrefs();
  }, [initPrefs]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 registry 快照
  useEffect(() => {
    if (mirror || !configHydrated || !prefsHydrated) return;
    setSelectedModelId(getDefaultModelId());
  }, [mirror, prefsHydrated, configHydrated, config, setSelectedModelId]);

  useEffect(() => {
    if (!mirror) {
      void hydrateSessions().catch((error: unknown) => {
        toast.error(t("ai.sessions.loadFailed"), {
          id: "chat-history-load",
          description: String(error),
        });
      });
    }
    void useAgentsStore.getState().hydrate();
    void useSnippetsStore.getState().hydrate();
  }, [hydrateSessions, mirror]);

  return { hasComposer, keysLoaded };
}
