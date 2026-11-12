import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettingsTab } from "@/modules/settings/openSettings";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  AiScanIcon,
  Globe02Icon,
  InformationCircleIcon,
  KeyboardIcon,
  PaintBoardIcon,
  Settings01Icon,
  SourceCodeIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { t as i18nT } from "@/modules/i18n";
import {
  isLeavingModelsSettings,
  settleModelAutosave,
} from "@/settings/modelSettingsAutosave";
import { toast } from "sonner";
import {
  type JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { SettingsSearch } from "./components/SettingsSearch";
import { AboutSection } from "./sections/AboutSection";
import { AgentsSection } from "./sections/AgentsSection";
import { EditorSection } from "./sections/EditorSection";
import { GeneralSection } from "./sections/GeneralSection";
import { ModelsSection } from "./sections/ModelsSection";
import { ProxySection } from "./sections/ProxySection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { ThemesSection } from "./sections/ThemesSection";
import type { SettingSearchItem } from "./settingsSearch";

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
    id: "proxy",
    labelKey: "settings.tabs.proxy",
    icon: Globe02Icon,
    component: ProxySection,
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
  visible,
  onSectionChange,
}: {
  section: SettingsTab;
  visible: boolean;
  onSectionChange?: (section: SettingsTab) => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SettingsTab>(section);
  const [pendingTarget, setPendingTarget] = useState<{
    id: string;
    request: number;
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const targetRequest = useRef(0);
  const activeRef = useRef(active);
  const visibleRef = useRef(visible);
  const previousLocationRef = useRef({ active, visible });
  const leaveNoticeShownRef = useRef(false);
  const init = usePreferencesStore((s) => s.init);
  const ActiveSection = TABS.find((t) => t.id === active)?.component;
  activeRef.current = active;
  visibleRef.current = visible;

  const notifyModelsLeave = useCallback(() => {
    if (activeRef.current !== "models" || leaveNoticeShownRef.current) return;
    leaveNoticeShownRef.current = true;
    void settleModelAutosave().then((saved) => {
      if (saved) {
        toast.success(i18nT("settings.models.autosave.savedOnLeave"), {
          id: "settings-models-autosave",
        });
      } else {
        toast.error(i18nT("settings.models.autosave.failedOnLeave"), {
          id: "settings-models-autosave",
        });
      }
    });
  }, []);

  useEffect(() => {
    const previous = previousLocationRef.current;
    previousLocationRef.current = { active, visible };
    if (
      isLeavingModelsSettings(
        previous.active,
        previous.visible,
        active,
        visible,
      )
    ) {
      notifyModelsLeave();
    } else if (active === "models" && visible) {
      leaveNoticeShownRef.current = false;
    }
  }, [active, visible, notifyModelsLeave]);

  useEffect(
    () => () => {
      if (activeRef.current === "models" && visibleRef.current) {
        notifyModelsLeave();
      }
    },
    [notifyModelsLeave],
  );

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    setActive(section);
  }, [section]);

  useLayoutEffect(() => {
    if (!pendingTarget) return;
    const main = mainRef.current;
    if (!main) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let observer: MutationObserver | undefined;
    const scrollToTarget = () => {
      const target = main.querySelector<HTMLElement>(
        `[data-setting-id="${pendingTarget.id}"]`,
      );
      if (!target) return false;
      observer?.disconnect();
      target.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      if (!reduceMotion) {
        target.animate(
          [
            { boxShadow: "0 0 0 0 transparent" },
            { boxShadow: "0 0 0 2px var(--primary)", offset: 0.2 },
            { boxShadow: "0 0 0 0 transparent" },
          ],
          { duration: 1600, easing: "ease-out" },
        );
      }
      return true;
    };
    if (scrollToTarget()) return;
    main.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    observer = new MutationObserver(scrollToTarget);
    observer.observe(main, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer?.disconnect(), 2000);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
    };
  }, [pendingTarget]);

  const onSearchSelect = (item: SettingSearchItem) => {
    targetRequest.current += 1;
    setPendingTarget({ id: item.targetId, request: targetRequest.current });
    setActive(item.section);
    onSectionChange?.(item.section);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground select-none">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border/60 bg-card/60">
        <div className="relative z-20 shrink-0 p-3">
          <SettingsSearch onSelect={onSearchSelect} />
        </div>
        <Tabs
          value={active}
          onValueChange={(v) => {
            const next = v as SettingsTab;
            setActive(next);
            onSectionChange?.(next);
          }}
          orientation="vertical"
          className="min-h-0 flex-1"
        >
          <TabsList className="w-full items-stretch justify-start gap-1 rounded-none bg-transparent p-2">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-8 gap-2 rounded-md px-3 text-xs"
              >
                <HugeiconsIcon icon={tab.icon} size={14} strokeWidth={1.75} />
                <span>{t(tab.labelKey)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </aside>

      <main
        ref={mainRef}
        className="min-h-0 flex-1 overflow-y-auto px-8 pt-6 pb-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto w-full">
          {ActiveSection && <ActiveSection />}
        </div>
      </main>
    </div>
  );
}
