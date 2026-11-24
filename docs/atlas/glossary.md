# 术语表

> 最后校验：2026-11-24

| 标准术语 | 用户说法（别名） | 代码锚点 | 一句话含义 | 易混淆项 |
|---|---|---|---|---|
| AI 命令执行 | 「AI想执行的命令」「AI运行命令」 | `src/modules/ai/tools/shell.ts:73` 的 `buildShellTools` | AI 通过前台或后台工具在当前工作区执行命令，并按真实 Shell 注入方言约束 | 用户直接输入的交互式 PTY 命令 |
| AI 命令运行到终端 | 「运行按钮」「AI给的命令点运行」「插入到终端」 | `src/components/ai-elements/chat-code.tsx:219` 的 `RunInTerminalButton` | 把 AI 生成的命令文本以会话粘贴编码写入当前活动终端提示符处，不自动执行 | AI 命令执行（`bash_run`，AI 自己跑、不经终端提示符） |
| 终端光标焦点 | 「光标样式」「终端窗口聚焦时显示光标」 | `src/modules/terminal/lib/cursorBlink.ts:1` 的 `shouldCursorBlink` | 综合原生窗口、活动窗格和终端 textarea 真实焦点决定光标显示与闪烁 | Ghostty 原生 DECTCEM 光标可见性 |
| AI Composer 输入框 | 「提示词输入框」 | `src/modules/ai/lib/composer.tsx:87` 的 `focusSignal` effect | AI 面板打开时接收键盘输入的 textarea | 终端隐藏 textarea、模型选择器搜索框 |
| 块头/块尾跳转 | 「跳转到块头部/尾部」「上分隔线/下分隔线」 | `src/modules/terminal/ghostty/GhosttyBlocks.ts:428` 的 `revealBlockHead`/`revealBlockTail` | 块右键菜单把块的上边界滚到终端上边框、块尾分隔线滚到终端下边框 | 命令时间线点击的 `revealBlock`（会选中块） |
| SSH key 密码解锁 | 「ssh key 加密了要填密码」「推送要密码」 | `src/modules/source-control/SshPassphraseDialog.tsx:28` 的 `SshPassphraseDialog` | 推送失败形如 Permission denied (publickey) 时弹密码框，重试经 Rust askpass 助手解锁加密私钥 | HTTPS 凭据失败（不弹此框）；ssh-agent 已解锁的 key |
| 双击选词 | 「双击选词」「双击选中一个词」「双击选中文」 | `src/modules/terminal/ghostty/selection/wordSelection.ts:79` 的 `wordTokenRangeAt`/`pathLadderRangeAt` | 终端里鼠标双击按分词规则选词：连续中文整块、路径/URL/版本号/下划线标识符等粘连单元整体选中，三击起沿引号括号容器递进 | 终端链接打开（Ctrl/Cmd 点击）；编辑器 CodeMirror 双击选词 |
| WSL 挂载前缀（automount root） | 「挂载盘符」「/mnt 前缀」「mnt 那个路径」 | `src/modules/workspace/automount.ts:7` 的 `fetchWslAutomountRoot`；Rust `wsl_automount_root` | WSL 把 Windows 盘符挂载到的目录前缀，默认 `/mnt/`，可由 `/etc/wsl.conf` 的 `[automount] root` 改写 | 发行版根目录 `/`；WSL 登录 HOME |
| 建议命令卡片 | 「建议命令」「AI 建议的命令」 | `src/components/ai-elements/tool.tsx:780` 的 `SuggestCommandCard` | `suggest_command` 工具结果的卡片：默认展开，展示命令与「插入」按钮，单击只把命令粘贴到活动终端提示符处、不执行；原始 input JSON 收在默认折叠的「输入」项里 | AI 命令执行（`bash_run`，AI 自己跑）；shell 代码块的「运行」按钮（`src/components/ai-elements/chat-code.tsx`） |
| 路径压缩 | 「隐藏部分路径」「路径省略」「长路径缩短」 | `src/lib/pathDisplay.ts:48` 的 `compactPath` | 按调用方提供的视觉宽度测量省略中间目录或截断末级，同时保留路径前缀与末级开头 | CSS `text-overflow: ellipsis`；终端命令提示符路径压缩（未实现） |
| 粘贴漏斗 | 「粘贴的命令」「粘贴进去的东西」「粘贴后多出空命令」 | `src/modules/terminal/ghostty/input/GhosttyInputController.ts:208` 的 `paste` | 剪贴板、原生粘贴、文件拖放、AI 注入的统一粘贴入口：先 trim 首尾空白，再经 WSL 路径转换与粘贴编码写入会话 | AI 命令执行（不经终端提示符）；`encodeTerminalSubmission`（提交编码，自带结尾回车） |
