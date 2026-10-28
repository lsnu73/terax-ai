import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ProviderIcon } from "@/components/ProviderIcon";
import { cn } from "@/lib/utils";
import {
  type JsonObject,
  type ModelEntry,
  type ParamDef,
  type ProviderEntry,
  type ThinkingConfig,
  builtinProviders,
  getAiConfigFilePath,
  providerSupportsKey,
  STT_PROVIDER_LABELS,
  thinkingLevels,
  useAiConfigStore,
} from "@/modules/ai/config";
import {
  clearKey,
  clearSttKey,
  getAllKeys,
  getSttKey,
  setKey,
  setSttKey,
  type ProviderKeys,
} from "@/modules/ai/lib/keyring";
import {
  fetchProviderModels,
  testProviderConnection,
  type FetchedModel,
} from "@/modules/ai/lib/providerHttp";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  emitKeysChanged,
  setAutocompleteEnabled,
  setAutocompleteModelId,
  setAutocompleteProvider,
  setAutocompleteTrigger,
  setFavoriteModelIds,
  setGroqSttModel,
  setRecentModelIds,
  setSttProvider,
  setWhispercppBaseURL,
  type AutocompleteTrigger,
} from "@/modules/settings/store";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ChevronDown,
  Edit02Icon,
  Mic01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; message: string }
  | { status: "fail"; message: string };

