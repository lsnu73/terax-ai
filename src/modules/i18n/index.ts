import i18next from "i18next";
import { initReactI18next } from "react-i18next";
// 不能静态 import preferences：store → agents/launcher → i18n → preferences → store
// 会形成循环，preferences 在 store 初始化前读 DEFAULT_PREFERENCES 触发 TDZ。
import type { LanguagePref } from "@/modules/settings/store";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

/** 应用实际支持的语言。preference 里的 "system" 会解析成这两者之一。 */
export type AppLanguage = "en" | "zh";

/** "system" → 依据 navigator.language：zh-* 用中文，其余一律英文。 */
export function resolveLanguage(pref: LanguagePref): AppLanguage {
  if (pref === "en" || pref === "zh") return pref;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

/**
 * 初始化 i18next 并订阅语言偏好。
 * 两个窗口（主窗口 / 设置窗口）各自的入口都要 await 一次；
 * 偏好 hydration 完成后 subscribe 会收到最新 language 并切换语言。
 */
export async function initI18n(): Promise<void> {
  // 动态引入以断开循环依赖；initI18n 本身是 async，代价为零。
  const { usePreferencesStore } = await import("@/modules/settings/preferences");
  const apply = (pref: LanguagePref) => {
    const lang = resolveLanguage(pref);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    if (i18next.language !== lang) void i18next.changeLanguage(lang);
  };

  await i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: resolveLanguage(usePreferencesStore.getState().language),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });
  document.documentElement.lang =
    i18next.language === "zh" ? "zh-CN" : "en";

  let current = usePreferencesStore.getState().language;
  usePreferencesStore.subscribe((state) => {
    if (state.language === current) return;
    current = state.language;
    apply(state.language);
  });
}

/** React 组件外的文案翻译（配置表、toast、通知等）。 */
export function t(
  key: string,
  options?: Record<string, unknown>,
): string {
  return i18next.t(key, options);
}

/** 当前界面语言对应的 BCP-47 locale，供 Intl.DateTimeFormat / NumberFormat 使用。 */
export function currentLocale(): string {
  return i18next.language === "zh" ? "zh-CN" : "en-US";
}

export { i18next };
