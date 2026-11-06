import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SETTING_SEARCH_ITEMS,
  type SettingSearchItem,
} from "../settingsSearch";
import { registerSettingsSearchFocus } from "../settingsSearchFocus";

export function SettingsSearch({
  onSelect,
}: {
  onSelect: (item: SettingSearchItem) => void;
}) {
  const { t } = useTranslation();
  const preferences = usePreferencesStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Ctrl+F belongs to this box while the settings page is open.
  useEffect(
    () =>
      registerSettingsSearchFocus(() => {
        const input = rootRef.current?.querySelector<HTMLInputElement>(
          '[data-slot="command-input"]',
        );
        input?.focus();
        input?.select();
      }),
    [],
  );

  const resultGroups = useMemo(() => {
    const groups = new Map<SettingSearchItem["section"], SettingSearchItem[]>();
    if (normalizedQuery) {
      for (const item of SETTING_SEARCH_ITEMS) {
        if (item.isVisible && !item.isVisible(preferences)) continue;
        const section = t(`settings.tabs.${item.section}`);
        const group = item.groupKey ? t(item.groupKey) : "";
        const description = item.descriptionKey ? t(item.descriptionKey) : "";
        const haystack = [
          t(item.titleKey),
          description,
          group,
          section,
          ...(item.keywords ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) continue;
        const items = groups.get(item.section);
        if (items) items.push(item);
        else groups.set(item.section, [item]);
      }
    }
    return [...groups];
  }, [normalizedQuery, preferences, t]);

  return (
    <div ref={rootRef} className="relative">
      <Command
        shouldFilter={false}
        className="h-auto overflow-visible rounded-lg bg-transparent p-0"
      >
        <CommandInput
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "ArrowDown" && query.trim()) {
              setOpen(true);
            }
          }}
          placeholder={t("settings.search.placeholder")}
          aria-label={t("settings.search.ariaLabel")}
          className="text-[12px]"
        />
        {open && normalizedQuery ? (
          <div className="absolute left-0 top-full z-50 w-max min-w-full max-w-[min(40rem,calc(100vw-2rem))] pt-1.5">
            <CommandList className="max-h-80 w-full rounded-lg border border-border/70 bg-popover p-1 shadow-xl">
              <CommandEmpty className="py-5 text-[12px] text-muted-foreground">
                {t("settings.search.noResults")}
              </CommandEmpty>
              {resultGroups.map(([section, items]) => (
                <CommandGroup
                  key={section}
                  className="mb-1.5 rounded-lg border border-border/50 bg-muted/20 p-1 last:mb-0"
                >
                  <div className="mb-1 flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1.5">
                    <span className="h-3 w-0.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-[11px] font-semibold tracking-wide text-foreground">
                      {t(`settings.tabs.${section}`)}
                    </span>
                    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="ml-1.5 border-l border-border/60 pl-1">
                    {items.map((item) => {
                      const title = t(item.titleKey);
                      const group = item.groupKey ? t(item.groupKey) : null;
                      const description = item.descriptionKey
                        ? t(item.descriptionKey)
                        : group;
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          className="flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 [&>svg]:hidden"
                          onSelect={() => {
                            onSelect(item);
                            setQuery("");
                            setOpen(false);
                          }}
                        >
                          <span className="text-[12px] font-medium break-words">
                            {title}
                          </span>
                          {description ? (
                            <span className="text-[10.5px] font-normal text-muted-foreground break-words">
                              {description}
                            </span>
                          ) : null}
                        </CommandItem>
                      );
                    })}
                  </div>
                </CommandGroup>
              ))}
            </CommandList>
          </div>
        ) : null}
      </Command>
    </div>
  );
}
