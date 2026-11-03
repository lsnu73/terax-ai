import { t } from "@/modules/i18n";

const LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini",
  pi: "Pi",
  opencode: "OpenCode",
  grok: "Grok",
  terax: "Terax",
};

export function displayAgent(agent: string): string {
  if (!agent) return t("agents.defaultName");
  return (
    LABELS[agent.toLowerCase()] ??
    agent.charAt(0).toUpperCase() + agent.slice(1)
  );
}
