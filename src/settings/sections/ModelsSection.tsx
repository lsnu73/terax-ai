import { ProviderIcon } from "@/components/ProviderIcon";
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
import { cn } from "@/lib/utils";
import {
  builtinProviders,
  type JsonObject,
  type ModelEntry,
  openAiConfigDir,
  type ParamDef,
  type ProviderEntry,
  providerSupportsKey,
  type SystemPromptKind,
  type EffortConfig,
  effortLevels,
  useAiConfigStore,
} from "@/modules/ai/config";
import {
  clearKey,
  getAllKeys,
  type ProviderKeys,
  setKey,
} from "@/modules/ai/lib/keyring";
import {
  type FetchedModel,
  fetchProviderModels,
  testProviderConnection,
} from "@/modules/ai/lib/providerHttp";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { currentLocale, t as i18nT } from "@/modules/i18n";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  type AutocompleteTrigger,
  emitKeysChanged,
  setAutocompleteEnabled,
  setAutocompleteModelId,
  setAutocompleteProvider,
  setAutocompleteTrigger,
  setFavoriteModelIds,
  setRecentModelIds,
} from "@/modules/settings/store";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ChevronDown,
  Edit02Icon,
  FolderOpenIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "../components/SectionHeader";
import {
  ExtraForm,
  HeadersForm,
  InfoHint,
  ModelsApiForm,
  ParamsForm,
  parseExtra,
  parseHeaders,
  parseModelsApi,
  parseParamsArray,
  parseEffort,
  StructuredJsonField,
  EffortForm,
} from "./models/StructuredFields";

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

function validateParamKeys(params: ParamDef[] | undefined): string | null {
  const list = params ?? [];
  for (let i = 0; i < list.length; i++) {
    if (!list[i]?.key?.trim()) {
      return i18nT("settings.models.validation.paramKeyRequired", {
        index: i + 1,
      });
    }
  }
  return null;
}

function validateEffortConfig(
  effort: EffortConfig | null | undefined,
): string | null {
  if (effort && !effort.path?.trim()) {
    return i18nT("settings.models.validation.effortNeedsPath");
  }
  const levels = effort?.levels ?? [];
  if (effort && levels.length === 0) {
    return i18nT("settings.models.validation.effortNeedsLevel");
  }
  const seen = new Set<string>();
  for (let i = 0; i < levels.length; i++) {
    const id = levels[i]?.id?.trim();
    if (!id)
      return i18nT("settings.models.validation.effortLevelMissingId", {
        index: i + 1,
      });
    if (seen.has(id))
      return i18nT("settings.models.validation.effortLevelDuplicateId", {
        id,
      });
    seen.add(id);
  }
  return null;
}

/**
 * 设置 → Models。这里的每次修改都会写入页面顶部所示路径的同一份 JSON 文档，
 * 该文档也可以手工编辑；唯一不会进入该文件的是 API Key（存入操作系统钥匙串）。
 */