function parseJson<T>(text: string): { value?: T; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { value: undefined };
  try {
    return { value: JSON.parse(trimmed) as T };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function stringify(value: unknown): string {
  return value === undefined || value === null
    ? ""
    : JSON.stringify(value, null, 2);
}

function nextProviderId(base: string, existing: ReadonlySet<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/**
 * 设置 → Models。这里的每次修改都会写入页面顶部所示路径的同一份 JSON 文档，
 * 该文档也可以手工编辑；唯一不会进入该文件的是 API Key（存入操作系统钥匙串）。
 */
export function ModelsSection() {
  const config = useAiConfigStore((s) => s.config);
  const warnings = useAiConfigStore((s) => s.warnings);
  const hydrated = useAiConfigStore((s) => s.hydrated);
  const init = useAiConfigStore((s) => s.init);
  const reload = useAiConfigStore((s) => s.reload);
  const replace = useAiConfigStore((s) => s.replace);
  const [keys, setKeys] = useState<ProviderKeys>({});
  const [filePath, setFilePath] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void init();
    void getAiConfigFilePath().then(setFilePath);
  }, [init]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 读取 registry 快照
  useEffect(() => {
    void getAllKeys().then(setKeys);
  }, [config]);

  const updateProvider = async (
    id: string,
    patch: Partial<ProviderEntry>,
  ): Promise<void> => {
    await replace({
      ...config,
      providers: config.providers.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  };

  const updateModel = async (
    providerId: string,
    modelId: string,
    model: ModelEntry,
  ): Promise<void> => {
    await replace({
      ...config,
      providers: config.providers.map((p) =>
        p.id === providerId
          ? {
              ...p,
              models: p.models.map((m) => (m.id === modelId ? model : m)),
            }
          : p,
      ),
    });
  };

  const addModel = async (
    providerId: string,
    model: ModelEntry,
  ): Promise<void> => {
    const duplicate = config.providers.some((p) =>
      p.models.some((m) => m.id === model.id),
    );
    if (duplicate) throw new Error(`模型 ID 已存在：${model.id}`);
    const defaultModelId = config.defaults.modelId || model.id;
    await replace({
      ...config,
      defaults: { modelId: defaultModelId },
      providers: config.providers.map((p) =>
        p.id === providerId ? { ...p, models: [...p.models, model] } : p,
      ),
    });
  };

  const removeModel = async (providerId: string, modelId: string) => {
    const provider = config.providers.find((p) => p.id === providerId);
    const removed = provider?.models.find((m) => m.id === modelId);
    const remainingProviders = config.providers.map((p) =>
      p.id === providerId
        ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
        : p,
    );
    const remainingModelIds = new Set(
      remainingProviders.flatMap((p) => p.models.map((m) => m.id)),
    );
    const nextDefault =
      config.defaults.modelId &&
      remainingModelIds.has(config.defaults.modelId)
        ? config.defaults.modelId
        : (remainingProviders.flatMap((p) => p.models)[0]?.id ?? "");

    const { favoriteModelIds, recentModelIds } = usePreferencesStore.getState();
    if (favoriteModelIds.includes(modelId)) {
      await setFavoriteModelIds(favoriteModelIds.filter((m) => m !== modelId));
    }
    if (recentModelIds.includes(modelId)) {
      await setRecentModelIds(recentModelIds.filter((m) => m !== modelId));
    }
    if (useChatStore.getState().selectedModelId === modelId) {
      useChatStore.getState().setSelectedModelId(nextDefault);
    }
    if (removed) {
      // 无需额外清理——该模型的数据只属于这一行。
    }
    await replace({
      ...config,
      defaults: { modelId: nextDefault },
      providers: remainingProviders,
    });
  };

  const addProvider = async (template: ProviderEntry) => {
    const ids = new Set(config.providers.map((p) => p.id));
    const id = nextProviderId(template.id, ids);
    const provider: ProviderEntry = {
      ...template,
      id,
      keyringAccount:
        id === template.id ? template.keyringAccount : `${id}-api-key`,
      models: [],
      builtin: template.builtin,
    };
    await replace({ ...config, providers: [...config.providers, provider] });
    setAddOpen(false);
  };

  const removeProvider = async (providerId: string) => {
    const provider = config.providers.find((p) => p.id === providerId);
    if (!provider) return;
    await clearKey(providerId);
    const removedIds = new Set(provider.models.map((m) => m.id));
    const providers = config.providers.filter((p) => p.id !== providerId);
    const nextDefault = removedIds.has(config.defaults.modelId)
      ? (providers.flatMap((p) => p.models)[0]?.id ?? "")
      : config.defaults.modelId;

    const { favoriteModelIds, recentModelIds } = usePreferencesStore.getState();
    await setFavoriteModelIds(
      favoriteModelIds.filter((id) => !removedIds.has(id)),
    );
    await setRecentModelIds(recentModelIds.filter((id) => !removedIds.has(id)));
    if (removedIds.has(useChatStore.getState().selectedModelId)) {
      useChatStore.getState().setSelectedModelId(nextDefault);
    }
    await replace({
      ...config,
      defaults: { modelId: nextDefault },
      providers,
    });
    await emitKeysChanged();
  };

  const saveProviderKey = async (providerId: string, value: string) => {
    await setKey(providerId, value);
    setKeys((prev) => ({ ...prev, [providerId]: value }));
    await emitKeysChanged();
  };

  const removeProviderKey = async (providerId: string) => {
    await clearKey(providerId);
    setKeys((prev) => ({ ...prev, [providerId]: null }));
    await emitKeysChanged();
  };

  const catalog = useMemo(() => {
    const existing = new Set(config.providers.map((p) => p.id));
    return builtinProviders().filter((p) => !existing.has(p.id));
  }, [config.providers]);

  if (!hydrated) {
    return <div className="text-[12px] text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title="Models"
        description="Providers and models are data-driven. Edit them here or in the JSON file below — both write the same configuration. API keys stay in your OS keychain."
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
            Configuration file
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void reload()}
            className="h-7 gap-1.5 px-2.5 text-[11px]"
          >
            <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
            Reload from disk
          </Button>
        </div>
        <code className="truncate font-mono text-[10.5px] text-muted-foreground">
          {filePath || "terax-ai-models.json"}
        </code>
        {warnings.length > 0 ? (
          <div className="flex flex-col gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
            {warnings.map((warning) => (
              <span key={warning} className="text-[10.5px] text-amber-600 dark:text-amber-400">
                {warning}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <DefaultsBlock
        providers={config.providers}
        defaultModelId={config.defaults.modelId}
        onPickDefault={async (modelId) => {
          await replace({ ...config, defaults: { modelId } });
        }}
      />

      <VoiceBlock />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Providers</Label>
          <DropdownMenu open={addOpen} onOpenChange={setAddOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2.5 text-[11px]"
              >
                <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
                Add provider
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-60 p-1">
              <DropdownMenuLabel className="px-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                国内厂商
              </DropdownMenuLabel>
              {catalog.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onSelect={() => void addProvider(template)}
                  className="flex items-center gap-2 text-[12px]"
                >
                  <ProviderIcon provider={template.id} icon={template.icon} size={13} />
                  <span>{template.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={() => {
                  const template = builtinProviders().find(
                    (p) => p.id === "custom",
                  );
                  if (template) void addProvider(template);
                }}
                className="flex items-center gap-2 text-[12px]"
              >
                <ProviderIcon provider="custom" icon="plug" size={13} />
                <span>自定义 Provider</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {config.providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 px-4 py-8 text-center">
            <p className="text-[12px] text-muted-foreground">
              No providers configured yet.
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground/70">
              Click "Add provider" to connect a domestic model provider or a
              custom OpenAI-compatible endpoint.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {config.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                apiKey={keys[provider.id] ?? null}
                onUpdate={(patch) => updateProvider(provider.id, patch)}
                onRemove={() => removeProvider(provider.id)}
                onSaveKey={(value) => saveProviderKey(provider.id, value)}
                onClearKey={() => removeProviderKey(provider.id)}
                onAddModel={(model) => addModel(provider.id, model)}
                onUpdateModel={(modelId, model) =>
                  updateModel(provider.id, modelId, model)
                }
                onRemoveModel={(modelId) => removeModel(provider.id, modelId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  apiKey,
  onUpdate,
  onRemove,
  onSaveKey,
  onClearKey,
  onAddModel,
  onUpdateModel,
  onRemoveModel,
}: {
  provider: ProviderEntry;
  apiKey: string | null;
  onUpdate: (patch: Partial<ProviderEntry>) => Promise<void>;
  onRemove: () => void;
  onSaveKey: (value: string) => Promise<void>;
  onClearKey: () => Promise<void>;
  onAddModel: (model: ModelEntry) => Promise<void>;
  onUpdateModel: (modelId: string, model: ModelEntry) => Promise<void>;
  onRemoveModel: (modelId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(provider.models.length === 0);
  const [baseURLDraft, setBaseURLDraft] = useState(provider.baseURL);
  const [keyDraft, setKeyDraft] = useState("");
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [fetched, setFetched] = useState<FetchedModel[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => setBaseURLDraft(provider.baseURL), [provider.baseURL]);

  const configured =
    provider.baseURL.trim().length > 0 &&
    (!providerSupportsKey(provider) || !!apiKey);

  const runTest = async (draft = baseURLDraft) => {
    setTest({ status: "testing" });
    const result = await testProviderConnection(
      { ...provider, baseURL: draft },
      apiKey,
    );
    setTest({
      status: result.ok ? "ok" : "fail",
      message: result.message,
    });
  };

  const fetchModels = async () => {
    setFetching(true);
    setTest({ status: "testing" });
    try {
      const models = await fetchProviderModels(
        { ...provider, baseURL: baseURLDraft.trim() },
        apiKey,
      );
      setFetched(models);
      setTest({
        status: "ok",
        message: `发现 ${models.length} 个模型，点击下方条目添加。`,
      });
    } catch (error) {
      setTest({
        status: "fail",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-border/60 bg-card/60">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <HugeiconsIcon
            icon={ChevronDown}
            size={12}
            strokeWidth={2}
            className={cn(
              "shrink-0 text-muted-foreground/60 transition-transform",
              !expanded && "-rotate-90",
            )}
          />
          <ProviderIcon provider={provider.id} icon={provider.icon} size={15} />
          <span className="truncate text-[12.5px] font-medium">
            {provider.label}
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground/70">
            {provider.id}
          </span>
          {configured ? (
            <Badge
              variant="outline"
              className="ml-1 h-4 gap-1 border-border/60 bg-muted/40 px-1.5 text-[10px] font-normal text-muted-foreground"
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={9}
                strokeWidth={2}
              />
              Configured
            </Badge>
          ) : null}
        </button>
        {provider.consoleUrl ? (
          <button
            type="button"
            onClick={() => void openUrl(provider.consoleUrl as string)}
            className="inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Console
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              size={11}
              strokeWidth={1.75}
            />
          </button>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          title="Remove provider"
          className="size-7 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
        </Button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-2.5 border-t border-border/40 px-3 py-2.5">
          <FieldRow label="Base URL">
            <div className="flex flex-1 gap-1.5">
              <Input
                value={baseURLDraft}
                onChange={(e) => setBaseURLDraft(e.target.value)}
                onBlur={() => {
                  const value = baseURLDraft.trim();
                  if (value !== provider.baseURL) void onUpdate({ baseURL: value });
                }}
                placeholder="https://api.example.com/v1"
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11.5px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runTest()}
                disabled={!baseURLDraft.trim() || test.status === "testing"}
                className="h-8 px-3 text-[11px]"
              >
                Test
              </Button>
            </div>
          </FieldRow>

          {providerSupportsKey(provider) ? (
            <FieldRow label="API key">
              {apiKey ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {`${apiKey.slice(0, 4)}${"•".repeat(8)}${apiKey.slice(-4)}`}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void onClearKey()}
                    title="Remove key"
                    className="size-7 text-muted-foreground hover:text-destructive"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={12}
                      strokeWidth={1.75}
                    />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-1 gap-1.5">
                  <Input
                    type="password"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder={
                      provider.auth.required
                        ? "Paste the provider API key"
                        : "Optional for unauthenticated endpoints"
                    }
                    spellCheck={false}
                    className="h-8 flex-1 font-mono text-[11.5px]"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      const value = keyDraft.trim();
                      if (!value) return;
                      await onSaveKey(value);
                      setKeyDraft("");
                    }}
                    disabled={!keyDraft.trim()}
                    className="h-8 px-3 text-[11px]"
                  >
                    Save
                  </Button>
                </div>
              )}
            </FieldRow>
          ) : null}

          <div className="flex items-center gap-2">
            {provider.modelsApi ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchModels()}
                  disabled={fetching || !provider.baseURL.trim()}
                  className="h-7 gap-1.5 px-2.5 text-[11px]"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
                  Fetch model list
                </Button>
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  GET {provider.modelsApi.path}
                </span>
              </>
            ) : (
              <span className="text-[10.5px] text-muted-foreground">
                该厂商未配置模型列表接口 — 请手动添加模型
              </span>
            )}
          </div>

          <StatusLine test={test} />

          {fetched && fetched.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/20 p-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Fetched models
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFetched(null)}
                  className="h-6 px-2 text-[10.5px]"
                >
                  Dismiss
                </Button>
              </div>
              <div className="max-h-44 overflow-y-auto">
                {fetched.map((item) => {
                  const exists = provider.models.some((m) => m.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-accent/40"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                        {item.id}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={exists}
                        onClick={() =>
                          void onAddModel(defaultModelFor(item.id, provider))
                        }
                        className="h-6 px-2 text-[10.5px]"
                      >
                        {exists ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Label>Models ({provider.models.length})</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding((v) => !v)}
              className="h-7 gap-1.5 px-2.5 text-[11px]"
            >
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
              Add model
            </Button>
          </div>

          {provider.models.length === 0 && !adding ? (
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              暂无模型。可点击 “Fetch model list” 从厂商拉取，或手动添加模型 ID。
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            {provider.models.map((model) => (
              <ModelRow
                key={model.id}
                provider={provider}
                model={model}
                onSave={(next) => onUpdateModel(model.id, next)}
                onRemove={() => onRemoveModel(model.id)}
              />
            ))}
          </div>

          {adding ? (
            <ModelEditor
              title="New model"
              initial={defaultModelFor("", provider)}
              onCancel={() => setAdding(false)}
              onSave={async (model) => {
                await onAddModel(model);
                setAdding(false);
              }}
            />
          ) : null}

          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="mt-1 flex items-center gap-1.5 self-start text-[10.5px] text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon
              icon={ChevronDown}
              size={11}
              strokeWidth={2}
              className={cn("transition-transform", !advanced && "-rotate-90")}
            />
            高级：请求参数 / 思考档位 / 模型列表接口
          </button>
          {advanced ? (
            <ProviderAdvancedEditor provider={provider} onSave={onUpdate} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function defaultModelFor(id: string, provider: ProviderEntry): ModelEntry {
  return {
    id,
    label: id,
    inputTokens: 128_000,
    outputTokens: 4_096,
    supportsTemperature: true,
    supportsAutocomplete: true,
    systemPrompt: "full",
    params: [],
    thinking: null,
    extra: {},
    tags: provider.thinking ? ["reasoning"] : [],
  };
}

function ModelRow({
  provider,
  model,
  onSave,
  onRemove,
}: {
  provider: ProviderEntry;
  model: ModelEntry;
  onSave: (model: ModelEntry) => Promise<void>;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const levels = thinkingLevels(provider, model);

  return (
    <div className="flex flex-col rounded-md border border-border/40 bg-card/40">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-[11.5px]">
          {model.label}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted-foreground">
          {model.id}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {model.inputTokens.toLocaleString()} in /{" "}
          {model.outputTokens.toLocaleString()} out
        </span>
        {levels.length > 0 ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 border-border/60 bg-muted/40 px-1.5 text-[9.5px] font-normal text-muted-foreground"
          >
            思考 {levels.length} 档
          </Badge>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          title="Edit model"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={Edit02Icon} size={11} strokeWidth={1.75} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          title="Remove model"
          className="size-6 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={1.75} />
        </Button>
      </div>
      {editing ? (
        <div className="border-t border-border/40 p-2">
          <ModelEditor
            title="Edit model"
            initial={model}
            onCancel={() => setEditing(false)}
            onSave={async (next) => {
              await onSave(next);
              setEditing(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ModelEditor({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string;
  initial: ModelEntry;
  onSave: (model: ModelEntry) => Promise<void>;
  onCancel: () => void;
}) {
  const [id, setId] = useState(initial.id);
  const [label, setLabel] = useState(initial.label);
  const [inputTokens, setInputTokens] = useState(String(initial.inputTokens));
  const [outputTokens, setOutputTokens] = useState(String(initial.outputTokens));
  const [temperature, setTemperature] = useState(initial.supportsTemperature);
  const [autocomplete, setAutocomplete] = useState(
    initial.supportsAutocomplete,
  );
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [paramsText, setParamsText] = useState(
    initial.params.length > 0 ? stringify(initial.params) : "",
  );
  const [thinkingText, setThinkingText] = useState(
    initial.thinking ? stringify(initial.thinking) : "",
  );
  const [extraText, setExtraText] = useState(
    Object.keys(initial.extra).length > 0 ? stringify(initial.extra) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    const trimmedId = id.trim();
    if (!trimmedId) {
      setError("模型 ID 不能为空。");
      return;
    }
    const input = parseInt(inputTokens, 10);
    const output = parseInt(outputTokens, 10);
    if (!Number.isFinite(input) || input < 1_000) {
      setError("输入 token 必须是 ≥ 1000 的数字。");
      return;
    }
    if (!Number.isFinite(output) || output < 1) {
      setError("输出 token 必须是正数。");
      return;
    }
    const params = parseJson<ParamDef[]>(paramsText);
    if (params.error) {
      setError(`参数 JSON 无效：${params.error}`);
      return;
    }
    const thinking = parseJson<ThinkingConfig>(thinkingText);
    if (thinking.error) {
      setError(`思考档位 JSON 无效：${thinking.error}`);
      return;
    }
    const extra = parseJson<JsonObject>(extraText);
    if (extra.error) {
      setError(`额外 JSON 无效：${extra.error}`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: trimmedId,
        label: label.trim() || trimmedId,
        inputTokens: Math.round(input),
        outputTokens: Math.round(output),
        supportsTemperature: temperature,
        supportsAutocomplete: autocomplete,
        systemPrompt,
        params: params.value ?? [],
        thinking: thinking.value ?? null,
        extra: extra.value ?? {},
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {title}
      </span>
      <FieldRow label="Model ID">
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="glm-5.3, deepseek-chat, qwen3-max, ep-xxxx…"
          spellCheck={false}
          className="h-8 font-mono text-[11.5px]"
        />
      </FieldRow>
      <FieldRow label="Label">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Display name"
          spellCheck={false}
          className="h-8 text-[11.5px]"
        />
      </FieldRow>
      <FieldRow label="Input">
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            value={inputTokens}
            onChange={(e) => setInputTokens(e.target.value)}
            placeholder="128000"
            spellCheck={false}
            className="h-8 w-32 font-mono text-[11.5px]"
          />
          <span className="text-[10.5px] text-muted-foreground">
            tokens (context window)
          </span>
        </div>
      </FieldRow>
      <FieldRow label="Output">
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            value={outputTokens}
            onChange={(e) => setOutputTokens(e.target.value)}
            placeholder="4096"
            spellCheck={false}
            className="h-8 w-32 font-mono text-[11.5px]"
          />
          <span className="text-[10.5px] text-muted-foreground">
            tokens (per response)
          </span>
        </div>
      </FieldRow>
      <FieldRow label="Sampling">
        <div className="flex flex-1 items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Switch checked={temperature} onCheckedChange={setTemperature} />
            temperature
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Switch checked={autocomplete} onCheckedChange={setAutocomplete} />
            autocomplete
          </span>
          <Select
            value={systemPrompt}
            onValueChange={(v) => setSystemPrompt(v as "full" | "lite")}
          >
            <SelectTrigger className="h-7 w-28 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">full prompt</SelectItem>
              <SelectItem value="lite">lite prompt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FieldRow>
      <FieldRow label="Tags">
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="reasoning, lite"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <JsonField
        label="Params"
        value={paramsText}
        onChange={setParamsText}
        placeholder='[{"key":"reasoning_effort","location":"body","type":"string","map":{"low":"low","xhigh":"max"}}]'
      />
      <JsonField
        label="Thinking"
        value={thinkingText}
        onChange={setThinkingText}
        placeholder='{"default":"high","levels":[{"id":"off","label":"关闭","values":{"thinking.type":"disabled"}},{"id":"high","label":"高","values":{"thinking.type":"enabled"}}]}'
      />
      <JsonField
        label="Extra"
        value={extraText}
        onChange={setExtraText}
        placeholder='{"stream_options":{"include_usage":true}}'
      />
      {error ? (
        <span className="text-[10.5px] text-destructive/80">{error}</span>
      ) : null}
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-7 px-2.5 text-[11px]"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={saving}
          className="h-7 px-3 text-[11px]"
        >
          {saving ? "Saving…" : "Save model"}
        </Button>
      </div>
    </div>
  );
}

function ProviderAdvancedEditor({
  provider,
  onSave,
}: {
  provider: ProviderEntry;
  onSave: (patch: Partial<ProviderEntry>) => Promise<void>;
}) {
  const [label, setLabel] = useState(provider.label);
  const [protocol, setProtocol] = useState(provider.protocol);
  const [authMode, setAuthMode] = useState(provider.auth.mode);
  const [authHeader, setAuthHeader] = useState(provider.auth.header ?? "");
  const [authRequired, setAuthRequired] = useState(provider.auth.required);
  const [keyringAccount, setKeyringAccount] = useState(provider.keyringAccount);
  const [consoleUrl, setConsoleUrl] = useState(provider.consoleUrl ?? "");
  const [icon, setIcon] = useState(provider.icon);
  const [paramsText, setParamsText] = useState(stringify(provider.params));
  const [thinkingText, setThinkingText] = useState(
    stringify(provider.thinking),
  );
  const [headersText, setHeadersText] = useState(stringify(provider.headers));
  const [apiText, setApiText] = useState(stringify(provider.modelsApi));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    const params = parseJson<ParamDef[]>(paramsText);
    const thinking = parseJson<ThinkingConfig>(thinkingText);
    const headers = parseJson<Record<string, string>>(headersText);
    const api = parseJson<ProviderEntry["modelsApi"]>(apiText);
    const failure =
      params.error ?? thinking.error ?? headers.error ?? api.error;
    if (failure) {
      setError(`JSON 无效：${failure}`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        label: label.trim() || provider.id,
        protocol,
        auth: {
          mode: authMode,
          required: authMode === "none" ? false : authRequired,
          ...(authHeader.trim() ? { header: authHeader.trim() } : {}),
        },
        keyringAccount: keyringAccount.trim() || `${provider.id}-api-key`,
        consoleUrl: consoleUrl.trim() || undefined,
        icon: icon.trim() || "plug",
        params: params.value ?? [],
        thinking: thinking.value ?? null,
        headers: headers.value ?? {},
        modelsApi: api.value ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
      <FieldRow label="Label">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 text-[11.5px]"
        />
      </FieldRow>
      <FieldRow label="Protocol">
        <Select
          value={protocol}
          onValueChange={(v) => setProtocol(v as ProviderEntry["protocol"])}
        >
          <SelectTrigger className="h-8 w-52 text-[11.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai-compatible">
              openai-compatible (国内厂商通用)
            </SelectItem>
            <SelectItem value="anthropic">anthropic</SelectItem>
            <SelectItem value="google">google</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Auth">
        <div className="flex flex-1 items-center gap-2">
          <Select
            value={authMode}
            onValueChange={(v) =>
              setAuthMode(v as ProviderEntry["auth"]["mode"])
            }
          >
            <SelectTrigger className="h-8 w-32 text-[11.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bearer">bearer</SelectItem>
              <SelectItem value="x-api-key">x-api-key</SelectItem>
              <SelectItem value="none">none</SelectItem>
            </SelectContent>
          </Select>
          {authMode === "x-api-key" ? (
            <Input
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              placeholder="x-api-key"
              className="h-8 flex-1 font-mono text-[11px]"
            />
          ) : null}
          {authMode !== "none" ? (
            <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <Switch
                checked={authRequired}
                onCheckedChange={setAuthRequired}
              />
              required
            </span>
          ) : null}
        </div>
      </FieldRow>
      <FieldRow label="Keyring">
        <Input
          value={keyringAccount}
          onChange={(e) => setKeyringAccount(e.target.value)}
          placeholder="provider-api-key"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <FieldRow label="Console">
        <Input
          value={consoleUrl}
          onChange={(e) => setConsoleUrl(e.target.value)}
          placeholder="https://console.example.com/api-keys"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <FieldRow label="Icon">
        <Input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="brain / cpu / globe / flash / server / plug"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <JsonField
        label="Params"
        value={paramsText}
        onChange={setParamsText}
        placeholder="[]"
      />
      <JsonField
        label="Thinking"
        value={thinkingText}
        onChange={setThinkingText}
        placeholder="null"
      />
      <JsonField
        label="Headers"
        value={headersText}
        onChange={setHeadersText}
        placeholder='{"HTTP-Referer":"https://terax.ai"}'
      />
      <JsonField
        label="Models API"
        value={apiText}
        onChange={setApiText}
        placeholder='{"path":"/models","itemsPath":"data","idPath":"id"}'
      />
      {error ? (
        <span className="text-[10.5px] text-destructive/80">{error}</span>
      ) : null}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={saving}
          className="h-7 px-3 text-[11px]"
        >
          {saving ? "Saving…" : "Save provider settings"}
        </Button>
      </div>
    </div>
  );
}

function JsonField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] text-muted-foreground">{label} (JSON)</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="min-h-16 resize-y font-mono text-[10.5px] leading-relaxed"
      />
    </div>
  );
}

function DefaultsBlock({
  providers,
  defaultModelId,
  onPickDefault,
}: {
  providers: readonly ProviderEntry[];
  defaultModelId: string;
  onPickDefault: (modelId: string) => Promise<void>;
}) {
  const models = providers.flatMap((p) =>
    p.models.map((m) => ({ provider: p, model: m })),
  );
  const current = models.find(({ model }) => model.id === defaultModelId);

  return (
    <div className="flex flex-col gap-3">
      <Label>Defaults</Label>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <FieldRow label="Chat model">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={models.length === 0}
                className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
              >
                <span className="flex items-center gap-2 truncate">
                  {current ? (
                    <ProviderIcon provider={current.provider.id} size={13} />
                  ) : null}
                  <span className="truncate">
                    {current?.model.label ??
                      (models.length === 0 ? "No models configured" : "Select model")}
                  </span>
                  {current ? (
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {current.model.id}
                    </span>
                  ) : null}
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={11}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={6}
              collisionPadding={12}
              className="min-w-70 p-1"
            >
              <div className="max-h-72 overflow-y-auto overscroll-contain pr-1">
                {providers.map((provider) => {
                  if (provider.models.length === 0) return null;
                  return (
                    <div key={provider.id} className="px-1 pt-1.5 first:pt-1">
                      <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        <ProviderIcon provider={provider.id} size={11} />
                        <span>{provider.label}</span>
                      </div>
                      {provider.models.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onSelect={() => void onPickDefault(model.id)}
                          className={cn(
                            "flex items-start gap-2 text-[12px]",
                            model.id === defaultModelId && "bg-accent/50",
                          )}
                        >
                          <span className="flex flex-1 flex-col">
                            <span>{model.label}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {model.id}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </FieldRow>
        <AutocompleteRow providers={providers} />
      </div>
    </div>
  );
}

function AutocompleteRow({
  providers,
}: {
  providers: readonly ProviderEntry[];
}) {
  const enabled = usePreferencesStore((s) => s.autocompleteEnabled);
  const trigger = usePreferencesStore((s) => s.autocompleteTrigger);
  const providerId = usePreferencesStore((s) => s.autocompleteProvider);
  const modelId = usePreferencesStore((s) => s.autocompleteModelId);
  const provider = providers.find((p) => p.id === providerId) ?? providers[0];
  const eligible = (provider?.models ?? []).filter(
    (m) => m.supportsAutocomplete,
  );
  const currentModel =
    eligible.find((m) => m.id === modelId) ?? eligible[0];

  useEffect(() => {
    if (providerId || !provider) return;
    void setAutocompleteProvider(provider.id);
    void setAutocompleteModelId(eligible[0]?.id ?? "");
  }, [providerId, provider, eligible]);

  return (
    <>
      <FieldRow label="Autocomplete">
        <div className="flex flex-1 items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={(v) => void setAutocompleteEnabled(v)}
          />
          <Select
            value={provider?.id ?? ""}
            onValueChange={(v) => {
              const next = providers.find((p) => p.id === v);
              void setAutocompleteProvider(v);
              void setAutocompleteModelId(next?.models[0]?.id ?? "");
            }}
          >
            <SelectTrigger
              disabled={!enabled || providers.length === 0}
              className="h-8 w-44 text-[11.5px]"
            >
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentModel?.id ?? ""}
            onValueChange={(v) => void setAutocompleteModelId(v)}
          >
            <SelectTrigger
              disabled={!enabled || !provider || provider.models.length === 0}
              className="h-8 flex-1 text-[11.5px]"
            >
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FieldRow>
      {enabled ? (
        <FieldRow label="Trigger">
          <Select
            value={trigger}
            onValueChange={(v) =>
              void setAutocompleteTrigger(v as AutocompleteTrigger)
            }
          >
            <SelectTrigger className="h-8 w-full text-[11.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatic (as you type)</SelectItem>
              <SelectItem value="manual">Manual (shortcut)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      ) : null}
    </>
  );
}

function VoiceBlock() {
  const sttProvider = usePreferencesStore((s) => s.sttProvider);
  const groqSttModel = usePreferencesStore((s) => s.groqSttModel);
  const whispercppBaseURL = usePreferencesStore((s) => s.whispercppBaseURL);
  const [urlDraft, setUrlDraft] = useState(whispercppBaseURL);
  const [groqModelDraft, setGroqModelDraft] = useState(groqSttModel);
  const [openaiKey, setOpenaiKey] = useState<string | null>(null);
  const [groqKey, setGroqKey] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState("");

  useEffect(() => setUrlDraft(whispercppBaseURL), [whispercppBaseURL]);
  useEffect(() => setGroqModelDraft(groqSttModel), [groqSttModel]);
  useEffect(() => {
    void getSttKey("openai").then(setOpenaiKey);
    void getSttKey("groq").then(setGroqKey);
  }, []);

  const currentKey = sttProvider === "openai" ? openaiKey : groqKey;
  const account = sttProvider === "openai" ? "openai" : "groq";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Mic01Icon} size={15} strokeWidth={1.5} />
        <span className="text-[12.5px] font-medium">Voice input</span>
      </div>

      <FieldRow label="Provider">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
            >
              <span>{STT_PROVIDER_LABELS[sttProvider]}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={11}
                strokeWidth={2}
                className="opacity-70"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 p-1">
            {(Object.keys(STT_PROVIDER_LABELS) as (keyof typeof STT_PROVIDER_LABELS)[]).map((p) => (
              <DropdownMenuItem
                key={p}
                onSelect={() => void setSttProvider(p)}
                className={cn(
                  "flex items-center gap-2 text-[12px]",
                  p === sttProvider && "bg-accent/50",
                )}
              >
                <span>{STT_PROVIDER_LABELS[p]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </FieldRow>

      {sttProvider !== "whispercpp" ? (
        <FieldRow label="API key">
          {currentKey ? (
            <div className="flex flex-1 items-center gap-1.5">
              <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {`${currentKey.slice(0, 4)}${"•".repeat(8)}${currentKey.slice(-4)}`}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await clearSttKey(account);
                  if (account === "openai") setOpenaiKey(null);
                  else setGroqKey(null);
                  await emitKeysChanged();
                }}
                title="Remove key"
                className="size-7 text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 gap-1.5">
              <Input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="Speech-to-text API key"
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11.5px]"
              />
              <Button
                size="sm"
                onClick={async () => {
                  const value = keyDraft.trim();
                  if (!value) return;
                  await setSttKey(account, value);
                  if (account === "openai") setOpenaiKey(value);
                  else setGroqKey(value);
                  setKeyDraft("");
                  await emitKeysChanged();
                }}
                disabled={!keyDraft.trim()}
                className="h-8 px-3 text-[11px]"
              >
                Save
              </Button>
            </div>
          )}
        </FieldRow>
      ) : null}

      {sttProvider === "groq" ? (
        <FieldRow label="Model">
          <Input
            value={groqModelDraft}
            onChange={(e) => setGroqModelDraft(e.target.value)}
            onBlur={() => {
              const value = groqModelDraft.trim();
              if (value !== groqSttModel) void setGroqSttModel(value);
            }}
            placeholder="whisper-large-v3-turbo"
            spellCheck={false}
            className="h-8 font-mono text-[11.5px]"
          />
        </FieldRow>
      ) : null}

      {sttProvider === "whispercpp" ? (
        <FieldRow label="Base URL">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={() => {
              const value = urlDraft.trim();
              if (value !== whispercppBaseURL) void setWhispercppBaseURL(value);
            }}
            placeholder="http://127.0.0.1:8080"
            spellCheck={false}
            className="h-8 font-mono text-[11.5px]"
          />
        </FieldRow>
      ) : null}

      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        {sttProvider === "openai" &&
          "Uses an OpenAI Whisper key for transcription. This key is separate from model providers and is stored in your OS keychain."}
        {sttProvider === "groq" &&
          "Uses a Groq Whisper key for transcription. Stored in your OS keychain, never in the JSON file."}
        {sttProvider === "whispercpp" &&
          "Connects to a local Whisper.cpp server for fully offline transcription."}
      </p>
    </div>
  );
}

function StatusLine({ test }: { test: TestState }) {
  if (test.status === "idle") return null;
  if (test.status === "testing") {
    return (
      <span className="text-[10.5px] text-muted-foreground">Testing…</span>
    );
  }
  if (test.status === "ok") {
    return (
      <span className="flex items-start gap-1 text-[10.5px] text-muted-foreground">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={11}
          strokeWidth={2}
          className="mt-0.5 shrink-0"
        />
        {test.message}
      </span>
    );
  }
  return (
    <span className="text-[10.5px] leading-relaxed text-destructive/80">
      {test.message}
    </span>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] tracking-tight text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 items-center">{children}</div>
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
