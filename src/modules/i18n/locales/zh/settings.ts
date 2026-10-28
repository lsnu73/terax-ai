import type { settings } from "../en/settings";
import { settingsAboutZh } from "./settings/about";
import { settingsAgentsZh } from "./settings/agents";
import { settingsEditorZh } from "./settings/editor";
import { settingsGeneralZh } from "./settings/general";
import { settingsLspZh } from "./settings/lsp";
import { settingsModelsZh } from "./settings/models";
import { settingsShortcutsZh } from "./settings/shortcuts";
import { settingsTabsZh } from "./settings/tabs";
import { settingsThemesZh } from "./settings/themes";

/** 设置窗口（settings.html 独立 webview）的全部文案。 */
export const settingsZh: typeof settings = {
  tabs: settingsTabsZh,
  general: settingsGeneralZh,
  editor: settingsEditorZh,
  themes: settingsThemesZh,
  models: settingsModelsZh,
  shortcuts: settingsShortcutsZh,
  agents: settingsAgentsZh,
  about: settingsAboutZh,
  lsp: settingsLspZh,
};
