import { settingsAbout } from "./settings/about";
import { settingsAgents } from "./settings/agents";
import { settingsEditor } from "./settings/editor";
import { settingsGeneral } from "./settings/general";
import { settingsLsp } from "./settings/lsp";
import { settingsModels } from "./settings/models";
import { settingsShortcuts } from "./settings/shortcuts";
import { settingsTabs } from "./settings/tabs";
import { settingsThemes } from "./settings/themes";

/** Settings page (main-window Settings tab) copy. */
export const settings = {
  tabs: settingsTabs,
  general: settingsGeneral,
  editor: settingsEditor,
  themes: settingsThemes,
  models: settingsModels,
  shortcuts: settingsShortcuts,
  agents: settingsAgents,
  about: settingsAbout,
  lsp: settingsLsp,
};
