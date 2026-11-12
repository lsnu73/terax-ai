import type { UIMessage } from "@ai-sdk/react";
import { runAgentStream, type AgentUsageDelta } from "./agent";
import type { ProviderKeys } from "./keyring";
import { formatAiError } from "./errors";
import { native, type ShellDescription } from "./native";
import type { ToolContext } from "../tools/tools";
import { currentWorkspaceEnv } from "@/modules/workspace";

const TERAX_MD_MAX_BYTES = 32 * 1024;
type MemoryCacheEntry = { content: string | null; mtime: number };
const projectMemoryCache = new Map<string, MemoryCacheEntry>();

async function readTeraxMd(
  workspaceRoot: string | null,
): Promise<string | null> {
  if (!workspaceRoot) return null;
  const path = `${workspaceRoot.replace(/\/$/, "")}/TERAX.md`;
  const cached = projectMemoryCache.get(workspaceRoot);
  if (cached && Date.now() - cached.mtime < 30_000) return cached.content;
  try {
    const r = await native.readFile(path);
    if (r.kind !== "text") {
      projectMemoryCache.set(workspaceRoot, {
        content: null,
        mtime: Date.now(),
      });
      return null;
    }
    const content =
      r.content.length > TERAX_MD_MAX_BYTES
        ? r.content.slice(0, TERAX_MD_MAX_BYTES)
        : r.content;
    projectMemoryCache.set(workspaceRoot, { content, mtime: Date.now() });
    return content;
  } catch {
    projectMemoryCache.set(workspaceRoot, { content: null, mtime: Date.now() });
    return null;
  }
}

type LiveSnapshot = {
  cwd: string | null;
  terminalPrivate: boolean;
  workspaceRoot: string | null;
  activeFile: string | null;
};

type Deps = {
  getKeys: () => ProviderKeys;
  toolContext: ToolContext;
  getModelId: () => string;
  getEffortLevelId: () => string | null;
  getCustomInstructions: () => string;
  getAgentPersona: () => { name: string; instructions: string } | null;
  getLive: () => LiveSnapshot;
  onStep?: (step: string | null) => void;
  onUsage?: (delta: AgentUsageDelta) => void;
  onCompact?: (info: { droppedCount: number }) => void;
  onFinishMeta?: (info: { hitStepCap: boolean; finishReason: string }) => void;
  getPlanMode?: () => boolean;
};

type SendOptions = {
  messages: UIMessage[];
  abortSignal?: AbortSignal;
  [k: string]: unknown;
};

/**
 * `useChat` 与 Agent 执行器之间的适配器。它为出站消息补充工作区/项目上下文，
 * 并透传实时的模型选择，包括模型选择器中选定的思考强度档位。
 */
export function createContextAwareTransport(deps: Deps) {
  const run = async (options: SendOptions) => {
    const live = deps.getLive();
    const workspace = currentWorkspaceEnv();
    const [projectMemory, shell] = await Promise.all([
      readTeraxMd(live.workspaceRoot),
      native.shellDescribe(workspace),
    ]);
    const envBlock = formatEnvBlock(live, shell);
    const messagesForRun = envBlock
      ? injectEnvIntoLastUser(options.messages, envBlock)
      : options.messages;
    const result = await runAgentStream({
      keys: deps.getKeys(),
      modelId: deps.getModelId(),
      effortLevelId: deps.getEffortLevelId(),
      customInstructions: deps.getCustomInstructions(),
      agentPersona: deps.getAgentPersona(),
      toolContext: deps.toolContext,
      shell,
      onStep: deps.onStep,
      onUsage: deps.onUsage,
      onCompact: deps.onCompact,
      onFinishMeta: deps.onFinishMeta,
      planMode: deps.getPlanMode?.(),
      projectMemory,
      uiMessages: messagesForRun,
      abortSignal: options.abortSignal,
    });
    return result.toUIMessageStream({
      originalMessages: options.messages,
      onError: formatAiError,
    });
  };

  return {
    sendMessages: run,
    async reconnectToStream(): Promise<null> {
      return null;
    },
  };
}

function injectEnvIntoLastUser(
  messages: UIMessage[],
  envBlock: string,
): UIMessage[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const parts = m.parts as ReadonlyArray<{ type: string; text?: string }>;
    let textIdx = -1;
    for (let j = 0; j < parts.length; j++) {
      if (parts[j].type === "text") {
        textIdx = j;
        break;
      }
    }
    const nextParts =
      textIdx === -1
        ? [{ type: "text", text: envBlock }, ...parts]
        : parts.map((p, idx) =>
            idx === textIdx
              ? { ...p, text: `${envBlock}\n\n${p.text ?? ""}` }
              : p,
          );
    const out = messages.slice();
    out[i] = { ...m, parts: nextParts } as UIMessage;
    return out;
  }
  return messages;
}

function formatEnvBlock(
  live: LiveSnapshot,
  shell: ShellDescription,
): string | null {
  const lines: string[] = [
    `shell: ${shell.shell}`,
    `command_dialect: ${shell.command_dialect}`,
  ];
  if (live.workspaceRoot) lines.push(`workspace_root: ${live.workspaceRoot}`);
  if (live.cwd) lines.push(`active_terminal_cwd: ${live.cwd}`);
  if (live.activeFile) lines.push(`active_file: ${live.activeFile}`);
  if (live.terminalPrivate) lines.push("active_terminal_mode: private");
  if (lines.length === 0) return null;
  return `<env>\n${lines.join("\n")}\n</env>`;
}
