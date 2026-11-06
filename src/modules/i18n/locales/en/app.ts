/** 应用外壳：窗口控件、退出确认对话框、关闭守卫 toast、工作区切换警告。 */
export const app = {
  windowControls: {
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
  },
  closeGuard: {
    couldNotCloseWindow: "Could not close the window",
    couldNotSaveChatHistory: "Could not save chat history",
    saveTimeoutDescription:
      "Saving is taking too long. The latest messages may be lost.",
    saveFailedDescription: "The latest messages may be lost.",
    closeAnyway: "Close anyway",
  },
  workspace: {
    unsavedBeforeSwitch:
      "Save or close unsaved editor tabs before switching workspace.",
  },
  tray: {
    open: "Open Terax",
    quit: "Quit Terax",
  },
  closeChoice: {
    title: "Close Terax?",
    description:
      "Quit the app or keep it running in the system tray. Change this any time in Settings.",
    remember: "Remember my choice",
    minimizeToTray: "Minimize to tray",
    quit: "Quit Terax",
  },
  closeDialog: {
    unsavedTitle: "Unsaved Changes",
    unsavedTitled: '"{{title}}" has unsaved changes. Close anyway?',
    unsavedGeneric: "This file has unsaved changes. Close anyway?",
    closeAnyway: "Close Anyway",
    closeTerminalTitle: "Close Terminal?",
    closeTerminalDescription:
      "A process is running. Closing this tab will terminate it.",
    optOutRunningProcesses: "Don't ask again about running processes",
    deletedTitled:
      '"{{title}}" has unsaved changes. The file has been deleted. Close anyway?',
    deletedGeneric:
      "This file has unsaved changes. The file has been deleted. Close anyway?",
    deletedMany_one:
      "{{count}} file has unsaved changes. It has been deleted. Close it anyway?",
    deletedMany_other:
      "{{count}} files have unsaved changes. They have been deleted. Close all anyway?",
    closeManyTitleRight: "Close Tabs to the Right",
    closeManyTitleOthers: "Close Other Tabs",
    checking: "Checking...",
    quitTitle: "Quit Terax?",
    quitAnyway: "Quit Anyway",
    dirtyFragment_one: "{{count}} file has unsaved changes",
    dirtyFragment_other: "{{count}} files have unsaved changes",
    appCloseBoth:
      "A process is still running and {{dirty}}. Quitting will terminate it and discard the changes.",
    appCloseDirty_one:
      "{{count}} file has unsaved changes. Quitting will discard them.",
    appCloseDirty_other:
      "{{count}} files have unsaved changes. Quitting will discard them.",
    appCloseBusy:
      "A process is still running in a terminal. Quitting will terminate it.",
    closeManyDirtyTitled: '"{{title}}" has unsaved changes. Close it anyway?',
    closeManyDirtySingle: "1 tab has unsaved changes. Close it anyway?",
    closeManyDirtyTabs_one: "{{count}} tab has unsaved changes",
    closeManyDirtyTabs_other: "{{count}} tabs have unsaved changes",
    closeManyBusy_one: "a process is running",
    closeManyBusy_other: "{{count}} processes are running",
    closeManyDirtyAndBusy_one:
      "{{dirty}} and {{busy}}. Closing will discard the changes and terminate the process. Close anyway?",
    closeManyDirtyAndBusy_other:
      "{{dirty}} and {{busy}}. Closing will discard the changes and terminate the processes. Close anyway?",
    closeManyDirtyOnly_one:
      "{{count}} tab has unsaved changes. Closing will discard it. Close anyway?",
    closeManyDirtyOnly_other:
      "{{count}} tabs have unsaved changes. Closing will discard them. Close anyway?",
    closeManyBusyRight_one:
      "A process is running in a tab to the right. Closing will terminate it. Close anyway?",
    closeManyBusyRight_other:
      "{{count}} processes are running in tabs to the right. Closing will terminate them. Close anyway?",
    closeManyBusyOthers_one:
      "A process is running in another tab. Closing will terminate it. Close anyway?",
    closeManyBusyOthers_other:
      "{{count}} processes are running in other tabs. Closing will terminate them. Close anyway?",
  },
};
