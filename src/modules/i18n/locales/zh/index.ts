import type { en } from "../en";
import { agentsZh } from "./agents";
import { aiZh } from "./ai";
import { aiElementsZh } from "./aiElements";
import { appZh } from "./app";
import { commandsZh } from "./commands";
import { commonZh } from "./common";
import { editorZh } from "./editor";
import { explorerZh } from "./explorer";
import { gitHistoryZh } from "./gitHistory";
import { headerZh } from "./header";
import { lspZh } from "./lsp";
import { previewZh } from "./preview";
import { settingsZh } from "./settings";
import { shortcutsZh } from "./shortcuts";
import { sidebarZh } from "./sidebar";
import { sourceControlZh } from "./sourceControl";
import { spacesZh } from "./spaces";
import { statusbarZh } from "./statusbar";
import { tabbarZh } from "./tabbar";
import { terminalZh } from "./terminal";
import { updaterZh } from "./updater";

/** 中文字典，键结构必须与 en 完全一致（由 typeof en 强制）。 */
export const zh: typeof en = {
  common: commonZh,
  settings: settingsZh,
  shortcuts: shortcutsZh,
  commands: commandsZh,
  app: appZh,
  tabbar: tabbarZh,
  header: headerZh,
  statusbar: statusbarZh,
  sidebar: sidebarZh,
  spaces: spacesZh,
  updater: updaterZh,
  terminal: terminalZh,
  explorer: explorerZh,
  editor: editorZh,
  gitHistory: gitHistoryZh,
  preview: previewZh,
  lsp: lspZh,
  agents: agentsZh,
  sourceControl: sourceControlZh,
  ai: aiZh,
  aiElements: aiElementsZh,
};
