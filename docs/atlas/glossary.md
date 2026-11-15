# 术语表

> 最后校验：2026-11-15

| 标准术语 | 用户说法（别名） | 代码锚点 | 一句话含义 | 易混淆项 |
|---|---|---|---|---|
| AI 命令执行 | 「AI想执行的命令」「AI运行命令」 | `src/modules/ai/tools/shell.ts:73` 的 `buildShellTools` | AI 通过前台或后台工具在当前工作区执行命令，并按真实 Shell 注入方言约束 | 用户直接输入的交互式 PTY 命令 |
| 终端光标焦点 | 「光标样式」「终端窗口聚焦时显示光标」 | `src/modules/terminal/lib/cursorBlink.ts:1` 的 `shouldCursorBlink` | 综合原生窗口、活动窗格和终端 textarea 真实焦点决定光标显示与闪烁 | Ghostty 原生 DECTCEM 光标可见性 |
| AI Composer 输入框 | 「提示词输入框」 | `src/modules/ai/lib/composer.tsx:87` 的 `focusSignal` effect | AI 面板打开时接收键盘输入的 textarea | 终端隐藏 textarea、模型选择器搜索框 |
| 块头/块尾跳转 | 「跳转到块头部/尾部」「上分隔线/下分隔线」 | `src/modules/terminal/ghostty/GhosttyBlocks.ts:428` 的 `revealBlockHead`/`revealBlockTail` | 块右键菜单把块的上边界滚到终端上边框、块尾分隔线滚到终端下边框 | 命令时间线点击的 `revealBlock`（会选中块） |
| SSH key 密码解锁 | 「ssh key 加密了要填密码」「推送要密码」 | `src/modules/source-control/SshPassphraseDialog.tsx:28` 的 `SshPassphraseDialog` | 推送失败形如 Permission denied (publickey) 时弹密码框，重试经 Rust askpass 助手解锁加密私钥 | HTTPS 凭据失败（不弹此框）；ssh-agent 已解锁的 key |
