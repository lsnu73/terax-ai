# AI subsystem

This guide elaborates on `TERAX.md`. If anything here conflicts with `TERAX.md`, `TERAX.md` wins.

## Overview

The AI subsystem is BYOK (bring your own key). Providers and models are declared in a hand-editable JSON file, so vendor support is data rather than code (see `model-configuration.md`). The agent layer is built on Vercel AI SDK v6 chat semantics: `streamText`, tool definitions, and `stopWhen` step limits.

Main entry point: `runAgentStream` in `src/modules/ai/lib/agent.ts`.

## Providers

Providers and models are configuration, not code. The source of truth is
`terax-ai-models.json` in the app data directory (`%APPDATA%/...` on Windows,
`~/Library/Application Support/...` on macOS). Settings → Models edits the same
document; both routes produce identical results.

- Built-in catalog (seeded on first launch, no models): 智谱 GLM, DeepSeek,
  阿里云百炼 Qwen, 月之暗面 Kimi, 火山方舟 豆包, 硅基流动, MiniMax, 阶跃星辰,
  腾讯混元, 百度千帆, plus a generic OpenAI-compatible entry.
- Model rows are always user-created, either by fetching the provider's
  `/models` endpoint or by entering a model id manually.
- Each provider declares `protocol` (transport adapter), `baseURL`, auth mode,
  optional model-list API, shared parameters, and a fallback thinking ladder.
- Each model declares its wire id, label, input/output token limits, its own
  parameters, an optional thinking ladder, and a raw `extra` JSON overlay.

`buildLanguageModel` (`src/modules/ai/lib/agent.ts`) switches only on
`protocol` (`openai-compatible`, `anthropic`, `google`). Parameters are merged
into the outgoing JSON body/headers by a fetch wrapper, so vendor-specific key
names never appear in source code.

### Adding a new provider

Add an entry in Settings → Models (or directly in the JSON file):

```json
{
  "id": "my-vendor",
  "label": "My Vendor",
  "protocol": "openai-compatible",
  "baseURL": "https://api.my-vendor.example/v1",
  "keyringAccount": "my-vendor-api-key",
  "auth": { "mode": "bearer", "required": true },
  "modelsApi": { "path": "/models", "itemsPath": "data", "idPath": "id" },
  "params": [],
  "thinking": null,
  "models": []
}
```

No TypeScript changes are required. If the vendor speaks a protocol other than
OpenAI-compatible, add a transport adapter to `ADAPTERS` in `agent.ts`; that is
the only code extension point.

### Keys

Keys are never persisted outside the OS keychain / Linux secrets file. The
provider's `keyringAccount` names the keychain entry; the JSON file stores only
that name. Normalisation strips secret-looking static headers
(`Authorization`, `x-api-key`, …) found in the file and reports a warning.

### Request parameters and thinking

A parameter is declared with a logical `key`, a location (`body`/`header`), a
wire `path` (dots create nested objects), a type, an optional default/enum, and
an optional `map` from logical level value to wire value. `null` in a map means
"omit the key", which is how thinking is disabled for vendors that reject a
value rather than accepting `"none"`.

Thinking levels are an ordered ladder; index 0 is always off. The model picker
in the terminal renders the selected model's ladder as a slider and stores the
chosen level id per model. See `model-configuration.md` for the schema and the
GLM mapping examples.

## Agent run loop

`runAgentStream` (`agent.ts:391`):

1. Resolves the model via `buildConfiguredLanguageModel`.
2. Builds a stable system prompt from `selectSystemPrompt(modelId)` plus optional persona, custom instructions, and `TERAX.md` project memory.
3. Converts UI messages to model messages, prunes reasoning content if the model does not keep it, and compacts old messages if the context limit is exceeded.
4. Streams via `streamText` with the tool set from `buildTools(ctx)` and `stopWhen: stepCountIs(MAX_AGENT_STEPS)`.
5. Emits step labels, usage deltas, and finish metadata.

The tool set is assembled in `src/modules/ai/tools/tools.ts` from `fs`, `edit`, `search`, `shell`, `subagent`, `terminal`, `todo`, and `managedAgent` builders.

## Sub-agents

`src/modules/ai/agents/registry.ts` defines read-only sub-agents: `explore`, `code-review`, `security`, and `general`. Each has a whitelist of tools and its own system prompt. `run_subagent` cannot recurse (the subagent tool set excludes `run_subagent` itself).

## Sessions

Conversations are organized into sessions. Persistence lives in `terax-ai-sessions.json` via `tauri-plugin-store` (`src/modules/ai/lib/sessions.ts`):

- `sessions` key: list of session metadata
- `activeId` key: active session id
- `messages:<id>` keys: per-session messages, loaded lazily

`AgentRunBridge` mirrors active-session messages to disk on every change and auto-derives titles from the first user message.

## Composer

`AiComposerProvider` (`src/modules/ai/lib/composer.tsx`) is a React context that holds shared input state (text, attachments, voice) for the docked input bar and any other surface. Attachments can be images, text files, or `selection` chips from the terminal or editor. Selections are wrapped as `<selection source="terminal|editor">…</selection>` blocks at submit time and are not pasted into the textarea.

The composer derives `isBusy` from `agentMeta.status` so it can mount safely before sessions hydrate.

## Tools and approval

Tool definitions live under `src/modules/ai/tools/`:

- Read-only tools (`read_file`, `list_directory`, `grep`, `glob`) auto-execute after passing the security deny-list.
- Mutating tools (`write_file`, `edit`, `multi_edit`, `create_directory`, `bash_run`, `bash_background`) set `needsApproval: true`. The AI SDK pauses and the UI renders an approval card.
- `edit` / `multi_edit` enforce a read-before-edit invariant: the model must have read the file earlier in the session.
- In plan mode, mutating tools queue edits for batch review instead of applying them immediately.

Auto-send after approval uses `lastAssistantMessageIsCompleteWithApprovalResponses`.

## Edit diffs

AI-proposed file edits open in an `ai-diff` tab. The user accepts or rejects per hunk. Only after acceptance does the `write_file` or `edit` tool actually run. This keeps the approval UI decoupled from the tool execution.

## Live context bridge

`App.tsx` calls `setLive({ getCwd, getTerminalContext, … })` so tools can read the currently active terminal's cwd and the last 300 lines of buffer. It is lazy by design - tools call for it only when needed rather than pre-snapshotting every turn.

## Invariants

- Keep the Vercel AI SDK v6 chat shape (`streamText`, tools, step limits); the rest of the UI depends on it.
- Keys only via `secrets_*` commands; never disk, settings store, or `localStorage`.
- New providers must justify their bundle cost and unique value.
- Mutating tools require approval; read-only tools still pass the deny-list.

## See also

- [`TERAX.md`](../../TERAX.md) - the architecture source of truth
- [`docs/README.md`](../README.md) - index of contributor guides
- [Two-process model](two-process-model.md) - IPC boundary and command catalog
- [Security model](security-model.md) - the boundaries every tool must respect
