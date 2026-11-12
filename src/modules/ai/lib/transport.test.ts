import type { UIMessage } from "@ai-sdk/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../tools/tools";

const runAgentStreamMock = vi.hoisted(() =>
  vi.fn(async (_options: Record<string, unknown>) => ({
    toUIMessageStream: vi.fn(() => ({})),
  })),
);

const nativeMock = vi.hoisted(() => ({
  readFile: vi.fn(),
  shellDescribe: vi.fn(async () => ({
    shell: "pwsh",
    command_dialect: "powershell",
  })),
}));

const workspaceMock = vi.hoisted(() => ({
  env: { kind: "local" } as { kind: "local" } | { kind: "wsl"; distro: string },
}));

vi.mock("./agent", () => ({ runAgentStream: runAgentStreamMock }));
vi.mock("./native", () => ({ native: nativeMock }));
vi.mock("@/modules/workspace", () => ({
  currentWorkspaceEnv: () => workspaceMock.env,
}));

import { createContextAwareTransport } from "./transport";
import type { ShellDescription } from "./native";

const POWERSHELL: ShellDescription = {
  shell: "pwsh",
  command_dialect: "powershell",
};

function userMessages(): UIMessage[] {
  return [
    {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Inspect PATH" }],
    },
  ];
}

function makeTransport(live: {
  cwd: string | null;
  terminalPrivate: boolean;
  workspaceRoot: string | null;
  activeFile: string | null;
}) {
  return createContextAwareTransport({
    getKeys: () => ({}),
    toolContext: {} as ToolContext,
    getModelId: () => "model",
    getEffortLevelId: () => null,
    getCustomInstructions: () => "",
    getAgentPersona: () => null,
    getLive: () => live,
  });
}

function sentMessages(): UIMessage[] {
  const options = runAgentStreamMock.mock.calls[0][0] as {
    uiMessages: UIMessage[];
  };
  return options.uiMessages;
}

beforeEach(() => {
  vi.clearAllMocks();
  workspaceMock.env = { kind: "local" };
  nativeMock.shellDescribe.mockResolvedValue(POWERSHELL);
});

describe("shell environment injection", () => {
  it("injects PowerShell metadata even without an active terminal", async () => {
    const transport = makeTransport({
      cwd: null,
      terminalPrivate: false,
      workspaceRoot: null,
      activeFile: null,
    });
    await transport.sendMessages({ messages: userMessages() });
    expect(nativeMock.shellDescribe).toHaveBeenCalledWith({ kind: "local" });
    const text = sentMessages()[0].parts[0];
    expect(text).toMatchObject({
      type: "text",
      text: expect.stringContaining("shell: pwsh"),
    });
    expect(text).toMatchObject({
      type: "text",
      text: expect.stringContaining("command_dialect: powershell"),
    });
    expect(text).toMatchObject({
      type: "text",
      text: expect.stringContaining("Inspect PATH"),
    });
  });

  it("uses the current WSL workspace and preserves live paths", async () => {
    const workspace = { kind: "wsl", distro: "Ubuntu" } as const;
    workspaceMock.env = workspace;
    nativeMock.shellDescribe.mockResolvedValue({
      shell: "sh",
      command_dialect: "posix",
    });
    const transport = makeTransport({
      cwd: "/home/user/project",
      terminalPrivate: false,
      workspaceRoot: null,
      activeFile: null,
    });
    await transport.sendMessages({ messages: userMessages() });
    expect(nativeMock.shellDescribe).toHaveBeenCalledWith(workspace);
    const part = sentMessages()[0].parts[0];
    const text = part.type === "text" ? part.text : "";
    expect(text).toContain("shell: sh");
    expect(text).toContain("command_dialect: posix");
    expect(text).toContain("active_terminal_cwd: /home/user/project");
  });
});
