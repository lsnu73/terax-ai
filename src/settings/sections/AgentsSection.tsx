import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AGENT_ICONS,
  agentDisplay,
} from "@/modules/ai/components/AgentSwitcher";
import {
  type AiConfig,
  builtinSystemPrompt,
  type SystemPromptKind,
  type SystemPromptOverrides,
  TOOL_PROTOCOL_TAIL,
  useAiConfigStore,
} from "@/modules/ai/config";
import {
  type Agent,
  type AgentIconId,
  BUILTIN_AGENTS,
} from "@/modules/ai/lib/agents";
import {
  isValidHandle,
  normalizeHandle,
  type Snippet,
} from "@/modules/ai/lib/snippets";
import { newAgentId, useAgentsStore } from "@/modules/ai/store/agentsStore";
import {
  newSnippetId,
  useSnippetsStore,
} from "@/modules/ai/store/snippetsStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setCustomInstructions } from "@/modules/settings/store";
import {
  Add01Icon,
  ArrowTurnBackwardIcon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "../components/SectionHeader";
import { InfoHint } from "./models/StructuredFields";

const ICON_OPTIONS: AgentIconId[] = [
  "coder",
  "architect",
  "reviewer",
  "security",
  "designer",
  "spark",
];

export function AgentsSection() {
  const { t } = useTranslation();
  const customInstructions = usePreferencesStore((s) => s.customInstructions);
  const customAgents = useAgentsStore((s) => s.customAgents);
  const activeAgentId = useAgentsStore((s) => s.activeId);
  const setActiveAgentId = useAgentsStore((s) => s.setActiveId);
  const upsertAgent = useAgentsStore((s) => s.upsert);
  const removeAgent = useAgentsStore((s) => s.remove);
  const hydrateAgents = useAgentsStore((s) => s.hydrate);

  const snippets = useSnippetsStore((s) => s.snippets);
  const upsertSnippet = useSnippetsStore((s) => s.upsert);
  const removeSnippet = useSnippetsStore((s) => s.remove);
  const hydrateSnippets = useSnippetsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateAgents();
    void hydrateSnippets();
  }, [hydrateAgents, hydrateSnippets]);

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title={t("settings.agents.header.title")}
        description={t("settings.agents.header.description")}
      />

      <PromptsBlock />

      <CustomInstructionsBlock value={customInstructions} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>{t("settings.agents.agents.label")}</Label>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() =>
              setEditingAgent({
                id: newAgentId(),
                name: t("settings.agents.agents.defaultName"),
                description: "",
                instructions: "",
                icon: "spark",
                builtIn: false,
              })
            }
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
            {t("settings.agents.agents.new")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[...BUILTIN_AGENTS, ...customAgents].map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              active={a.id === activeAgentId}
              onActivate={() => setActiveAgentId(a.id)}
              onEdit={a.builtIn ? null : () => setEditingAgent(a)}
              onDelete={a.builtIn ? null : () => removeAgent(a.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Label>{t("settings.agents.snippets.label")}</Label>
            <span className="text-[10.5px] text-muted-foreground">
              {t("settings.agents.snippets.hintPre")}{" "}
              <code className="rounded bg-muted/50 px-1 font-mono">
                #handle
              </code>
              {t("settings.agents.snippets.hintPost")}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() =>
              setEditingSnippet({
                id: newSnippetId(),
                handle: "",
                name: "",
                description: "",
                content: "",
              })
            }
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
            {t("settings.agents.snippets.new")}
          </Button>
        </div>

        {snippets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-[11px] text-muted-foreground">
            {t("settings.agents.snippets.emptyPre")}{" "}
            <code className="font-mono">#handle</code>{" "}
            {t("settings.agents.snippets.emptyPost")}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {snippets.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
              >
                <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  #{s.handle}
                </code>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12px] font-medium">
                    {s.name}
                  </span>
                  {s.description ? (
                    <span className="truncate text-[10.5px] text-muted-foreground">
                      {s.description}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setEditingSnippet(s)}
                  title={t("settings.agents.card.edit")}
                >
                  <HugeiconsIcon
                    icon={Edit02Icon}
                    size={12}
                    strokeWidth={1.75}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSnippet(s.id)}
                  title={t("settings.agents.card.delete")}
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={12}
                    strokeWidth={1.75}
                  />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AgentEditorDialog
        agent={editingAgent}
        existing={customAgents}
        onClose={() => setEditingAgent(null)}
        onSave={(a) => {
          upsertAgent(a);
          setEditingAgent(null);
        }}
      />
      <SnippetEditorDialog
        snippet={editingSnippet}
        existing={snippets}
        onClose={() => setEditingSnippet(null)}
        onSave={(s) => {
          upsertSnippet(s);
          setEditingSnippet(null);
        }}
      />
    </div>
  );
}

function AgentCard({
  agent,
  active,
  onActivate,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  active: boolean;
  onActivate: () => void;
  onEdit: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const { t } = useTranslation();
  const Icon = AGENT_ICONS[agent.icon] ?? SparklesIcon;
  const display = agentDisplay(agent, t);
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-lg border bg-card/60 px-3 py-2.5 transition-colors",
        active
          ? "border-foreground/30 ring-1 ring-foreground/10"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40">
          <HugeiconsIcon icon={Icon} size={14} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
            {display.name}
            {agent.builtIn ? (
              <span className="rounded bg-muted/50 px-1 py-0.5 text-[9px] tracking-wide text-muted-foreground uppercase">
                {t("settings.agents.card.builtIn")}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
            {display.description}
          </span>
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <Button
          size="sm"
          variant={active ? "default" : "outline"}
          onClick={onActivate}
          className="h-6 gap-1 px-2 text-[10.5px]"
        >
          {active ? (
            <>
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={10}
                strokeWidth={2}
              />
              {t("settings.agents.card.active")}
            </>
          ) : (
            t("settings.agents.card.use")
          )}
        </Button>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={onEdit}
              title={t("settings.agents.card.edit")}
            >
              <HugeiconsIcon icon={Edit02Icon} size={11} strokeWidth={1.75} />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title={t("settings.agents.card.delete")}
            >
              <HugeiconsIcon icon={Delete02Icon} size={11} strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AgentEditorDialog({
  agent,
  existing,
  onClose,
  onSave,
}: {
  agent: Agent | null;
  existing: Agent[];
  onClose: () => void;
  onSave: (a: Agent) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Agent | null>(agent);
  useEffect(() => setDraft(agent), [agent]);
  if (!draft) return null;

  const isNew = !existing.some((a) => a.id === draft.id);
  const canSave =
    draft.name.trim().length > 0 && draft.instructions.trim().length > 0;

  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {isNew
              ? t("settings.agents.agentDialog.newTitle")
              : t("settings.agents.agentDialog.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="-mx-2 max-h-[calc(100vh-14rem)] overflow-y-auto px-2 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <Label>{t("settings.agents.agentDialog.icon")}</Label>
              <div className="flex flex-wrap gap-1">
                {ICON_OPTIONS.map((id) => {
                  const Icon = AGENT_ICONS[id] ?? SparklesIcon;
                  const active = draft.icon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDraft({ ...draft, icon: id })}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md border transition-colors",
                        active
                          ? "border-foreground/40 bg-accent"
                          : "border-border/60 hover:bg-accent/40",
                      )}
                    >
                      <HugeiconsIcon icon={Icon} size={13} strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>{t("settings.agents.agentDialog.name")}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-8 text-[12px]"
                placeholder={t("settings.agents.agentDialog.namePlaceholder")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("settings.agents.agentDialog.description")}</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder={t(
                "settings.agents.agentDialog.descriptionPlaceholder",
              )}
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("settings.agents.agentDialog.instructions")}</Label>
            <Textarea
              value={draft.instructions}
              onChange={(e) =>
                setDraft({ ...draft, instructions: e.target.value })
              }
              placeholder={t(
                "settings.agents.agentDialog.instructionsPlaceholder",
              )}
              className="min-h-40 resize-y text-[12px] leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("settings.agents.common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => onSave({ ...draft, builtIn: false })}
          >
            {t("settings.agents.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnippetEditorDialog({
  snippet,
  existing,
  onClose,
  onSave,
}: {
  snippet: Snippet | null;
  existing: Snippet[];
  onClose: () => void;
  onSave: (s: Snippet) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Snippet | null>(snippet);
  useEffect(() => setDraft(snippet), [snippet]);
  if (!draft) return null;

  const handleErr = !draft.handle
    ? t("settings.agents.snippetDialog.handleErrorRequired")
    : !isValidHandle(draft.handle)
      ? t("settings.agents.snippetDialog.handleErrorInvalid")
      : existing.some((s) => s.id !== draft.id && s.handle === draft.handle)
        ? t("settings.agents.snippetDialog.handleErrorInUse")
        : null;
  const canSave =
    !handleErr &&
    draft.name.trim().length > 0 &&
    draft.content.trim().length > 0;

  return (
    <Dialog open={!!snippet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {existing.some((s) => s.id === draft.id)
              ? t("settings.agents.snippetDialog.editTitle")
              : t("settings.agents.snippetDialog.newTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="-mx-2 max-h-[calc(100vh-14rem)] overflow-y-auto px-2 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex w-32 flex-col gap-1">
              <Label>{t("settings.agents.snippetDialog.handle")}</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-2 -translate-y-1/2 font-mono text-[11.5px] text-muted-foreground">
                  #
                </span>
                <Input
                  value={draft.handle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      handle: normalizeHandle(e.target.value),
                    })
                  }
                  placeholder="review"
                  className="h-8 pl-5 font-mono text-[11.5px]"
                />
              </div>
              {handleErr ? (
                <span className="text-[10px] text-destructive">
                  {handleErr}
                </span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>{t("settings.agents.snippetDialog.name")}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t("settings.agents.snippetDialog.namePlaceholder")}
                className="h-8 text-[12px]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("settings.agents.snippetDialog.description")}</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder={t(
                "settings.agents.snippetDialog.descriptionPlaceholder",
              )}
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("settings.agents.snippetDialog.content")}</Label>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder={t(
                "settings.agents.snippetDialog.contentPlaceholder",
              )}
              className="min-h-40 resize-y font-mono text-[11.5px] leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("settings.agents.common.cancel")}
          </Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave(draft)}>
            {t("settings.agents.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomInstructionsBlock({ value }: { value: string }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const hadFirstSync = useRef(false);

  useEffect(() => {
    if (!hadFirstSync.current) {
      hadFirstSync.current = true;
      setDraft(value);
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{t("settings.agents.customInstructions.label")}</Label>
        {/* {savedTick > 0 ? (
          <span className="text-[10px] text-muted-foreground">Saved</span>
        ) : null} */}
        {draft && (
          <Button size="xs" onClick={() => void setCustomInstructions(draft)}>
            {t("settings.agents.customInstructions.save")}
          </Button>
        )}
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("settings.agents.customInstructions.placeholder")}
        className="min-h-[100px] resize-y bg-card/60 font-sans text-[12px] leading-relaxed border border-border"
      />
      <p className="text-[10.5px] text-muted-foreground">
        {t("settings.agents.customInstructions.pointer")}
      </p>
    </div>
  );
}

const PROMPT_TABS: readonly SystemPromptKind[] = ["full", "lite", "custom"];

/**
 * 系统提示词管理：查看/编辑 full 与 lite 的覆盖文本（可恢复内置默认），
 * 或编写完全自定义的提示词；并设置所有 Provider 缺省使用的档位。
 * 草稿在本地编辑，点「保存」才写入配置文件；本页的角色/指令/片段是追加层，
 * 拼在基础提示词之后，不受这里替换的影响。
 */
function PromptsBlock() {
  const { t } = useTranslation();
  const config = useAiConfigStore((s) => s.config);
  const replace = useAiConfigStore((s) => s.replace);
  const [tab, setTab] = useState<SystemPromptKind>("full");
  // 草稿绑定到当时的 tab 与覆盖文本;外部重载/保存成功后基准变化,草稿自动失效
  const [edit, setEdit] = useState<{
    tab: SystemPromptKind;
    base: string | undefined;
    text: string;
  } | null>(null);

  const tabLabel = (kind: SystemPromptKind) =>
    kind === "custom"
      ? t("settings.agents.prompts.tabCustom")
      : kind === "lite"
        ? t("settings.agents.prompts.tabLite")
        : t("settings.agents.prompts.tabFull");

  const onReplace = async (next: AiConfig) => {
    await replace(next);
  };

  const overrideText = config.prompts?.[tab];
  const builtinText = tab === "custom" ? "" : builtinSystemPrompt(tab);
  const draft =
    edit && edit.tab === tab && edit.base === overrideText ? edit.text : null;
  const shownText = draft ?? overrideText ?? builtinText;
  const overridden = !!overrideText?.trim();
  const dirty = draft !== null && draft !== (overrideText ?? builtinText);

  const writePrompts = async (prompts: SystemPromptOverrides) => {
    const next = { ...config };
    if (Object.keys(prompts).length > 0) next.prompts = prompts;
    else delete next.prompts;
    await onReplace(next);
  };

  const save = async () => {
    if (draft === null) return;
    const prompts: SystemPromptOverrides = { ...config.prompts };
    if (draft.trim()) prompts[tab] = draft;
    else delete prompts[tab];
    await writePrompts(prompts);
  };

  const restore = async () => {
    const prompts = { ...config.prompts };
    delete prompts[tab];
    await writePrompts(prompts);
    setEdit(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="flex items-center gap-1">
        <Label>{t("settings.agents.prompts.label")}</Label>
        <InfoHint text={t("settings.agents.prompts.info")} />
      </span>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex w-20 shrink-0 items-center gap-1 text-[11px] tracking-tight text-muted-foreground">
            <span className="truncate">
              {t("settings.agents.prompts.globalLabel")}
            </span>
            <InfoHint text={t("settings.agents.prompts.globalInfo")} />
          </span>
          <div className="flex flex-1 items-center">
            <Select
              value={config.defaults.systemPrompt ?? "full"}
              onValueChange={(v) =>
                void onReplace({
                  ...config,
                  defaults: {
                    ...config.defaults,
                    systemPrompt: v as SystemPromptKind,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 w-36 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_TABS.map((kind) => (
                  <SelectItem key={kind} value={kind} className="text-[11.5px]">
                    {tabLabel(kind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 p-0.5">
            {PROMPT_TABS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setTab(kind)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] transition-colors",
                  tab === kind
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tabLabel(kind)}
                {config.prompts?.[kind]?.trim() ? (
                  <span className="ml-1 text-[9px] text-primary">
                    {t("settings.agents.prompts.edited")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5">
            {tab !== "custom" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!overridden}
                onClick={() => void restore()}
                className="h-7 gap-1.5 px-2.5 text-[11px]"
              >
                <HugeiconsIcon
                  icon={ArrowTurnBackwardIcon}
                  size={12}
                  strokeWidth={2}
                />
                {t("settings.agents.prompts.restore")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty}
              onClick={() => void save()}
              className="h-7 px-2.5 text-[11px]"
            >
              {t("settings.agents.prompts.save")}
              <InfoHint
                text={
                  tab === "custom"
                    ? t("settings.agents.prompts.customInfo")
                    : t("settings.agents.prompts.editInfo")
                }
                nested
              />
            </Button>
          </span>
        </div>

        <Textarea
          value={shownText}
          onChange={(e) =>
            setEdit({ tab, base: overrideText, text: e.target.value })
          }
          placeholder={
            tab === "custom"
              ? t("settings.agents.prompts.customPlaceholder")
              : undefined
          }
          spellCheck={false}
          className="max-h-72 min-h-36 font-mono text-[10.5px] leading-relaxed"
        />

        {tab === "custom" ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">
              {t("settings.agents.prompts.tailLabel")}
            </span>
            <pre className="max-h-24 overflow-auto rounded-md border border-border/50 bg-muted/30 p-2 font-mono text-[9.5px] leading-relaxed whitespace-pre-wrap text-muted-foreground/80">
              {TOOL_PROTOCOL_TAIL}
            </pre>
          </div>
        ) : null}

        <p className="text-[10.5px] text-muted-foreground">
          {t("settings.agents.prompts.layersPointer")}
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
