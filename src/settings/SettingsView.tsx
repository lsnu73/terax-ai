import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettingsTab } from "@/modules/settings/openSettings";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  AiScanIcon,
  InformationCircleIcon,
  KeyboardIcon,
  PaintBoardIcon,
  Settings01Icon,
  SourceCodeIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AboutSection } from "./sections/AboutSection";
import { AgentsSection } from "./sections/AgentsSection";
import { EditorSection } from "./sections/EditorSection";
import { GeneralSection } from "./sections/GeneralSection";
import { ModelsSection } from "./sections/ModelsSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { ThemesSection } from "./sections/ThemesSection";

const TABS: {
  id: SettingsTab;
  labelKey: string;
  icon: typeof Settings01Icon;
  component: () => JSX.Element;
}[] = [
  {
    id: "general",
    labelKey: "settings.tabs.general",
    icon: Settings01Icon,
    component: GeneralSection,
  },
  {
    id: "editor",
    labelKey: "settings.tabs.editor",
    icon: SourceCodeIcon,
    component: EditorSection,
  },
  {
    id: "themes",
    labelKey: "settings.tabs.themes",
    icon: PaintBoardIcon,
    component: ThemesSection,
  },
  {
    id: "shortcuts",
    labelKey: "settings.tabs.shortcuts",
    icon: KeyboardIcon,
    component: ShortcutsSection,
  },
  {
    id: "models",
    labelKey: "settings.tabs.models",
    icon: AiScanIcon,
    component: ModelsSection,
  },
  {
    id: "agents",
    labelKey: "settings.tabs.agents",
    icon: UserMultiple02Icon,
    component: AgentsSection,
  },
  {
    id: "about",
    labelKey: "settings.tabs.about",
    icon: InformationCircleIcon,
    component: AboutSection,
  },
];

/**
 * 设置页主窗口 tab 内嵌视图。`section` 由打开方指定（openSettings("models")），
 * 面板内部的分区切换通过 `onSectionChange` 同步回 tab 状态。
 */
export function SettingsView({
  section,
  onSectionChange,
}: {
  section: SettingsTab;
  onSectionChange?: (section: SettingsTab) => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SettingsTab>(section);
  const init = usePreferencesStore((s) => s.init);
  const ActiveSection = TABS.find((t) => t.id === active)?.component;

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    setActive(section);
  }, [section]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground select-none">
      <header className="flex h-11 shrink-0 items-center border-b border-border/60 bg-card/60 pl-3">
        <Tabs
          value={active}
          onValueChange={(v) => {
            const next = v as SettingsTab;
            setActive(next);
            onSectionChange?.(next);
          }}
          orientation="horizontal"
          className="flex-1 items-center"
        >
          <TabsList className="mx-auto h-7 bg-muted/40 px-2">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-6 gap-1.5 px-2.5 text-[11.5px]"
              >
                <HugeiconsIcon icon={tab.icon} size={12} strokeWidth={1.75} />
                <span>{t(tab.labelKey)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-8 pt-6 pb-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto w-full">
          {ActiveSection && <ActiveSection />}
        </div>
      </main>
    </div>
  );
}
