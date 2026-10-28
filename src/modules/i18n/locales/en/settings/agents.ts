/** 设置窗口 · Agents 区块。 */
export const settingsAgents = {
  header: {
    title: "Agents",
    description:
      "Personas and snippets the AI uses. Switch agents from the input bar.",
  },
  customInstructions: {
    label: "Custom instructions",
    placeholder:
      "e.g. Always reply in concise bullet points. Prefer pnpm over npm. My machine is an M-series Mac.",
    save: "Save",
  },
  agents: {
    label: "Agents",
    new: "New agent",
    defaultName: "New agent",
  },
  card: {
    builtIn: "Built-in",
    active: "Active",
    use: "Use agent",
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
    newTitle: "New agent",
    editTitle: "Edit agent",
    icon: "Icon",
    name: "Name",
    namePlaceholder: "e.g. Test Engineer",
    description: "Description",
    descriptionPlaceholder: "One line — shown in the agent picker",
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
