import { afterEach, describe, expect, it } from "vitest";
import { usePlanStore } from "../store/planStore";
import {
  buildComposerMessage,
  type ComposerFile,
  type ComposerSubmission,
} from "./composerMessage";
import { SLASH_COMMANDS } from "./slashCommands";
import type { Snippet } from "./snippets";

const snippet: Snippet = {
  id: "snippet-1",
  handle: "fix",
  name: "Fix",
  description: "Fix a bug",
  content: "Find the root cause.",
};

function submission(
  overrides: Partial<ComposerSubmission> = {},
): ComposerSubmission {
  return {
    text: "Explain this",
    files: [],
    snippets: [],
    commands: [],
    ...overrides,
  };
}

function file(overrides: Partial<ComposerFile>): ComposerFile {
  return {
    id: "file-1",
    name: "example.ts",
    kind: "text",
    mediaType: "text/plain",
    text: "const value = 1;",
    size: 16,
    ...overrides,
  };
}

afterEach(() => {
  usePlanStore.setState({ active: false, queue: [] });
});

describe("buildComposerMessage", () => {
  it("preserves snippets, selections, text files and images", () => {
    const result = buildComposerMessage(
      submission({
        text: "#fix Explain this",
        snippets: [snippet],
        files: [
          file({
            id: "selection-1",
            kind: "selection",
            source: "terminal",
            text: "pnpm failed",
          }),
          file({}),
          file({
            id: "image-1",
            name: "screen.png",
            kind: "image",
            mediaType: "image/png",
            url: "data:image/png;base64,AA==",
            text: undefined,
          }),
        ],
      }),
      [snippet],
    );

    expect(result).toEqual({
      kind: "send",
      parts: [
        {
          type: "text",
          text: [
            '<snippet name="fix">\nFind the root cause.\n</snippet>',
            '<selection source="terminal">\npnpm failed\n</selection>',
            '<file name="example.ts" mediaType="text/plain">\nconst value = 1;\n</file>',
            "Explain this",
          ].join("\n\n"),
        },
        {
          type: "file",
          mediaType: "image/png",
          url: "data:image/png;base64,AA==",
          filename: "screen.png",
        },
      ],
    });
  });

  it("runs slash commands in the main chat engine", () => {
    expect(
      buildComposerMessage(
        submission({ text: "/plan", commands: [] }),
        [],
      ),
    ).toEqual({ kind: "handled" });
    expect(usePlanStore.getState().active).toBe(true);
  });

  it("keeps the command marker when expanding init", () => {
    const result = buildComposerMessage(
      submission({ text: "/init", commands: [] }),
      [],
    );
    if (result.kind !== "send") throw new Error("expected a message");
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]).toMatchObject({
      type: "text",
      text: expect.stringMatching(/^<terax-command name="init" \/>/),
    });
  });

  it("uses picked commands without requiring a typed token", () => {
    expect(
      buildComposerMessage(
        submission({ text: "", commands: [SLASH_COMMANDS.plan] }),
        [],
      ),
    ).toEqual({ kind: "handled" });
    expect(usePlanStore.getState().active).toBe(true);
  });

  it("does not create an empty message", () => {
    expect(buildComposerMessage(submission({ text: "  " }), [])).toEqual({
      kind: "handled",
    });
  });
});
