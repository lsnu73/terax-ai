import type { app } from "../en/app";

/** 应用外壳：窗口控件、退出确认对话框、关闭守卫 toast、工作区切换警告。 */
export const appZh: typeof app = {
  windowControls: {
    minimize: "最小化",
    maximize: "最大化",
    restore: "还原",
  },
  closeGuard: {
    couldNotCloseWindow: "无法关闭窗口",
    couldNotSaveChatHistory: "无法保存聊天记录",
    saveTimeoutDescription: "保存耗时过长，最新消息可能会丢失。",
    saveFailedDescription: "最新消息可能会丢失。",
    closeAnyway: "仍然关闭",
  },
  workspace: {
    unsavedBeforeSwitch: "请先保存或关闭未保存的编辑器标签页，再切换工作区。",
  },
  workspaceInput: {
    modeShell: "终端",
    modeAi: "AI",
    branchTooltip: "分支：{{branch}}",
    typeInTerminal: "直接在终端中输入",
  },
  closeDialog: {
    unsavedTitle: "未保存的更改",
    unsavedTitled: "“{{title}}”有未保存的更改。仍要关闭吗？",
    unsavedGeneric: "此文件有未保存的更改。仍要关闭吗？",
    closeAnyway: "仍然关闭",
    closeTerminalTitle: "关闭终端？",
    closeTerminalDescription: "有进程正在运行。关闭此标签页将终止该进程。",
    optOutRunningProcesses: "不再询问运行中的进程",
    deletedTitled: "“{{title}}”有未保存的更改。文件已被删除。仍要关闭吗？",
    deletedGeneric: "此文件有未保存的更改。文件已被删除。仍要关闭吗？",
    deletedMany_one: "{{count}} 个文件有未保存的更改。它已被删除。仍要关闭吗？",
    deletedMany_other:
      "{{count}} 个文件有未保存的更改。它们已被删除。仍要全部关闭吗？",
    closeManyTitleRight: "关闭右侧标签页",
    closeManyTitleOthers: "关闭其他标签页",
    checking: "检查中…",
    quitTitle: "退出 Terax？",
    quitAnyway: "仍然退出",
    dirtyFragment_one: "{{count}} 个文件有未保存的更改",
    dirtyFragment_other: "{{count}} 个文件有未保存的更改",
    appCloseBoth: "有进程仍在运行，且{{dirty}}。退出将终止进程并丢弃这些更改。",
    appCloseDirty_one: "{{count}} 个文件有未保存的更改。退出将丢弃这些更改。",
    appCloseDirty_other: "{{count}} 个文件有未保存的更改。退出将丢弃这些更改。",
    appCloseBusy: "终端中有进程仍在运行。退出将终止该进程。",
    closeManyDirtyTitled: "“{{title}}”有未保存的更改。仍要关闭吗？",
    closeManyDirtySingle: "1 个标签页有未保存的更改。仍要关闭吗？",
    closeManyDirtyTabs_one: "{{count}} 个标签页有未保存的更改",
    closeManyDirtyTabs_other: "{{count}} 个标签页有未保存的更改",
    closeManyBusy_one: "有一个进程正在运行",
    closeManyBusy_other: "有 {{count}} 个进程正在运行",
    closeManyDirtyAndBusy_one:
      "{{dirty}}，且{{busy}}。关闭将丢弃更改并终止进程。仍要关闭吗？",
    closeManyDirtyAndBusy_other:
      "{{dirty}}，且{{busy}}。关闭将丢弃更改并终止进程。仍要关闭吗？",
    closeManyDirtyOnly_one:
      "{{count}} 个标签页有未保存的更改。关闭将丢弃这些更改。仍要关闭吗？",
    closeManyDirtyOnly_other:
      "{{count}} 个标签页有未保存的更改。关闭将丢弃这些更改。仍要关闭吗？",
    closeManyBusyRight_one:
      "{{count}} 个进程正在右侧的标签页中运行。关闭将终止它们。仍要关闭吗？",
    closeManyBusyRight_other:
      "{{count}} 个进程正在右侧的标签页中运行。关闭将终止它们。仍要关闭吗？",
    closeManyBusyOthers_one:
      "{{count}} 个进程正在其他标签页中运行。关闭将终止它们。仍要关闭吗？",
    closeManyBusyOthers_other:
      "{{count}} 个进程正在其他标签页中运行。关闭将终止它们。仍要关闭吗？",
  },
};
