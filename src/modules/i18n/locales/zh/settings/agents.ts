import type { settingsAgents } from "../../en/settings/agents";

/** 设置窗口 · Agents 区块。 */
export const settingsAgentsZh: typeof settingsAgents = {
  header: {
    title: "代理",
    description: "AI 使用的角色设定与片段。在输入栏切换代理。",
  },
  customInstructions: {
    label: "自定义指令",
    placeholder:
      "例如：始终用简洁的要点回复。优先用 pnpm 而不是 npm。我的机器是 M 系列 Mac。",
    save: "保存",
    pointer:
      "此指令会追加在基础系统提示词之后；想查看或替换基础提示词本身，请到「模型 → 系统提示词管理」。",
  },
  agents: {
    label: "代理",
    new: "新建代理",
    defaultName: "新代理",
  },
  card: {
    builtIn: "内置",
    active: "使用中",
    use: "使用此代理",
    edit: "编辑",
    delete: "删除",
  },
  snippets: {
    label: "片段",
    hintPre: "可复用的指令，在任何提示词中通过",
    hintPost: "插入。",
    new: "新建片段",
    emptyPre: "还没有片段。创建一个，然后在 AI 输入框中用",
    emptyPost: "插入。",
  },
  agentDialog: {
    newTitle: "新建代理",
    editTitle: "编辑代理",
    icon: "图标",
    name: "名称",
    namePlaceholder: "例如：测试工程师",
    description: "描述",
    descriptionPlaceholder: "一句话 — 显示在代理选择器中",
    instructions: "指令",
    instructionsPlaceholder:
      "角色设定与规则。会追加到 Terax 的核心系统提示词之后。",
  },
  snippetDialog: {
    newTitle: "新建片段",
    editTitle: "编辑片段",
    handle: "句柄",
    handleErrorRequired: "必填。",
    handleErrorInvalid: "仅限小写字母、数字和连字符。",
    handleErrorInUse: "已被占用。",
    name: "名称",
    namePlaceholder: "例如：合并前审查清单",
    description: "描述",
    descriptionPlaceholder: "一句话 — 显示在 # 选择器中",
    content: "内容",
    contentPlaceholder: "使用 #handle 时，会作为 <snippet> 块插入提示词。",
  },
  common: {
    cancel: "取消",
    save: "保存",
  },
};
