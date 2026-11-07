import type { updater } from "../en/updater";

/** 更新相关文案（启动检查消息与 设置 → 关于 跳转）。 */
export const updaterZh: typeof updater = {
  availableNotification: "Terax v{{version}} 已发布",
  availableNotificationBody:
    "前往 设置 → 关于 完成更新。不会自动弹出更新窗口。",
  openAbout: "前往关于",
};
