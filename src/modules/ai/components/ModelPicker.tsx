import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { ProviderIcon } from "@/components/ProviderIcon";
import { cn } from "@/lib/utils";
import {
  findModel,
  findProvider,
  providerNeedsKey,
  thinkingLevelIndex,
  thinkingLevels,
  toModelInfo,
  useAiConfigStore,
  type ModelInfo,
} from "@/modules/ai/config";
import { openSettingsWindow } from "@/modules/settings/openSettingsWindow";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setThinkingLevel } from "@/modules/settings/store";
import {
  AiBookIcon,
  ArrowDown01Icon,
  BrainIcon,
  Clock01Icon,
  FavouriteIcon,
  Search01Icon,
  Settings01Icon,
  StarIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toggleFavoriteModel } from "../lib/modelPrefs";
import { useChatStore } from "../store/chatStore";

type Tab = "all" | "favorites" | "recent";

export function ModelPicker({
  onSelectModel,
}: {
  onSelectModel?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const selected = useChatStore((s) => s.selectedModelId);
  const apiKeys = useChatStore((s) => s.apiKeys);
  const setSelected = useChatStore((s) => s.setSelectedModelId);
  const favoriteIds = usePreferencesStore((s) => s.favoriteModelIds);
  const recentIds = usePreferencesStore((s) => s.recentModelIds);
  const thinkingByModel = usePreferencesStore((s) => s.thinkingLevelByModel);
  const config = useAiConfigStore((s) => s.config);
  const current = findModel(selected);
  const [search, setSearch] = useState("");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const providersWithModels = useMemo(
    () => config.providers.filter((p) => p.models.length > 0),
    [config],
  );

  const allModels = useMemo(
    () =>
      config.providers.flatMap((p) => p.models.map((m) => toModelInfo(p, m))),
    [config],
  );

  const hasKeyFor = (providerId: string) => {
    const provider = config.providers.find((p) => p.id === providerId);
    if (!provider) return false;
    return !providerNeedsKey(provider) || !!apiKeys[provider.id];
  };

  const currentProviderHasKey = current ? hasKeyFor(current.provider) : false;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let pool: readonly ModelInfo[] = allModels;
    if (tab === "favorites") {
      pool = pool.filter((m) => favoriteIds.includes(m.id));
    } else if (tab === "recent") {
      const order = new Map(recentIds.map((id, i) => [id, i]));
      pool = pool
        .filter((m) => order.has(m.id))
        .slice()
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    if (activeProvider !== null) {
      pool = pool.filter((m) => m.provider === activeProvider);
    }
    if (q) {
      pool = pool.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.providerLabel.toLowerCase().includes(q) ||
          m.provider.includes(q),
      );
    }
    return pool;
  }, [activeProvider, allModels, favoriteIds, recentIds, search, tab]);

  const levels = current
    ? thinkingLevels(current.providerEntry, current.model)
    : [];
  const levelIndex = current
    ? thinkingLevelIndex(
        current.providerEntry,
        current.model,
        thinkingByModel[selected] ?? null,
      )
    : -1;
  const activeLevel = levelIndex >= 0 ? levels[levelIndex] : null;
  const offLabel =
    current?.model.thinking?.offLabel ??
    current?.providerEntry.thinking?.offLabel ??
    t("ai.modelPicker.thinkingOff");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-5.5 gap-1 rounded-md px-1.5 my-1 text-xs hover:bg-accent hover:text-foreground",
            currentProviderHasKey
              ? "text-muted-foreground"
              : "text-amber-600 dark:text-amber-400",
          )}
          title={
            !current
              ? t("ai.modelPicker.noModelConfigured")
              : currentProviderHasKey
                ? t("ai.modelPicker.modelTitle", { label: current.label })
                : t("ai.modelPicker.noKeyConfigured", {
                    label: current.label,
                  })
          }
        >
          <span className="max-w-28 truncate">
            {current?.label ?? t("ai.modelPicker.selectModel")}
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
        align="end"
        className="w-[min(28rem,calc(100vw-1rem))] p-0 overflow-hidden rounded-xl border border-border/70 shadow-xl"
        onFocusCapture={(e) => {
          if (e.target !== inputRef.current) inputRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-border/70 px-3 py-2.5">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            strokeWidth={1.75}
            className="shrink-0 text-muted-foreground/70"
          />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={t("ai.modelPicker.searchPlaceholder")}
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex items-center gap-0.5 border-b border-border/70 px-2 py-1.5">
          <TabButton
            label={t("ai.modelPicker.tabAll")}
            icon={AiBookIcon}
            active={tab === "all"}
            onClick={() => setTab("all")}
          />
          <TabButton
            label={t("ai.modelPicker.tabFavorites")}
            icon={FavouriteIcon}
            active={tab === "favorites"}
            onClick={() => setTab("favorites")}
            count={favoriteIds.length || undefined}
          />
          <TabButton
            label={t("ai.modelPicker.tabRecent")}
            icon={Clock01Icon}
            active={tab === "recent"}
            onClick={() => setTab("recent")}
            count={recentIds.length || undefined}
          />
        </div>

        <div className="flex max-h-104 min-h-0">
          <div className="flex w-11 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border/70 bg-muted/20 py-1.5">
            <ProviderPill
              icon={AiBookIcon}
              title={t("ai.modelPicker.allProviders")}
              active={activeProvider === null}
              onClick={() => setActiveProvider(null)}
            />
            {providersWithModels.map((p) => {
              const connected = hasKeyFor(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  title={
                    connected
                      ? p.label
                      : t("ai.modelPicker.providerNotConfigured", {
                          label: p.label,
                        })
                  }
                  onClick={() => setActiveProvider(p.id)}
                  className={cn(
                    "relative mx-auto flex size-8 items-center justify-center rounded-md transition-colors",
                    activeProvider === p.id
                      ? "bg-accent text-foreground after:absolute after:right-0 after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-full after:bg-primary after:content-['']"
                      : connected
                        ? "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                        : "text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <ProviderIcon provider={p.id} size={16} />
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {activeProvider !== null && findProvider(activeProvider) ? (
              <div className="flex items-center gap-1.5 px-3 pt-1 pb-1.5 text-[11px] font-medium tracking-tight text-muted-foreground/90">
                <ProviderIcon provider={activeProvider} size={13} />
                <span>{findProvider(activeProvider)?.label}</span>
              </div>
            ) : null}
            {activeProvider !== null && !hasKeyFor(activeProvider) ? (
              <ProviderConfigureCTA providerId={activeProvider} />
            ) : null}
            {allModels.length === 0 ? (
              <button
                type="button"
                onClick={() => void openSettingsWindow("models")}
                className="group mx-2 my-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={13}
                  strokeWidth={1.75}
                />
                <span className="flex-1">
                  {t("ai.modelPicker.noModelsYet")}
                </span>
              </button>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-10 text-xs text-muted-foreground/70">
                {tab === "favorites"
                  ? t("ai.modelPicker.noFavorites")
                  : tab === "recent"
                    ? t("ai.modelPicker.noRecent")
                    : t("ai.modelPicker.noMatch")}
              </div>
            ) : (
              filtered.map((m) => (
                <ModelRow
                  key={m.id}
                  model={m}
                  selected={m.id === selected}
                  hasKey={hasKeyFor(m.provider)}
                  favorite={favoriteIds.includes(m.id)}
                  showProviderIcon={activeProvider === null}
                  onPick={() => {
                    if (!hasKeyFor(m.provider)) {
                      void openSettingsWindow("models");
                      return;
                    }
                    (onSelectModel ?? setSelected)(m.id);
                  }}
                  onToggleFavorite={() => void toggleFavoriteModel(m.id)}
                />
              ))
            )}
          </div>
        </div>

        {current && levels.length > 1 ? (
          <div className="border-t border-border/70 bg-muted/10 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={BrainIcon} size={12} strokeWidth={1.75} />
                {t("ai.modelPicker.thinkingLevel")}
              </span>
              <span className="text-[11px] font-medium text-foreground">
                {activeLevel?.label ?? offLabel}
              </span>
            </div>
            <Slider
              min={0}
              max={levels.length - 1}
              step={1}
              value={[Math.max(0, levelIndex)]}
              onValueChange={(values) => {
                const next = levels[values[0]];
                if (next) void setThinkingLevel(selected, next.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="py-1"
            />
            <div className="mt-0.5 flex justify-between text-[9.5px] text-muted-foreground/70">
              {levels.map((level, index) => (
                <span
                  key={level.id}
                  className={cn(index === levelIndex && "text-foreground")}
                >
                  {level.label}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[9.5px] leading-relaxed text-muted-foreground/60">
              {t("ai.modelPicker.thinkingHint")}
            </p>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TabButton({
  label,
  icon,
  active,
  count,
  onClick,
}: {
  label: string;
  icon: typeof AiBookIcon;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <HugeiconsIcon icon={icon} size={12} strokeWidth={1.75} />
      {label}
      {count != null ? (
        <span className="rounded-full bg-muted/60 px-1.5 text-[9.5px] tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ProviderPill({
  icon,
  title,
  active,
  onClick,
}: {
  icon: typeof AiBookIcon;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "relative mx-auto flex size-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-accent text-foreground after:absolute after:right-0 after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-full after:bg-primary after:content-['']"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <HugeiconsIcon icon={icon} size={16} strokeWidth={1.5} />
    </button>
  );
}

function ProviderConfigureCTA({ providerId }: { providerId: string }) {
  const { t } = useTranslation();
  const p = findProvider(providerId);
  if (!p) return null;
  return (
    <button
      type="button"
      onClick={() => void openSettingsWindow("models")}
      className="group mx-2 mb-1 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground"
    >
      <HugeiconsIcon icon={Settings01Icon} size={13} strokeWidth={1.75} />
      <span className="flex-1 truncate">
        {t("ai.modelPicker.configureProvider", { provider: p.label })}
      </span>
      <span className="shrink-0 text-[10px] underline-offset-2 group-hover:underline">
        {t("ai.modelPicker.open")}
      </span>
    </button>
  );
}

function ModelRow({
  model,
  selected,
  hasKey,
  favorite,
  showProviderIcon,
  onPick,
  onToggleFavorite,
}: {
  model: ModelInfo;
  selected: boolean;
  hasKey: boolean;
  favorite: boolean;
  showProviderIcon: boolean;
  onPick: () => void;
  onToggleFavorite: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onPick();
      }}
      className={cn(
        "group mx-1 my-0.5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5",
        selected ? "bg-accent/60 text-foreground" : "text-foreground/85",
        !hasKey && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
        title={
          favorite
            ? t("ai.modelPicker.unfavorite")
            : t("ai.modelPicker.favorite")
        }
        className={cn(
          "shrink-0 rounded p-0.5 transition-colors",
          favorite
            ? "text-amber-500"
            : "text-muted-foreground/40 hover:text-amber-500",
        )}
      >
        <HugeiconsIcon
          icon={StarIcon}
          size={12}
          strokeWidth={favorite ? 2 : 1.75}
          className={favorite ? "fill-amber-500" : ""}
        />
      </button>

      {showProviderIcon ? (
        <ProviderIcon
          provider={model.provider}
          size={13}
          className="shrink-0 text-muted-foreground/70"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="shrink-0 text-[12px] font-medium leading-none">
          {model.label}
        </span>
        <span className="truncate font-mono text-[10.5px] leading-none text-muted-foreground">
          {model.id}
        </span>
      </div>

      {selected ? (
        <HugeiconsIcon
          icon={Tick01Icon}
          size={13}
          strokeWidth={2}
          className="shrink-0 text-foreground"
        />
      ) : null}
    </DropdownMenuItem>
  );
}
