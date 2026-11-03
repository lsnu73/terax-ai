import { agents } from "./agents";
import { ai } from "./ai";
import { aiElements } from "./aiElements";
import { app } from "./app";
import { commands } from "./commands";
import { common } from "./common";
import { editor } from "./editor";
import { explorer } from "./explorer";
import { gitHistory } from "./gitHistory";
import { header } from "./header";
import { lsp } from "./lsp";
import { preview } from "./preview";
import { settings } from "./settings";
import { shortcuts } from "./shortcuts";
import { sidebar } from "./sidebar";
import { sourceControl } from "./sourceControl";
import { spaces } from "./spaces";
import { statusbar } from "./statusbar";
import { tabbar } from "./tabbar";
import { terminal } from "./terminal";
import { updater } from "./updater";

/**
 * 英文是基准语言：键结构以它为准，zh 通过 `typeof en` 强制保持同构。
 * 新增模块：在 en/ 与 zh/ 下各建一个同名文件，并在这里注册。
 */
export const en = {
  common,
  settings,
  shortcuts,
  commands,
  app,
  tabbar,
  header,
  statusbar,
  sidebar,
  spaces,
  updater,
  terminal,
  explorer,
  editor,
  gitHistory,
  preview,
  lsp,
  agents,
  sourceControl,
  ai,
  aiElements,
};
