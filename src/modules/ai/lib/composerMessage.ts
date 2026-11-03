import type { Snippet } from "./snippets";
import { expandSnippetTokens } from "./snippets";
import { tryRunSlashCommand, type SlashCommandMeta } from "./slashCommands";

export type ComposerFile = {
  id: string;
  name: string;
  kind: "image" | "text" | "selection";
  mediaType: string;
  url?: string;
  text?: string;
  size: number;
  source?: "terminal" | "editor";
};

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; url: string; filename?: string };

export type ComposerSubmission = {
  text: string;
  files: ComposerFile[];
  snippets: Snippet[];
  commands: SlashCommandMeta[];
};

export type ComposerMessage =
  | { kind: "handled" }
  | { kind: "send"; parts: MessagePart[] };

export function buildComposerMessage(
  submission: ComposerSubmission,
  snippets: Snippet[],
): ComposerMessage {
  const trimmed = submission.text.trim();
  let effectiveText = trimmed;
  let commandMarker: string | null = null;
  let commandSource = trimmed;
  if (
    submission.commands.length > 0 &&
    !trimmed.startsWith("/") &&
    !trimmed.startsWith("#")
  ) {
    commandSource = `#${submission.commands[0].name} ${trimmed}`.trim();
  }
  if (commandSource.startsWith("/") || commandSource.startsWith("#")) {
    const outcome = tryRunSlashCommand(commandSource);
    if (outcome.kind === "handled") return { kind: "handled" };
    if (outcome.kind === "send-prompt") {
      effectiveText = outcome.prompt;
      if (outcome.commandName) {
        commandMarker = `<terax-command name="${outcome.commandName}" />`;
      }
    }
  }

  const fileBlocks = submission.files
    .filter((file) => file.kind === "text")
    .map(
      (file) =>
        `<file name="${file.name}" mediaType="${file.mediaType}">\n${file.text ?? ""}\n</file>`,
    );
  const selectionBlocks = submission.files
    .filter((file) => file.kind === "selection")
    .map(
      (file) =>
        `<selection source="${file.source ?? "terminal"}">\n${file.text ?? ""}\n</selection>`,
    );
  const { body: bodyAfterTokens, blocks: snippetBlocks } = expandSnippetTokens(
    effectiveText,
    snippets,
  );
  const seenHandles = new Set<string>();
  const allSnippetBlocks: string[] = [];
  for (const snippet of submission.snippets) {
    if (seenHandles.has(snippet.handle)) continue;
    seenHandles.add(snippet.handle);
    allSnippetBlocks.push(
      `<snippet name="${snippet.handle}">\n${snippet.content}\n</snippet>`,
    );
  }
  for (const block of snippetBlocks) {
    const match = block.match(/^<snippet name="([^"]+)"/);
    if (match && seenHandles.has(match[1])) continue;
    if (match) seenHandles.add(match[1]);
    allSnippetBlocks.push(block);
  }
  const composed = [
    commandMarker ?? "",
    allSnippetBlocks.join("\n\n"),
    selectionBlocks.join("\n\n"),
    fileBlocks.join("\n\n"),
    bodyAfterTokens,
  ]
    .filter(Boolean)
    .join("\n\n");
  const parts: MessagePart[] = [];
  if (composed) parts.push({ type: "text", text: composed });
  for (const file of submission.files) {
    if (file.kind === "image" && file.url) {
      parts.push({
        type: "file",
        mediaType: file.mediaType,
        url: file.url,
        filename: file.name,
      });
    }
  }
  return parts.length > 0 ? { kind: "send", parts } : { kind: "handled" };
}