export function ModelsSection() {
  const { t } = useTranslation();
  const config = useAiConfigStore((s) => s.config);
  const warnings = useAiConfigStore((s) => s.warnings);
  const hydrated = useAiConfigStore((s) => s.hydrated);
  const init = useAiConfigStore((s) => s.init);
  const reload = useAiConfigStore((s) => s.reload);
  const replace = useAiConfigStore((s) => s.replace);
  const [keys, setKeys] = useState<ProviderKeys>({});
  const [openError, setOpenError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void init();
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
    if (duplicate)
      throw new Error(
        t("settings.models.modelEditor.duplicateId", { id: model.id }),
      );
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
      config.defaults.modelId && remainingModelIds.has(config.defaults.modelId)
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
    return (
      <div className="text-[12px] text-muted-foreground">
        {t("settings.models.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title={t("settings.models.header.title")}
        description={t("settings.models.header.description")}
      />

      <div data-setting-id="models.configFile" className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[11px] font-medium tracking-tight text-muted-foreground">
            {t("settings.models.configFile.label")}
            <code className="font-mono text-[10.5px] font-normal">
              terax-ai-models.json
            </code>
          </span>
          <span className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOpenError(null);
                void openAiConfigDir().catch((error: unknown) => {
                  console.error("open config dir failed:", error);
                  setOpenError(
                    error instanceof Error ? error.message : String(error),
                  );
                });
              }}
              className="h-7 gap-1.5 px-2.5 text-[11px]"
            >
              <HugeiconsIcon icon={FolderOpenIcon} size={12} strokeWidth={2} />
              {t("settings.models.configFile.open")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void reload()}
              className="h-7 gap-1.5 px-2.5 text-[11px]"
            >
              <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
              {t("settings.models.configFile.reload")}
            </Button>
          </span>
        </div>
        <div className="flex flex-col gap-1 text-[10.5px] leading-relaxed text-muted-foreground">
          <p>{t("settings.models.configFile.info")}</p>
          <p>{t("settings.models.configFile.reloadInfo")}</p>
          <p>{t("settings.models.configFile.openInfo")}</p>
          {openError ? (
            <p className="text-destructive">
              {t("settings.models.configFile.openFailed", { error: openError })}
            </p>
          ) : null}
        </div>
        {warnings.length > 0 ? (
          <div className="flex flex-col gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
            {warnings.map((warning) => (
              <span
                key={warning}
                className="text-[10.5px] text-amber-600 dark:text-amber-400"
              >
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

      <div data-setting-id="models.providers" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>{t("settings.models.providers.label")}</Label>
          <DropdownMenu open={addOpen} onOpenChange={setAddOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2.5 text-[11px]"
              >
                <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
                {t("settings.models.providers.add")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-60 p-1">
              <DropdownMenuLabel className="px-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                {t("settings.models.providers.domesticGroup")}
              </DropdownMenuLabel>
              {catalog.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onSelect={() => void addProvider(template)}
                  className="flex items-center gap-2 text-[12px]"
                >
                  <ProviderIcon
                    provider={template.id}
                    icon={template.icon}
                    size={13}
                  />
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
                <span>{t("settings.models.providers.custom")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {config.providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 px-4 py-8 text-center">
            <p className="text-[12px] text-muted-foreground">
              {t("settings.models.providers.emptyTitle")}
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground/70">
              {t("settings.models.providers.emptyHint")}
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
  const { t } = useTranslation();
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
        message: t("settings.models.provider.fetchedCount", {
          count: models.length,
        }),
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
              {t("settings.models.provider.configured")}
            </Badge>
          ) : null}
        </button>
        {provider.consoleUrl ? (
          <button
            type="button"
            onClick={() => void openUrl(provider.consoleUrl as string)}
            className="inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("settings.models.provider.console")}
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
          title={t("settings.models.provider.remove")}
          className="size-7 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
        </Button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-2.5 border-t border-border/40 px-3 py-2.5">
          <FieldRow
            label={t("settings.models.provider.baseUrl.label")}
            info={t("settings.models.provider.baseUrl.info")}
          >
            <div className="flex flex-1 gap-1.5">
              <Input
                value={baseURLDraft}
                onChange={(e) => setBaseURLDraft(e.target.value)}
                onBlur={() => {
                  const value = baseURLDraft.trim();
                  if (value !== provider.baseURL)
                    void onUpdate({ baseURL: value });
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
                {t("settings.models.provider.test")}
                <InfoHint
                  text={t("settings.models.provider.testInfo")}
                  nested
                />
              </Button>
            </div>
          </FieldRow>

          {providerSupportsKey(provider) ? (
            <FieldRow
              label={t("settings.models.provider.apiKey.label")}
              info={t("settings.models.provider.apiKey.info")}
            >
              {apiKey ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {`${apiKey.slice(0, 4)}${"•".repeat(8)}${apiKey.slice(-4)}`}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void onClearKey()}
                    title={t("settings.models.provider.apiKey.remove")}
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
                        ? t(
                            "settings.models.provider.apiKey.placeholderRequired",
                          )
                        : t(
                            "settings.models.provider.apiKey.placeholderOptional",
                          )
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
                    {t("settings.models.provider.apiKey.save")}
                  </Button>
                </div>
              )}
            </FieldRow>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Label>
                {t("settings.models.provider.modelsLabel", {
                  count: provider.models.length,
                })}
              </Label>
              <InfoHint text={t("settings.models.provider.modelsInfo")} />
            </span>
            <span className="flex items-center gap-1.5">
              {provider.modelsApi ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchModels()}
                  disabled={fetching || !provider.baseURL.trim()}
                  className="h-7 gap-1.5 px-2.5 text-[11px]"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
                  {t("settings.models.provider.fetchModels")}
                  <InfoHint
                    text={t("settings.models.provider.fetchModelsInfo")}
                    nested
                  />
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdding((v) => !v)}
                className="h-7 gap-1.5 px-2.5 text-[11px]"
              >
                <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
                {t("settings.models.provider.addModel")}
              </Button>
            </span>
          </div>

          {!provider.modelsApi ? (
            <p className="text-[10.5px] text-muted-foreground">
              {t("settings.models.provider.noModelsApi")}
            </p>
          ) : null}

          <StatusLine test={test} />

          {fetched && fetched.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/20 p-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("settings.models.provider.fetchedLabel")}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFetched(null)}
                  className="h-6 px-2 text-[10.5px]"
                >
                  {t("settings.models.provider.dismiss")}
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
                        {exists
                          ? t("settings.models.provider.added")
                          : t("settings.models.provider.add")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {provider.models.length === 0 && !adding ? (
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              {t("settings.models.provider.noModelsYet")}
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
              title={t("settings.models.modelEditor.newTitle")}
              initial={defaultModelFor("", provider)}
              onCancel={() => setAdding(false)}
              onSave={async (model) => {
                await onAddModel(model);
                setAdding(false);
              }}
            />
          ) : null}

          <div className="mt-1 flex items-center gap-1.5 self-start">
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon
                icon={ChevronDown}
                size={11}
                strokeWidth={2}
                className={cn(
                  "transition-transform",
                  !advanced && "-rotate-90",
                )}
              />
              {t("settings.models.provider.advancedToggle")}
              <InfoHint
                text={t("settings.models.provider.advancedInfo")}
                nested
              />
            </button>
          </div>
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
    params: [],
    effort: null,
    extra: {},
    tags: provider.effort ? ["reasoning"] : [],
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
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const levels = effortLevels(provider, model);

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
          {model.inputTokens.toLocaleString(currentLocale())} in /{" "}
          {model.outputTokens.toLocaleString(currentLocale())} out
        </span>
        {levels.length > 0 ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 border-border/60 bg-muted/40 px-1.5 text-[9.5px] font-normal text-muted-foreground"
          >
            {t("settings.models.modelRow.levels", { count: levels.length })}
          </Badge>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          title={t("settings.models.modelRow.edit")}
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={Edit02Icon} size={11} strokeWidth={1.75} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          title={t("settings.models.modelRow.remove")}
          className="size-6 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={1.75} />
        </Button>
      </div>
      {editing ? (
        <div className="border-t border-border/40 p-2">
          <ModelEditor
            title={t("settings.models.modelEditor.editTitle")}
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
  const { t } = useTranslation();
  const [id, setId] = useState(initial.id);
  const [label, setLabel] = useState(initial.label);
  const [inputTokens, setInputTokens] = useState(String(initial.inputTokens));
  const [outputTokens, setOutputTokens] = useState(
    String(initial.outputTokens),
  );
  const [temperature, setTemperature] = useState(initial.supportsTemperature);
  const [autocomplete, setAutocomplete] = useState(
    initial.supportsAutocomplete,
  );
  const [systemPrompt, setSystemPrompt] = useState<
    SystemPromptKind | "inherit"
  >(initial.systemPrompt ?? "inherit");
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [paramsText, setParamsText] = useState(
    initial.params.length > 0 ? stringify(initial.params) : "",
  );
  const [effortText, setEffortText] = useState(
    initial.effort ? stringify(initial.effort) : "",
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
      setError(t("settings.models.modelEditor.errorIdRequired"));
      return;
    }
    const input = parseInt(inputTokens, 10);
    const output = parseInt(outputTokens, 10);
    if (!Number.isFinite(input) || input < 1_000) {
      setError(t("settings.models.modelEditor.errorInput"));
      return;
    }
    if (!Number.isFinite(output) || output < 1) {
      setError(t("settings.models.modelEditor.errorOutput"));
      return;
    }
    const params = parseJson<ParamDef[]>(paramsText);
    if (params.error) {
      setError(
        t("settings.models.modelEditor.errorParamsJson", {
          error: params.error,
        }),
      );
      return;
    }
    const paramsError = validateParamKeys(params.value);
    if (paramsError) {
      setError(paramsError);
      return;
    }
    const effort = parseJson<EffortConfig | null>(effortText);
    if (effort.error) {
      setError(
        t("settings.models.modelEditor.errorEffortJson", {
          error: effort.error,
        }),
      );
      return;
    }
    const effortError = validateEffortConfig(effort.value);
    if (effortError) {
      setError(effortError);
      return;
    }
    const extra = parseJson<JsonObject>(extraText);
    if (extra.error) {
      setError(
        t("settings.models.modelEditor.errorExtraJson", {
          error: extra.error,
        }),
      );
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
        ...(systemPrompt === "inherit" ? {} : { systemPrompt }),
        params: params.value ?? [],
        effort: effort.value ?? null,
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
      <FieldRow
        label={t("settings.models.modelEditor.modelId.label")}
        info={t("settings.models.modelEditor.modelId.info")}
      >
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="glm-5.3, deepseek-chat, qwen3-max, ep-xxxx…"
          spellCheck={false}
          className="h-8 font-mono text-[11.5px]"
        />
      </FieldRow>
      <FieldRow
        label={t("settings.models.modelEditor.label.label")}
        info={t("settings.models.modelEditor.label.info")}
      >
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("settings.models.modelEditor.label.placeholder")}
          spellCheck={false}
          className="h-8 text-[11.5px]"
        />
      </FieldRow>
      <FieldRow
        label={t("settings.models.modelEditor.input.label")}
        info={t("settings.models.modelEditor.input.info")}
      >
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            value={inputTokens}
            onChange={(e) => setInputTokens(e.target.value)}
            placeholder="128000"
            spellCheck={false}
            className="h-8 w-32 font-mono text-[11.5px]"
          />
          <span className="text-[10.5px] text-muted-foreground">
            {t("settings.models.modelEditor.input.unit")}
          </span>
        </div>
      </FieldRow>
      <FieldRow
        label={t("settings.models.modelEditor.output.label")}
        info={t("settings.models.modelEditor.output.info")}
      >
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            value={outputTokens}
            onChange={(e) => setOutputTokens(e.target.value)}
            placeholder="4096"
            spellCheck={false}
            className="h-8 w-32 font-mono text-[11.5px]"
          />
          <span className="text-[10.5px] text-muted-foreground">
            {t("settings.models.modelEditor.output.unit")}
          </span>
        </div>
      </FieldRow>
      <FieldRow
        label={t("settings.models.modelEditor.sampling.label")}
        info={t("settings.models.modelEditor.sampling.info")}
      >
        <div className="flex flex-1 items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Switch checked={temperature} onCheckedChange={setTemperature} />
            temperature
            <InfoHint
              text={t("settings.models.modelEditor.sampling.temperatureInfo")}
            />
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Switch checked={autocomplete} onCheckedChange={setAutocomplete} />
            autocomplete
            <InfoHint
              text={t("settings.models.modelEditor.sampling.autocompleteInfo")}
            />
          </span>
          <span className="flex items-center gap-1">
            <Select
              value={systemPrompt}
              onValueChange={(v) =>
                setSystemPrompt(v as SystemPromptKind | "inherit")
              }
            >
              <SelectTrigger className="h-7 w-32 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">
                  {t("settings.models.modelEditor.sampling.promptInherit")}
                </SelectItem>
                <SelectItem value="full">full prompt</SelectItem>
                <SelectItem value="lite">lite prompt</SelectItem>
                <SelectItem value="custom">
                  {t("settings.models.modelEditor.sampling.promptCustom")}
                </SelectItem>
              </SelectContent>
            </Select>
            <InfoHint
              text={t("settings.models.modelEditor.sampling.promptInfo")}
            />
          </span>
        </div>
      </FieldRow>
      <FieldRow
        label={t("settings.models.modelEditor.tags.label")}
        info={t("settings.models.modelEditor.tags.info")}
      >
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="reasoning, lite"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <div className="flex flex-col gap-4 pt-1">
        <StructuredJsonField
          label={t("settings.models.modelEditor.params.label")}
          info={t("settings.models.modelEditor.params.info")}
          valueText={paramsText}
          onChangeText={setParamsText}
          parse={parseParamsArray}
          emptyValue={[] as ParamDef[]}
          renderForm={(value, onChange) => (
            <ParamsForm value={value} onChange={onChange} />
          )}
          placeholder={`[
  {
    "key": "reasoning_effort",
    "location": "body",
    "path": "reasoning_effort",
    "type": "string",
    "enabled": true,
    "map": {
      "low": "low",
      "medium": "high",
      "xhigh": "max"
    }
  }
]`}
        />
        <StructuredJsonField
          label={t("settings.models.modelEditor.effort.label")}
          info={t("settings.models.modelEditor.effort.info")}
          valueText={effortText}
          onChangeText={setEffortText}
          parse={parseEffort}
          emptyValue={null as EffortConfig | null}
          renderForm={(value, onChange) => (
            <EffortForm value={value} onChange={onChange} />
          )}
          placeholder={`{
  "path": "reasoning_effort",
  "default": "high",
  "offLabel": "关闭",
  "levels": [
    { "id": "off", "label": "关闭", "value": null },
    { "id": "high", "label": "高", "value": "high" }
  ]
}`}
        />
        <StructuredJsonField
          label={t("settings.models.modelEditor.extra.label")}
          info={t("settings.models.modelEditor.extra.info")}
          valueText={extraText}
          onChangeText={setExtraText}
          parse={parseExtra}
          emptyValue={{} as JsonObject}
          renderForm={(value, onChange) => (
            <ExtraForm value={value} onChange={onChange} />
          )}
          placeholder={`{
  "stream_options": {
    "include_usage": true
  }
}`}
        />
      </div>
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
          {t("settings.models.modelEditor.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={saving}
          className="h-7 px-3 text-[11px]"
        >
          {saving
            ? t("settings.models.modelEditor.saving")
            : t("settings.models.modelEditor.save")}
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
  const { t } = useTranslation();
  const [label, setLabel] = useState(provider.label);
  const [protocol, setProtocol] = useState(provider.protocol);
  const [authMode, setAuthMode] = useState(provider.auth.mode);
  const [authHeader, setAuthHeader] = useState(provider.auth.header ?? "");
  const [authRequired, setAuthRequired] = useState(provider.auth.required);
  const [keyringAccount, setKeyringAccount] = useState(provider.keyringAccount);
  const [consoleUrl, setConsoleUrl] = useState(provider.consoleUrl ?? "");
  const [icon, setIcon] = useState(provider.icon);
  const [systemPrompt, setSystemPrompt] = useState<
    SystemPromptKind | "inherit"
  >(provider.systemPrompt ?? "inherit");
  const [paramsText, setParamsText] = useState(
    provider.params.length > 0 ? stringify(provider.params) : "",
  );
  const [effortText, setEffortText] = useState(
    provider.effort ? stringify(provider.effort) : "",
  );
  const [headersText, setHeadersText] = useState(
    Object.keys(provider.headers).length > 0 ? stringify(provider.headers) : "",
  );
  const [apiText, setApiText] = useState(
    provider.modelsApi ? stringify(provider.modelsApi) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    const params = parseJson<ParamDef[]>(paramsText);
    const effort = parseJson<EffortConfig | null>(effortText);
    const headers = parseJson<Record<string, string>>(headersText);
    const api = parseJson<ProviderEntry["modelsApi"]>(apiText);
    const failure =
      params.error ?? effort.error ?? headers.error ?? api.error;
    if (failure) {
      setError(t("settings.models.advanced.errorJson", { error: failure }));
      return;
    }
    const paramsError = validateParamKeys(params.value);
    if (paramsError) {
      setError(paramsError);
      return;
    }
    const effortError = validateEffortConfig(effort.value);
    if (effortError) {
      setError(effortError);
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
        systemPrompt: systemPrompt === "inherit" ? undefined : systemPrompt,
        params: params.value ?? [],
        effort: effort.value ?? null,
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
      <FieldRow
        label={t("settings.models.advanced.label.label")}
        info={t("settings.models.advanced.label.info")}
      >
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 text-[11.5px]"
        />
      </FieldRow>
      <FieldRow
        label={t("settings.models.advanced.protocol.label")}
        info={t("settings.models.advanced.protocol.info")}
      >
        <Select
          value={protocol}
          onValueChange={(v) => setProtocol(v as ProviderEntry["protocol"])}
        >
          <SelectTrigger className="h-8 w-52 text-[11.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai-compatible">
              {t("settings.models.advanced.protocol.openaiCompatible")}
            </SelectItem>
            <SelectItem value="anthropic">anthropic</SelectItem>
            <SelectItem value="google">google</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow
        label={t("settings.models.advanced.auth.label")}
        info={t("settings.models.advanced.auth.info")}
      >
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
      <FieldRow
        label={t("settings.models.advanced.keyring.label")}
        info={t("settings.models.advanced.keyring.info")}
      >
        <Input
          value={keyringAccount}
          onChange={(e) => setKeyringAccount(e.target.value)}
          placeholder="provider-api-key"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <FieldRow
        label={t("settings.models.advanced.console.label")}
        info={t("settings.models.advanced.console.info")}
      >
        <Input
          value={consoleUrl}
          onChange={(e) => setConsoleUrl(e.target.value)}
          placeholder="https://console.example.com/api-keys"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <FieldRow
        label={t("settings.models.advanced.icon.label")}
        info={t("settings.models.advanced.icon.info")}
      >
        <Input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="brain / cpu / globe / flash / server / plug"
          spellCheck={false}
          className="h-8 font-mono text-[11px]"
        />
      </FieldRow>
      <FieldRow
        label={t("settings.models.advanced.systemPrompt.label")}
        info={t("settings.models.advanced.systemPrompt.info")}
      >
        <Select
          value={systemPrompt}
          onValueChange={(v) =>
            setSystemPrompt(v as SystemPromptKind | "inherit")
          }
        >
          <SelectTrigger className="h-8 w-44 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">
              {t("settings.models.advanced.systemPrompt.inherit")}
            </SelectItem>
            <SelectItem value="full">full prompt</SelectItem>
            <SelectItem value="lite">lite prompt</SelectItem>
            <SelectItem value="custom">
              {t("settings.models.advanced.systemPrompt.custom")}
            </SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <div className="flex flex-col gap-4 pt-1">
        <StructuredJsonField
          label={t("settings.models.advanced.params.label")}
          info={t("settings.models.advanced.params.info")}
          valueText={paramsText}
          onChangeText={setParamsText}
          parse={parseParamsArray}
          emptyValue={[] as ParamDef[]}
          renderForm={(value, onChange) => (
            <ParamsForm value={value} onChange={onChange} />
          )}
          placeholder={`[
  {
    "key": "frequency_penalty",
    "label": "频率惩罚",
    "value": 0.5,
    "enabled": true
  }
]`}
        />
        <StructuredJsonField
          label={t("settings.models.advanced.effort.label")}
          info={t("settings.models.advanced.effort.info")}
          valueText={effortText}
          onChangeText={setEffortText}
          parse={parseEffort}
          emptyValue={null as EffortConfig | null}
          renderForm={(value, onChange) => (
            <EffortForm value={value} onChange={onChange} />
          )}
          placeholder={`{
  "path": "reasoning_effort",
  "default": "high",
  "offLabel": "关闭",
  "levels": [
    { "id": "off", "label": "关闭", "value": null },
    { "id": "high", "label": "高", "value": "high" }
  ]
}`}
        />
        <StructuredJsonField
          label={t("settings.models.advanced.headers.label")}
          info={t("settings.models.advanced.headers.info")}
          valueText={headersText}
          onChangeText={setHeadersText}
          parse={parseHeaders}
          emptyValue={{} as Record<string, string>}
          renderForm={(value, onChange) => (
            <HeadersForm value={value} onChange={onChange} />
          )}
          placeholder={`{
  "HTTP-Referer": "https://terax.ai",
  "X-Title": "Terax"
}`}
        />
        <StructuredJsonField
          label={t("settings.models.advanced.modelsApi.label")}
          info={t("settings.models.advanced.modelsApi.info")}
          valueText={apiText}
          onChangeText={setApiText}
          parse={parseModelsApi}
          emptyValue={null}
          renderForm={(value, onChange) => (
            <ModelsApiForm value={value} onChange={onChange} />
          )}
          placeholder={`{
  "path": "/models",
  "itemsPath": "data",
  "idPath": "id",
  "labelPath": "name"
}`}
        />
      </div>
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
          {saving
            ? t("settings.models.advanced.saving")
            : t("settings.models.advanced.save")}
        </Button>
      </div>
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
  const { t } = useTranslation();
  const models = providers.flatMap((p) =>
    p.models.map((m) => ({ provider: p, model: m })),
  );
  const current = models.find(({ model }) => model.id === defaultModelId);

  return (
    <div className="flex flex-col gap-3">
      <Label>{t("settings.models.defaults.label")}</Label>
      <div data-setting-id="models.defaults" className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <FieldRow
          label={t("settings.models.defaults.chatModel.label")}
          info={t("settings.models.defaults.chatModel.info")}
        >
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
                      (models.length === 0
                        ? t("settings.models.defaults.chatModel.noModels")
                        : t("settings.models.defaults.chatModel.selectModel"))}
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
  const { t } = useTranslation();
  const enabled = usePreferencesStore((s) => s.autocompleteEnabled);
  const trigger = usePreferencesStore((s) => s.autocompleteTrigger);
  const providerId = usePreferencesStore((s) => s.autocompleteProvider);
  const modelId = usePreferencesStore((s) => s.autocompleteModelId);
  const provider = providers.find((p) => p.id === providerId) ?? providers[0];
  const eligible = (provider?.models ?? []).filter(
    (m) => m.supportsAutocomplete,
  );
  const currentModel = eligible.find((m) => m.id === modelId) ?? eligible[0];

  useEffect(() => {
    if (providerId || !provider) return;
    void setAutocompleteProvider(provider.id);
    void setAutocompleteModelId(eligible[0]?.id ?? "");
  }, [providerId, provider, eligible]);

  return (
    <>
      <FieldRow
        label={t("settings.models.defaults.autocomplete.label")}
        info={t("settings.models.defaults.autocomplete.info")}
      >
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
              <SelectValue
                placeholder={t(
                  "settings.models.defaults.autocomplete.providerPlaceholder",
                )}
              />
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
              <SelectValue
                placeholder={t(
                  "settings.models.defaults.autocomplete.modelPlaceholder",
                )}
              />
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
        <FieldRow
          label={t("settings.models.defaults.trigger.label")}
          info={t("settings.models.defaults.trigger.info")}
        >
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
              <SelectItem value="auto">
                {t("settings.models.defaults.trigger.auto")}
              </SelectItem>
              <SelectItem value="manual">
                {t("settings.models.defaults.trigger.manual")}
              </SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      ) : null}
    </>
  );
}

function StatusLine({ test }: { test: TestState }) {
  const { t } = useTranslation();
  if (test.status === "idle") return null;
  if (test.status === "testing") {
    return (
      <span className="text-[10.5px] text-muted-foreground">
        {t("settings.models.provider.testing")}
      </span>
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
  info,
  children,
}: {
  label: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-20 shrink-0 items-center gap-1 text-[11px] tracking-tight text-muted-foreground">
        <span className="truncate">{label}</span>
        {info ? <InfoHint text={info} /> : null}
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
