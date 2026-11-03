import type { settingsAgents } from "../../en/settings/agents";

/** 设置窗口 · Agents 区块。 */
export const settingsAgentsZh: typeof settingsAgents = {
  header: {
    title: "AI 行为",
    description:
      "AI 的基础系统提示词、角色与片段。在输入栏切换角色。最终 system = 基础提示词(full/lite,模型级) + TERAX.md 记忆 + 激活的角色 + 用户自定义指令。",
  },
  prompts: {
    label: "系统提示词管理",
    info: "管理会话的基础系统提示词。full / lite 是内置的两套，可查看、修改并随时恢复默认；自定义提示词完全由你编写。生效优先级：模型 > Provider > 这里的全局默认。",
    globalLabel: "默认提示词",
    globalInfo:
      "所有 Provider 缺省使用的基础提示词档位。「模型」页里 Provider 高级设置或模型 Sampling 中单独选择时会覆盖这里的设置。",
    tabFull: "full prompt",
    tabLite: "lite prompt",
    tabCustom: "自定义提示词",
    edited: "已修改",
    save: "保存",
    restore: "恢复默认提示词",
    editInfo:
      "这里编辑的是内置提示词的覆盖版本，保存后立即对新会话生效；“恢复默认提示词”会删除你的修改。",
    customInfo:
      "自定义提示词会整体替换内置基础提示词。为保住工具能力，一段固定的工具协议说明会自动追加在末尾（下方预览）；写得太简略会导致工具行为退化。",
    customPlaceholder: "在这里编写你自己的系统提示词…",
    tailLabel: "自动追加的工具协议（只读预览）：",
    layersPointer:
      "本页的“自定义指令”“角色”与“片段”会追加在基础提示词之后，不受这里的替换影响。",
  },
  commitPrompt: {
    label: "提交信息提示词",
    info: "源代码管理面板「生成提交信息」按钮使用的系统提示词。可查看、修改并随时恢复内置默认；保存后对下一次生成生效。",
    save: "保存",
    restore: "恢复默认提示词",
    pointer:
      "该提示词只负责约束输出一行 Conventional Commit 主题行；生成时会自动附上已暂存文件与 diff。",
  },
  customInstructions: {
    label: "自定义指令",
    placeholder:
      "例如：始终用简洁的要点回复。优先用 pnpm 而不是 npm。我的机器是 M 系列 Mac。",
    save: "保存",
    pointer:
      "此指令会追加在基础系统提示词之后；想查看或替换基础提示词本身，见上方「系统提示词管理」。",
  },
  agents: {
    label: "角色",
    new: "新建角色",
    defaultName: "新角色",
  },
  card: {
    builtIn: "内置",
    active: "使用中",
    use: "使用此角色",
    edit: "编辑",
    delete: "删除",
  },
  snippets: {
    label: "片段",
    hintPre: "可复用的指令，在 AI 输入框中用",
    token: "#关键词",
    hintPost: "插入。",
    new: "新建片段",
    emptyPre: "还没有片段。创建一个，然后在 AI输入框中用",
    emptyPost: "插入。",
  },
  agentDialog: {
    newTitle: "新建角色",
    editTitle: "编辑角色",
    icon: "图标",
    name: "名称",
    namePlaceholder: "例如：测试工程师",
    description: "描述",
    descriptionPlaceholder: "一句话 — 显示在角色选择器中",
    instructions: "指令",
    instructionsPlaceholder:
      "角色设定与规则。会追加到 Terax 的核心系统提示词之后。",
  },
  snippetDialog: {
    newTitle: "新建片段",
    editTitle: "编辑片段",
    handle: "关键词",
    handleErrorRequired: "必填。",
    handleErrorInvalid: "仅限小写字母、数字和连字符。",
    handleErrorInUse: "已被占用。",
    name: "名称",
    namePlaceholder: "例如：合并前审查清单",
    description: "描述",
    descriptionPlaceholder: "一句话简介，用于在列表中展示",
    content: "内容",
    contentPlaceholder:
      "在这里编写你要复用的提示词，后续输入 #关键词 快速插入该片段",
  },
  common: {
    cancel: "取消",
    save: "保存",
  },
};
