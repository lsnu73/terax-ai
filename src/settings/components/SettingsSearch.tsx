import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SETTING_SEARCH_ITEMS,
  type SettingSearchItem,
} from "../settingsSearch";

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

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return SETTING_SEARCH_ITEMS.filter((item) => {
      if (item.isVisible && !item.isVisible(preferences)) return false;
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
      return haystack.includes(normalizedQuery);
    });
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
          <div className="absolute inset-x-0 top-full z-50 pt-1.5">
            <CommandList className="max-h-80 rounded-lg border border-border/70 bg-popover p-1 shadow-xl">
              <CommandEmpty className="py-5 text-[12px] text-muted-foreground">
                {t("settings.search.noResults")}
              </CommandEmpty>
              <CommandGroup>
                {results.map((item) => {
                  const title = t(item.titleKey);
                  const description = item.descriptionKey
                    ? t(item.descriptionKey)
                    : null;
                  const group = item.groupKey ? t(item.groupKey) : null;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      className="items-start rounded-md px-2.5 py-2"
                      onSelect={() => {
                        onSelect(item);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[12px] font-medium">{title}</span>
                        <span className="line-clamp-1 text-[10.5px] font-normal text-muted-foreground">
                          {description ?? group ?? t(`settings.tabs.${item.section}`)}
                        </span>
                      </div>
                      <CommandShortcut className="shrink-0 pt-0.5 text-[10px] tracking-normal">
                        {t(`settings.tabs.${item.section}`)}
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </Command>
    </div>
  );
}
