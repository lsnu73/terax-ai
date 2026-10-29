/** 设置窗口 · Agents 区块。 */
export const settingsAgents = {
  header: {
    title: "AI Behavior",
    description:
      "Base system prompt, roles and snippets the AI uses. Switch roles from the input bar.",
  },
  prompts: {
    label: "System prompt management",
    info: "Manage the base system prompt for sessions. full / lite are the two built-in prompts; view, edit and restore them to default anytime. A custom prompt is written entirely by you. Precedence: model > provider > the global default here.",
    globalLabel: "Default prompt",
    globalInfo:
      "Base prompt kind used by all providers unless overridden. Picking a kind in a provider's advanced settings or a model's Sampling on the Models page overrides this.",
    tabFull: "full prompt",
    tabLite: "lite prompt",
    tabCustom: "Custom prompt",
    edited: "edited",
    save: "Save",
    restore: "Restore default prompt",
    editInfo:
      'You are editing an override of the built-in prompt; it takes effect for new sessions right after saving. "Restore default prompt" discards your changes.',
    customInfo:
      "A custom prompt replaces the built-in base prompt entirely. To keep tool use working, a fixed tool-protocol section is always appended at the end (preview below); an overly brief prompt will degrade tool behavior.",
    customPlaceholder: "Write your own system prompt here…",
    tailLabel: "Tool protocol appended automatically (read-only preview):",
    layersPointer:
      'The "Custom instructions", "Roles" and "Snippets" on this page are appended after the base prompt and are not affected by what you replace here.',
  },
  customInstructions: {
    label: "Custom instructions",
    placeholder:
      "e.g. Always reply in concise bullet points. Prefer pnpm over npm. My machine is an M-series Mac.",
    save: "Save",
    pointer:
      'These instructions are appended after the base system prompt. To view or replace the base prompt itself, see "System prompt management" above.',
  },
  agents: {
    label: "Roles",
    new: "New role",
    defaultName: "New role",
  },
  card: {
    builtIn: "Built-in",
    active: "Active",
    use: "Use role",
    edit: "Edit",
    delete: "Delete",
  },
  snippets: {
    label: "Snippets",
    hintPre: "Reusable instructions you can drop into any prompt with",
    hintPost: ".",
    new: "New snippet",
    emptyPre: "No snippets yet. Create one and insert it with",
    emptyPost: "in the AI input.",
  },
  agentDialog: {
    newTitle: "New role",
    editTitle: "Edit role",
    icon: "Icon",
    name: "Name",
    namePlaceholder: "e.g. Test Engineer",
    description: "Description",
    descriptionPlaceholder: "One line — shown in the role picker",
    instructions: "Instructions",
    instructionsPlaceholder:
      "Persona & rules. Appended to Terax's core system prompt.",
  },
  snippetDialog: {
    newTitle: "New snippet",
    editTitle: "Edit snippet",
    handle: "Handle",
    handleErrorRequired: "Required.",
    handleErrorInvalid: "Lowercase letters, digits, and dashes only.",
    handleErrorInUse: "Already in use.",
    name: "Name",
    namePlaceholder: "e.g. Pre-merge review checklist",
    description: "Description",
    descriptionPlaceholder: "One line — shown in the # picker",
    content: "Content",
    contentPlaceholder:
      "Inserted into the prompt as a <snippet> block when you use #handle.",
  },
  common: {
    cancel: "Cancel",
    save: "Save",
  },
};
