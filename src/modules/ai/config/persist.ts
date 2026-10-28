import { appDataDir } from "@tauri-apps/api/path";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { LazyStore } from "@tauri-apps/plugin-store";
import { defaultAiConfig } from "./defaults";
import { normalizeAiConfig } from "./normalize";
import type { AiConfig } from "./types";

/**
 * 可手工编辑的模型配置的持久化。
 *
 * 文件是普通 JSON，顶层只有 `version`、`defaults`、`providers` 三个键，
 * 可以用任意编辑器修改，再在设置页重新加载。API Key 绝不写入这里，
 * 它们存放在操作系统钥匙串（见 `src/modules/ai/lib/keyring.ts`）。
 */

export const AI_CONFIG_STORE_PATH = "terax-ai-models.json";

const KEY_VERSION = "version";
const KEY_DEFAULTS = "defaults";
const KEY_PROVIDERS = "providers";

const store = new LazyStore(AI_CONFIG_STORE_PATH, {
  defaults: {},
  autoSave: 200,
});

const AI_CONFIG_CHANGED_EVENT = "terax://ai-models-changed";

export type LoadedAiConfig = {
  config: AiConfig;
  warnings: string[];
  seeded: boolean;
};

function toRaw(entries: Array<[string, unknown]>): Record<string, unknown> {
  const map = new Map(entries);
  return {
    version: map.get(KEY_VERSION),
    defaults: map.get(KEY_DEFAULTS),
    providers: map.get(KEY_PROVIDERS),
  };
}

/**
 * 每次都从磁盘重新读取，确保外部编辑可见。
 *
 * - 文件不存在或为空 → 播种内置目录并写入一次，保证首次启动时所有
 *   Provider 都真正落盘。
 * - 文件无法读取或格式损坏 → 内存中回退到内置目录并给出 warning，
 *   不覆盖用户写下的内容。
 */
export async function readAiConfig(): Promise<LoadedAiConfig> {
  let reloadError: unknown = null;
  await store.reload({ ignoreDefaults: true }).catch((error) => {
    reloadError = error;
  });
  const entries = await store.entries<unknown>().catch(() => []);
  const hasProviders = entries.some(([key]) => key === KEY_PROVIDERS);
  if (!hasProviders) {
    if (reloadError) {
      return {
        config: defaultAiConfig(),
        warnings: [
          `配置文件无法读取（${String(reloadError)}），当前使用内置默认值；保存任意修改会覆盖该文件。`,
        ],
        seeded: false,
      };
    }
    // 文件不存在（或为空）：写入一次内置目录，保证首次启动时
    // Provider、模型和参数都真正落盘。
    const seeded = defaultAiConfig();
    await writeAiConfig(seeded);
    return {
      config: seeded,
      warnings: ["已生成默认配置文件"],
      seeded: true,
    };
  }
  const { config, warnings } = normalizeAiConfig(toRaw(entries));
  if (reloadError) {
    warnings.unshift(`配置文件读取异常：${String(reloadError)}`);
  }
  return { config, warnings, seeded: false };
}

export async function writeAiConfig(config: AiConfig): Promise<void> {
  await store.set(KEY_VERSION, config.version);
  await store.set(KEY_DEFAULTS, config.defaults);
  await store.set(KEY_PROVIDERS, config.providers);
  await store.save();
  await emit(AI_CONFIG_CHANGED_EVENT);
}

export async function getAiConfigFilePath(): Promise<string> {
  try {
    const dir = await appDataDir();
    return `${dir.replace(/[\\/]+$/, "")}/${AI_CONFIG_STORE_PATH}`;
  } catch {
    return AI_CONFIG_STORE_PATH;
  }
}

/** 跨窗口通知（设置窗口 → 主窗口）。 */
export async function onAiConfigChange(
  callback: () => void,
): Promise<UnlistenFn> {
  return listen(AI_CONFIG_CHANGED_EVENT, () => callback());
}
