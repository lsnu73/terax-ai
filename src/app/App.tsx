import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { TooltipProvider } from "@/components/ui/tooltip";
import { consumeLaunchFiles, getLaunchDir } from "@/lib/launchDir";
import { IS_MAC } from "@/lib/platform";
import { quoteShellArg } from "@/lib/shellQuote";
import { usePresence } from "@/lib/usePresence";
import { useZoom } from "@/lib/useZoom";
import { isMarkdownPath } from "@/lib/utils";
import {
  type AgentLaunchRequest,
  AgentNotificationsBridge,
  findAgentLauncher,
  nextAttentionTarget,
  validateAgentLaunchCommand,
} from "@/modules/agents";
import {
  AgentRunBridge,
  LocalAgentNotificationsBridge,
  SelectionAskAi,
  useAiBootstrap,
  useAiLiveBridge,
  useChatStore,
  useSelectionAskAi,
} from "@/modules/ai";
import { runtimeToast } from "@/modules/agents/lib/runtimeNotifications";
import {
  openAiPanel,
  prefillAiPanel,
  toggleAiPanel,
} from "@/modules/ai/lib/aiPanel";
import { AiPanelSkeleton } from "@/modules/ai/components/AiPanelSkeleton";
import { useAiPanelStore } from "@/modules/ai/store/aiPanelStore";
import { native } from "@/modules/ai/lib/native";
import { CommandPalette, createCommandItems } from "@/modules/command-palette";
import { useControlBridge } from "@/modules/control";
import {
  type EditorPaneHandle,
  NewEditorDialog,
  useApplyEditorFontSize,
  useEditorFileSync,
} from "@/modules/editor";
import { aiAttachmentDropTarget } from "@/modules/ai/lib/aiAttachmentDrop";
import { FileExplorer, type FileExplorerHandle } from "@/modules/explorer";
import { combinePathDropTargets } from "@/modules/explorer/lib/useExplorerDnd";
import type { GitHistorySearchHandle } from "@/modules/git-history";
import {
  Header,
  type SearchInlineHandle,
  type SearchTarget,
} from "@/modules/header";
import { t } from "@/modules/i18n";
import { setLspNavigator } from "@/modules/lsp";
import type { PreviewPaneHandle } from "@/modules/preview";
import { useProxyAutoLaunch } from "@/modules/proxy/lib/autoLaunch";
import {
  openSettings,
  registerSettingsOpener,
} from "@/modules/settings/openSettings";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setShowHidden, setPathHistory } from "@/modules/settings/store";
import { recordPathHistory } from "@/modules/terminal/lib/pathHistory";
import { useVisiblePathHistory } from "@/modules/terminal/lib/useVisiblePathHistory";
import { cdTerminalLeafTo } from "@/modules/terminal/lib/terminalCd";
import { PathHistoryDialog } from "@/modules/terminal/path-history/PathHistoryDialog";
import {
  type ShortcutHandlers,
  type ShortcutId,
  shouldDisablePaneSwapShortcut,
  useGlobalShortcuts,
} from "@/modules/shortcuts";
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SidebarRail,
  useSidebarPanel,
} from "@/modules/sidebar";
import {
  SourceControlPanel,
  useRepositoryTargeting,
  useSourceControlContext,
} from "@/modules/source-control";
import {
  SpaceSwitcher,
  useSpacePersistence,
  useSpaces,
  useSpacesBoot,
} from "@/modules/spaces";
import { StatusBar } from "@/modules/statusbar";
import {
  TabSwitcherHud,
  type CloseTabsPlan,
  useTabSwitcher,
  useTabs,
  useWindowTitle,
  useWorkspaceCwd,
} from "@/modules/tabs";
import { DEFAULT_SPACE_ID } from "@/modules/tabs/lib/useTabs";
import {
  clearFocusedTerminal,
  disposeSession,
  findLeafCwd,
  hasLeaf,
  isTerminalSurfaceTarget,
  leafIds,
  type PaneBounds,
  ptyIdForLeaf,
  restartSession,
  type TerminalPaneHandle,
  useAgentActivityStore,
  useTerminalFileDrop,
  whenSessionReady,
  writeToSession,
} from "@/modules/terminal";
import type { TerminalSearchController } from "@/modules/terminal/search/TerminalSearchController";
import { bindTerminalWindowFocus } from "@/modules/terminal/ghostty/renderScheduling";
import { subscribeWindowPresentation } from "@/modules/terminal/ghostty/windowPresentation";
import {
  LivePageResizeBridge,
  ThemeProvider,
  useThemeFileEditing,
  WindowActivityBridge,
  WindowVibrancyBridge,
} from "@/modules/theme";
import { useStartupUpdateCheck } from "@/modules/updater";
import {
  useWorkspaceEnvStore,
  type WorkspaceEnv,
  workspaceScopeKey,
} from "@/modules/workspace";
import { focusSettingsSearch } from "@/settings/settingsSearchFocus";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CloseDialogs } from "./components/CloseDialogs";
import {
  type EdgeValveController,
  WindowEdgeValves,
} from "./components/WindowEdgeValves";
import { WorkspaceSurface } from "./components/WorkspaceSurface";
import { useAppCloseGuard } from "./hooks/useAppCloseGuard";
import {
  hasOpenPathTab,
  renamedPath,
  spacesEmptiedByTabs,
} from "./hooks/tabCloseGuards";
import { useTabCloseGuards } from "./hooks/useTabCloseGuards";
import { useWorkspaceSwitcher } from "./hooks/useWorkspaceSwitcher";

// Real-application benchmark driver (scripts/app-lab). `__TERAX_BENCH__` is the literal `false`
// in a normal build, so this is `null` and neither the import nor its chunk is emitted.
const BenchBridge = __TERAX_BENCH__
  ? lazy(() => import("@/bench/BenchBridge"))
  : null;

// AI 面板依赖聊天引擎（@ai-sdk/react），与 AgentRunBridge 一样按需加载。
const AiPanel = lazy(() =>
  import("@/modules/ai/components/AiPanel").then((m) => ({
    default: m.AiPanel,
  })),
);

const AI_PANEL_WIDTH_KEY = "terax.ai-panel-width";
const AI_PANEL_MIN_WIDTH = 280;
const AI_PANEL_MAX_WIDTH = 1200;

function readAiPanelWidth(): number {
  try {
    const raw = localStorage.getItem(AI_PANEL_WIDTH_KEY);
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (
      Number.isFinite(n) &&
      n >= AI_PANEL_MIN_WIDTH &&
      n <= AI_PANEL_MAX_WIDTH
    )
      return n;
  } catch {
    /* ignore */
  }
  return 420;
}

export default function App() {
  const {
    tabs,
    activeId,
    setActiveId,
    allocId,
    booted,
    replaceTabs,
    moveTabToSpace,
    reorderTab,
    reorderTabByGap,
    newTabInSpace,
    removeTabsForSpace,
    markBooted,
    setActiveSpaceForNewTabs,
    newTab,
    newAgentTab,
    newAgentGroupTab,
    newPrivateTab,
    openFileTab,
    pinTab,
    newPreviewTab,
    newMarkdownTab,
    setMarkdownView,
    setOverrideLanguage,
    openAiDiffTab,
    closeAiDiffTab,
    openGitDiffTab,
    openCommitHistoryTab,
    openCommitFileDiffTab,
    openSettingsTab,
    setSettingsSection,
    closeTab,
    closeTabs,
    updateTab,
    selectByIndex,
    setLeafCwd,
    focusPane,
    focusNextPaneInTab,
    swapActivePaneInDirection,
    splitActivePane,
    undoLastSplit,
    closeActivePane,
    closePaneByLeaf,
    resetWorkspace,
  } = useTabs(getLaunchDir() ? { cwd: getLaunchDir() } : undefined);

  // Mirror `tabs` into a ref so callbacks scheduled with `setTimeout`
  // (e.g. cdInNewTab) read the latest pane state instead of a stale closure.
  const tabsRef = useRef(tabs);
  const activeIdRef = useRef(activeId);

  const activeTerminalTab = useMemo(() => {
    const t = tabs.find((x) => x.id === activeId);
    return t && t.kind === "terminal" ? t : null;
  }, [tabs, activeId]);
  const activeLeafId = activeTerminalTab?.activeLeafId ?? null;

  const searchAddons = useRef<Map<number, TerminalSearchController>>(new Map());
  const [activeSearchAddon, setActiveSearchAddon] =
    useState<TerminalSearchController | null>(null);
  const [blockSearch, setBlockSearch] = useState<{
    leafId: number;
    addon: TerminalSearchController;
  } | null>(null);
  const searchInlineRef = useRef<SearchInlineHandle | null>(null);
  const terminalRefs = useRef<Map<number, TerminalPaneHandle>>(new Map());
  const editorRefs = useRef<Map<number, EditorPaneHandle>>(new Map());
  const previewRefs = useRef<Map<number, PreviewPaneHandle>>(new Map());
  const [activeEditorHandle, setActiveEditorHandle] =
    useState<EditorPaneHandle | null>(null);
  const [gitHistoryHandle, setGitHistoryHandle] =
    useState<GitHistorySearchHandle | null>(null);
  const { zoomIn, zoomOut, zoomReset } = useZoom();
  useApplyEditorFontSize();
  const terminalPathDropTarget = useTerminalFileDrop();
  // 资源管理器的指针拖拽先命中 AI 面板（附加为附件），否则落到终端粘贴路径。
  const explorerPathDropTarget = useMemo(
    () => combinePathDropTargets(aiAttachmentDropTarget, terminalPathDropTarget),
    [terminalPathDropTarget],
  );
  const explorerRef = useRef<FileExplorerHandle>(null);

  // Drives session disposal off the pane tree, not React lifecycles —
  // split/unsplit re-mount components but the leaf is still live.
  const liveLeavesRef = useRef<Set<number>>(new Set());

  const clearWorkspaceState = useCallback(() => {
    for (const id of liveLeavesRef.current) disposeSession(id);
    searchAddons.current.clear();
    terminalRefs.current.clear();
    editorRefs.current.clear();
    previewRefs.current.clear();
    setActiveSearchAddon(null);
    setBlockSearch(null);
    setActiveEditorHandle(null);
  }, []);

  const workspaceEnv = useWorkspaceEnvStore((s) => s.env);
  const setWorkspaceEnv = useWorkspaceEnvStore((s) => s.setEnv);
  const {
    home,
    launchCwd,
    launchCwdResolved,
    switchWorkspace,
    adoptWorkspaceEnv,
  } = useWorkspaceSwitcher({
    tabsRef,
    workspaceEnv,
    setWorkspaceEnv,
    resetWorkspace,
    clearWorkspaceState,
  });

  const activeSpaceId = useSpaces((s) => s.activeId);
  const spacesHydrated = useSpaces((s) => s.hydrated);
  const activeSpaceIdRef = useRef(activeSpaceId);
  useLayoutEffect(() => {
    tabsRef.current = tabs;
    activeIdRef.current = activeId;
    activeSpaceIdRef.current = activeSpaceId;
  }, [tabs, activeId, activeSpaceId]);
  const sourceControlSpaceId = activeSpaceId ?? DEFAULT_SPACE_ID;

  const handleWorkspaceChange = useCallback(
    async (env: WorkspaceEnv) => {
      const switched = await switchWorkspace(env);
      if (switched && activeSpaceId) {
        useSpaces.getState().setEnv(activeSpaceId, env);
      }
    },
    [switchWorkspace, activeSpaceId],
  );

  useSpacesBoot({
    ready: launchCwdResolved,
    launchCwd,
    home,
    allocId,
    replaceTabs,
    markBooted,
    setActiveSpaceForNewTabs,
    adoptWorkspaceEnv,
  });

  const [deferredUiReady, setDeferredUiReady] = useState(false);
  useEffect(() => {
    if (!booted || deferredUiReady) return;
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setDeferredUiReady(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [booted, deferredUiReady]);

  // 启动后按偏好自动检查更新；发现新版本只发消息，不弹更新窗口。
  useStartupUpdateCheck(deferredUiReady);

  // 启动恢复完成后把焦点交给活动终端的命令输入。终端就绪前用户已开始
  // 操作其他控件时不抢焦点。
  const startupFocusHandled = useRef(false);
  useEffect(() => {
    if (!booted || !deferredUiReady || startupFocusHandled.current) return;
    const tab = tabsRef.current.find((t) => t.id === activeIdRef.current);
    if (tab?.kind !== "terminal") {
      startupFocusHandled.current = true;
      return;
    }
    const leafId = tab.activeLeafId;
    let cancelled = false;
    void whenSessionReady(leafId).then(() => {
      if (cancelled) return;
      const currentTab = tabsRef.current.find(
        (t) => t.id === activeIdRef.current,
      );
      if (
        currentTab?.kind !== "terminal" ||
        currentTab.activeLeafId !== leafId
      ) {
        return;
      }
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active !== document.body &&
        active !== document.documentElement &&
        !active.closest("[data-terminal-stack]")
      ) {
        startupFocusHandled.current = true;
        return;
      }
      const terminal = terminalRefs.current.get(leafId);
      if (!terminal) return;
      startupFocusHandled.current = true;
      terminal.focus();
    });
    return () => {
      cancelled = true;
    };
  }, [booted, deferredUiReady]);

  useSpacePersistence({
    tabs,
    activeId,
    activeSpaceId: activeSpaceId ?? DEFAULT_SPACE_ID,
    enabled: spacesHydrated,
  });

  const prevSpaceRef = useRef(activeSpaceId);
  useEffect(() => {
    if (!spacesHydrated || !activeSpaceId) return;
    setActiveSpaceForNewTabs(activeSpaceId);
    const prev = prevSpaceRef.current;
    prevSpaceRef.current = activeSpaceId;
    if (prev === null || prev === activeSpaceId) return;
    const meta = useSpaces
      .getState()
      .spaces.find((s) => s.id === activeSpaceId);
    if (meta) void adoptWorkspaceEnv(meta.env);
    const inSpace = tabsRef.current.filter((t) => t.spaceId === activeSpaceId);
    if (inSpace.length === 0) return;
    // Keep the active tab if it already belongs to the newly active space (a
    // cross-space jump set it explicitly); else fall to the space's last tab.
    if (inSpace.some((t) => t.id === activeId)) return;
    setActiveId(inSpace[inSpace.length - 1].id);
  }, [
    activeSpaceId,
    activeId,
    spacesHydrated,
    setActiveSpaceForNewTabs,
    setActiveId,
    adoptWorkspaceEnv,
  ]);

  const [switcherOpen, setSwitcherOpen] = useState(false);

  const spaceTabs = useMemo(
    () => tabs.filter((t) => t.spaceId === (activeSpaceId ?? DEFAULT_SPACE_ID)),
    [tabs, activeSpaceId],
  );

  const {
    sidebarRef,
    sidebarWidthRef,
    sidebarView,
    sidebarCollapsed,
    initialSidebarCollapsed,
    persistSidebarView,
    persistSidebarCollapsed,
    toggleSidebar,
    cycleSidebarView,
    openSidebarView,
    persistSidebarWidth,
    toggleExplorerFocus,
  } = useSidebarPanel(explorerRef);

  const [newEditorOpen, setNewEditorOpen] = useState(false);
  const [pathHistoryOpen, setPathHistoryOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteInitialMode, setPaletteInitialMode] = useState<
    "commands" | "content"
  >("commands");
  const openCommandPalette = useCallback(
    (mode: "commands" | "content" = "commands") => {
      setPaletteInitialMode(mode);
      setCommandPaletteOpen(true);
    },
    [],
  );
  const setLive = useChatStore((s) => s.setLive);
  const respondToApproval = useChatStore((s) => s.respondToApproval);

  const { hasComposer } = useAiBootstrap();

  const aiPanelOpen = useAiPanelStore((s) => s.open);
  const closeAiPanel = useCallback(
    () => useAiPanelStore.getState().closePanel(),
    [],
  );
  const aiPanelWidthRef = useRef(readAiPanelWidth());
  const aiPanelRef = useRef<PanelImperativeHandle | null>(null);
  const aiPanelVisible = aiPanelOpen && hasComposer;

  const handleAiPanelSeparatorPointerDown = useCallback(() => {
    if (hasComposer) return;
    runtimeToast.info(t("ai.panel.configureModelFirst"), {
      id: "ai-panel-model-required",
      action: {
        label: t("ai.composer.connectProvider"),
        onClick: () => void openSettings("models"),
      },
    });
  }, [hasComposer]);

  // AI 面板始终挂载在同一个 ResizablePanelGroup 中（面板 ID 组合不变），
  // 开关只 collapse/resize。分隔线与握把常驻；配置模型后向左拖即展开、
  // 向右拖过阈值即收合，未配置时禁用拖拽并提示先配置模型。拖拽产生的
  // 收合/展开经 onResize 回写 aiPanelStore，快捷键与拖拽共用同一状态源。
  useEffect(() => {
    const panel = aiPanelRef.current;
    if (!panel) return;
    if (aiPanelVisible) {
      // 拖拽展开时面板已脱离收合位，不要覆盖用户刚拖出的宽度。
      if (panel.isCollapsed()) panel.resize(`${aiPanelWidthRef.current}px`);
    } else {
      panel.collapse();
    }
  }, [aiPanelVisible]);

  // 收起态拖阀「渐进展开」：面板库会把低于最小宽度的 resize 钳制回最小
  // 宽度（收起态则钳制回 0），拖动全程无反馈。拖阀展开期间把最小宽度临时
  // 降为 0 让宽度逐像素跟随，松手恢复并补齐到最小宽度。见 WindowEdgeValves
  // 组件头注释。
  const [sidebarLiveMinSize, setSidebarLiveMinSize] =
    useState(SIDEBAR_MIN_WIDTH);
  const [aiPanelLiveMinSize, setAiPanelLiveMinSize] =
    useState(AI_PANEL_MIN_WIDTH);

  // 左右窗口边框的「拖拽阀」：非最大化时只有阀执行侧栏打开/关闭/拖动，
  // 其余边框区域调整窗口宽度；最大化时整条边框执行侧栏操作。见
  // WindowEdgeValves 组件头注释。
  // biome-ignore lint/correctness/useExhaustiveDependencies: sidebarRef/aiPanelRef 是稳定的面板句柄
  const sidebarValve = useMemo<EdgeValveController>(
    () => ({
      enabled: () => true,
      toggle: toggleSidebar,
      applyWidth: (px) => {
        const panel = sidebarRef.current;
        if (!panel) return;
        if (px < SIDEBAR_MIN_WIDTH) {
          panel.collapse();
          return;
        }
        const width = Math.min(Math.round(px), SIDEBAR_MAX_WIDTH);
        panel.resize(`${width}px`);
        // 阀拖动不经面板组的 onLayoutChanged，显式落盘。
        persistSidebarWidth(width, true);
      },
      beginDragOpen: () => setSidebarLiveMinSize(0),
      applyDragOpen: (px) => {
        const panel = sidebarRef.current;
        if (!panel) return;
        panel.resize(`${Math.max(Math.round(px), 0)}px`);
      },
      endDragOpen: (px) => {
        if (px !== null) {
          const width = Math.min(
            Math.max(Math.round(px), SIDEBAR_MIN_WIDTH),
            SIDEBAR_MAX_WIDTH,
          );
          sidebarRef.current?.resize(`${width}px`);
          persistSidebarWidth(width, true);
        }
        setSidebarLiveMinSize(SIDEBAR_MIN_WIDTH);
      },
    }),
    [toggleSidebar, persistSidebarWidth],
  );
  const aiPanelValve = useMemo<EdgeValveController>(
    () => ({
      enabled: () => hasComposer,
      onDisabledActivate: handleAiPanelSeparatorPointerDown,
      toggle: () => useAiPanelStore.getState().togglePanel(),
      applyWidth: (px) => {
        const panel = aiPanelRef.current;
        if (!panel) return;
        if (px < AI_PANEL_MIN_WIDTH) {
          panel.collapse();
          return;
        }
        panel.resize(`${Math.min(Math.round(px), AI_PANEL_MAX_WIDTH)}px`);
      },
      beginDragOpen: () => setAiPanelLiveMinSize(0),
      applyDragOpen: (px) => {
        const panel = aiPanelRef.current;
        if (!panel) return;
        panel.resize(
          `${Math.min(Math.max(Math.round(px), 0), AI_PANEL_MAX_WIDTH)}px`,
        );
      },
      endDragOpen: (px) => {
        if (px !== null) {
          const width = Math.min(
            Math.max(Math.round(px), AI_PANEL_MIN_WIDTH),
            AI_PANEL_MAX_WIDTH,
          );
          aiPanelRef.current?.resize(`${width}px`);
        }
        setAiPanelLiveMinSize(AI_PANEL_MIN_WIDTH);
      },
    }),
    [hasComposer, handleAiPanelSeparatorPointerDown],
  );

  // 启动空档预热 AI 面板分包：首次 Ctrl+I 不必等分包下载解析，骨架即内容。
  // 仅在存在可用 Provider（hasComposer）时预热，未配置 AI 的启动零开销。
  useEffect(() => {
    if (!deferredUiReady || !hasComposer) return;
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(
        () => void import("@/modules/ai/components/AiPanel"),
        { timeout: 10_000 },
      );
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => {
      void import("@/modules/ai/components/AiPanel");
    }, 2000);
    return () => window.clearTimeout(id);
  }, [deferredUiReady, hasComposer]);

  useProxyAutoLaunch();

  const handleRefreshTab = useCallback(async (id: number) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (tab?.kind !== "terminal") return;
    for (const leafId of leafIds(tab.paneTree)) {
      await restartSession(leafId);
    }
  }, []);

  const activeTab = tabs.find((t) => t.id === activeId);
  const isTerminalTab = activeTab?.kind === "terminal";
  const isEditorTab = activeTab?.kind === "editor";
  const isGitHistoryTab = activeTab?.kind === "git-history";
  const isPreviewTab = activeTab?.kind === "preview";
  const isSettingsTab = activeTab?.kind === "settings";

  useEditorFileSync({ tabs, tabsRef, editorRefs });
  useThemeFileEditing({ tabsRef, openFileTab });

  const { explorerRoot, inheritedCwdForNewTab } = useWorkspaceCwd(
    activeTab,
    tabs,
    launchCwd ?? home,
  );

  useWindowTitle(activeTab, explorerRoot);

  useEffect(() => {
    setActiveSearchAddon(
      activeLeafId !== null
        ? (searchAddons.current.get(activeLeafId) ?? null)
        : null,
    );
    setActiveEditorHandle(editorRefs.current.get(activeId) ?? null);
  }, [activeId, activeLeafId]);

  const handleSearchReady = useCallback(
    (leafId: number, addon: TerminalSearchController) => {
      searchAddons.current.set(leafId, addon);
      if (leafId === activeLeafId) setActiveSearchAddon(addon);
    },
    [activeLeafId],
  );

  const handleBlockSearch = useCallback(
    (leafId: number, addon: TerminalSearchController) => {
      setBlockSearch({ leafId, addon });
    },
    [],
  );
  const handleBlockSearchClose = useCallback((leafId: number) => {
    setBlockSearch((current) => (current?.leafId === leafId ? null : current));
  }, []);
  useEffect(() => {
    if (blockSearch) searchInlineRef.current?.focus();
  }, [blockSearch]);
  useEffect(() => {
    setBlockSearch((current) =>
      current && current.leafId !== activeLeafId ? null : current,
    );
  }, [activeLeafId]);

  const disposeTab = useCallback(
    (id: number) => {
      // Terminal-leaf-keyed maps (terminalRefs/searchAddons) are pruned by
      // the effect below as the pane tree changes; only the tab-id-keyed
      // handles need explicit cleanup here.
      editorRefs.current.delete(id);
      previewRefs.current.delete(id);
      closeTab(id);
    },
    [closeTab],
  );

  const disposeTabs = useCallback(
    (anchorId: number, plan: CloseTabsPlan) => {
      const closedIds = closeTabs(anchorId, plan);
      for (const id of closedIds) {
        editorRefs.current.delete(id);
        previewRefs.current.delete(id);
      }
    },
    [closeTabs],
  );

  const disposeDeletedTabs = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      for (const spaceId of spacesEmptiedByTabs(tabsRef.current, ids)) {
        const root = useSpaces
          .getState()
          .spaces.find((s) => s.id === spaceId)?.root;
        newTabInSpace(spaceId, root ?? undefined);
      }
      for (const id of ids) disposeTab(id);
    },
    [disposeTab, newTabInSpace],
  );

  const {
    pendingCloseTab,
    pendingTerminalCloseTab,
    pendingDeleteTabs,
    pendingCloseMany,
    closeManyConfirming,
    handleClose,
    handleCloseTabsToRight,
    handleCloseOtherTabs,
    confirmClose,
    cancelClose,
    confirmTerminalClose,
    cancelTerminalClose,
    confirmDeleteClose,
    cancelDeleteClose,
    confirmCloseMany,
    cancelCloseMany,
    handlePathsDeleted,
  } = useTabCloseGuards({
    tabs,
    activeId,
    disposeTab,
    disposeDeletedTabs,
    disposeTabs,
  });

  const {
    pendingAppClose,
    confirmAppClose,
    cancelAppClose,
    pendingCloseChoice,
    cancelCloseChoice,
    chooseCloseAction,
    quitWithoutChoice,
  } = useAppCloseGuard(tabsRef);

  useEffect(() => {
    const live = new Set<number>();
    for (const t of tabs) {
      if (t.kind === "terminal") {
        for (const id of leafIds(t.paneTree)) live.add(id);
      }
    }
    for (const id of liveLeavesRef.current) {
      if (!live.has(id)) disposeSession(id);
    }
    liveLeavesRef.current = live;
    for (const k of [...terminalRefs.current.keys()])
      if (!live.has(k)) terminalRefs.current.delete(k);
    for (const k of [...searchAddons.current.keys()])
      if (!live.has(k)) searchAddons.current.delete(k);
  }, [tabs]);

  useEffect(() => {
    const tab = tabsRef.current.find((t) => t.id === activeId);
    if (tab?.kind !== "terminal") return;
    const ptyIds = leafIds(tab.paneTree).flatMap((leafId) => {
      const ptyId = ptyIdForLeaf(leafId);
      return ptyId === null ? [] : [ptyId];
    });
    useAgentActivityStore.getState().acknowledgeAttention(ptyIds);
  }, [activeId]);

  // Most-recently-used tab ids, most recent first, pruned to live tabs. Drives
  // the Ctrl+Tab quick switcher so it cycles by recency, not strip order.
  const mruRef = useRef<number[]>([activeId]);
  useEffect(() => {
    mruRef.current = [
      activeId,
      ...mruRef.current.filter((id) => id !== activeId),
    ];
  }, [activeId]);
  useEffect(() => {
    const live = new Set(tabs.map((t) => t.id));
    mruRef.current = mruRef.current.filter((id) => live.has(id));
  }, [tabs]);

  const getSwitcherOrder = useCallback(() => {
    const space = activeSpaceId ?? DEFAULT_SPACE_ID;
    const inSpace = tabsRef.current
      .filter((t) => t.spaceId === space)
      .map((t) => t.id);
    const present = new Set(inSpace);
    const ordered = mruRef.current.filter((id) => present.has(id));
    for (const id of inSpace) if (!ordered.includes(id)) ordered.push(id);
    return [activeId, ...ordered.filter((id) => id !== activeId)];
  }, [activeId, activeSpaceId]);

  const { state: switcherState, step: stepSwitcher } = useTabSwitcher({
    getOrder: getSwitcherOrder,
    onCommit: (id) => {
      if (tabsRef.current.some((t) => t.id === id)) setActiveId(id);
    },
  });

  const cycleSpace = useCallback((delta: 1 | -1) => {
    const { spaces, activeId: sid, setActive } = useSpaces.getState();
    if (spaces.length < 2) return;
    const idx = spaces.findIndex((s) => s.id === sid);
    const next = (idx + delta + spaces.length) % spaces.length;
    setActive(spaces[next].id);
  }, []);

  const captureActiveSelection = useCallback((): string | null => {
    const t = tabs.find((x) => x.id === activeId);
    if (!t) return null;
    if (t.kind === "terminal") {
      const lid = t.activeLeafId;
      return terminalRefs.current.get(lid)?.getSelection() ?? null;
    }
    if (t.kind === "editor") {
      return editorRefs.current.get(activeId)?.getSelection() ?? null;
    }
    return null;
  }, [tabs, activeId]);

  const openAi = useCallback(() => {
    if (!hasComposer) {
      openSettings("models");
      return;
    }
    openAiPanel();
  }, [hasComposer]);

  const toggleAi = useCallback(() => {
    if (!hasComposer) {
      openSettings("models");
      return;
    }
    toggleAiPanel();
  }, [hasComposer]);

  // 设置页以主窗口 tab 形式打开；深层组件通过注册表调用。
  useEffect(() => {
    registerSettingsOpener(openSettingsTab);
    return () => registerSettingsOpener(null);
  }, [openSettingsTab]);

  const handleAttachFileToAgent = useCallback((path: string) => {
    prefillAiPanel({ attachmentPaths: [path] });
  }, []);

  const askFromSelection = useCallback(() => {
    const selection = captureActiveSelection();
    if (!selection?.trim()) {
      openAi();
      return;
    }
    const source: "terminal" | "editor" =
      activeTab?.kind === "editor" ? "editor" : "terminal";
    prefillAiPanel({ selection: { text: selection.trim(), source } });
  }, [activeTab, captureActiveSelection, openAi]);

  const { askPopup, setAskPopup, onAskFromSelection } = useSelectionAskAi({
    captureActiveSelection,
    askFromSelection,
  });
  const askPresence = usePresence(Boolean(askPopup), 120);

  const openNewTab = useCallback(() => {
    newTab(inheritedCwdForNewTab());
  }, [newTab, inheritedCwdForNewTab]);

  const openNewPrivateTab = useCallback(() => {
    newPrivateTab(inheritedCwdForNewTab());
  }, [newPrivateTab, inheritedCwdForNewTab]);

  const launchAgentGroup = useCallback(
    (request: AgentLaunchRequest) => {
      const command = validateAgentLaunchCommand(request.command);
      if (!command.ok) return;
      const launcher = findAgentLauncher(request.agent);
      const title =
        request.instances === 1
          ? launcher.label
          : `${launcher.label} × ${request.instances}`;
      const { leafIds: agentLeafIds } = newAgentGroupTab(
        inheritedCwdForNewTab(),
        title,
        request.instances,
      );
      const hooksReady = launcher.supportsHooks
        ? invoke("agent_enable_hooks", {
            agent: request.agent,
          }).catch((error) => {
            console.warn(
              `[terax] could not enable ${request.agent} notifications:`,
              error,
            );
          })
        : Promise.resolve();

      for (const leafId of agentLeafIds) {
        void (async () => {
          await Promise.all([whenSessionReady(leafId), hooksReady]);
          if (!writeToSession(leafId, `${command.command}\r`)) {
            console.error(
              `[terax] agent terminal ${leafId} closed before launch`,
            );
          }
        })();
      }
    },
    [inheritedCwdForNewTab, newAgentGroupTab],
  );

  const sendCd = useCallback(
    (path: string) => {
      if (activeLeafId === null) return;
      const term = terminalRefs.current.get(activeLeafId);
      if (!term) return;
      term.write(`cd ${quoteShellArg(path)}\r`);
      term.focus();
    },
    [activeLeafId],
  );

  const cdInNewTab = useCallback(
    (path: string) => {
      const tabId = newTab(path);
      setTimeout(() => {
        const tab = tabsRef.current.find((x) => x.id === tabId);
        if (!tab || tab.kind !== "terminal") return;
        const t = terminalRefs.current.get(tab.activeLeafId);
        if (!t) return;
        t.write(`cd ${quoteShellArg(path)}\r`);
        t.focus();
      }, 80);
    },
    [newTab],
  );

  const handleOpenFile = useCallback(
    (path: string, pin?: boolean) => {
      // Markdown opens in its rendered view by default; a per-tab toggle flips
      // it to the raw editor. Other files default to preview (pin=false);
      // explicit actions like context-menu "Open" pass pin=true to persist.
      if (isMarkdownPath(path)) newMarkdownTab(path);
      else openFileTab(path, pin ?? false);
    },
    [openFileTab, newMarkdownTab],
  );

  const openLaunchFiles = useCallback(
    (paths: string[]) => {
      for (const path of paths) handleOpenFile(path, true);
    },
    [handleOpenFile],
  );

  // Warm start: the backend emits once the window already exists. Attach on
  // mount so an "Open With" that lands mid-restore isn't dropped — the backend
  // also seeds the drain-once state, so the boot drain below is the safety net.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    (async () => {
      const off = await listen<string[]>("terax:open-file", (e) => {
        openLaunchFiles(e.payload);
      });
      if (disposed) off();
      else unlisten = off;
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [openLaunchFiles]);

  // Cold start: files arrive as CLI args (Linux/Windows) or the macOS open-files
  // event, and get_launch_files drains them once. Wait for `booted` — the spaces
  // restore ends in replaceTabs(), which overwrites the whole tab list and would
  // discard a launch tab opened before it, making the file flash open and vanish.
  // Booting first also lands the tab in the restored active space, and lets
  // openFileTab dedupe against a session that already had the file open.
  useEffect(() => {
    if (!booted) return;
    void (async () => {
      openLaunchFiles(await consumeLaunchFiles());
    })();
  }, [booted, openLaunchFiles]);

  const handleExplorerPathRenamed = useCallback(
    (from: string, to: string) => {
      for (const tab of tabsRef.current) {
        if (tab.kind !== "editor" && tab.kind !== "markdown") continue;
        const path = renamedPath(tab.path, from, to);
        if (path === null) continue;
        const i = path.lastIndexOf("/");
        updateTab(tab.id, {
          path,
          title: i === -1 ? path : path.slice(i + 1),
        });
      }
    },
    [updateTab],
  );

  const canReplaceExplorerPath = useCallback(
    (path: string) => !hasOpenPathTab(tabsRef.current, path),
    [],
  );

  const activeTerminalLeafCwd =
    activeTab?.kind === "terminal"
      ? (findLeafCwd(activeTab.paneTree, activeTab.activeLeafId) ??
        activeTab.cwd ??
        null)
      : null;

  const activeFilePath = (() => {
    if (activeTab?.kind === "editor") return activeTab.path;
    if (activeTab?.kind === "git-diff") {
      if (/^([A-Za-z]:|\/|\\)/.test(activeTab.path)) return activeTab.path;
      const root = activeTab.repoRoot.replace(/[\\/]+$/, "");
      const rel = activeTab.path.replace(/^[\\/]+/, "");
      return `${root}/${rel}`;
    }
    if (activeTab?.kind === "git-commit-file") {
      const root = activeTab.repoRoot.replace(/[\\/]+$/, "");
      const rel = activeTab.path.replace(/^[\\/]+/, "");
      return `${root}/${rel}`;
    }
    return null;
  })();
  const explorerActiveFilePath =
    activeTab?.kind === "editor" || activeTab?.kind === "markdown"
      ? activeTab.path
      : null;
  const isRepositoryContextCurrent = useCallback(
    (spaceId: string, workspaceKey: string) => {
      const currentSpaceId = useSpaces.getState().activeId ?? DEFAULT_SPACE_ID;
      const currentWorkspaceKey = workspaceScopeKey(
        useWorkspaceEnvStore.getState().env,
      );
      return spaceId === currentSpaceId && workspaceKey === currentWorkspaceKey;
    },
    [],
  );
  const openSourceControl = useCallback(() => {
    openSidebarView("source-control");
  }, [openSidebarView]);
  const toggleHiddenFiles = useCallback(() => {
    openSidebarView("explorer");
    void setShowHidden(!usePreferencesStore.getState().showHidden);
  }, [openSidebarView]);
  const {
    repositoryTarget: sourceControlRepositoryTarget,
    openInSourceControl: handleOpenRepositoryInSourceControl,
    openGitHistory: handleOpenGitHistoryForPath,
    followActiveContext: handleFollowRepositoryContext,
  } = useRepositoryTargeting({
    spaceId: sourceControlSpaceId,
    workspaceKey: workspaceScopeKey(workspaceEnv),
    isContextCurrent: isRepositoryContextCurrent,
    openSourceControl,
    openCommitHistoryTab,
  });
  const explorerGitDecorations = usePreferencesStore(
    (s) => s.explorerGitDecorations,
  );
  const { sourceControl, toggleSourceControl, openGitGraphFromContext } =
    useSourceControlContext({
      activeTab,
      tabs,
      activeTerminalLeafCwd,
      explorerRoot,
      launchCwd,
      launchCwdResolved,
      home,
      sidebarView,
      sidebarCollapsed,
      startupReady: deferredUiReady,
      explorerGitDecorations,
      repositoryTarget: sourceControlRepositoryTarget,
      cycleSidebarView,
      openCommitHistoryTab,
    });

  const openPreviewTab = useCallback(
    (url: string) => {
      const id = newPreviewTab(url);
      // Focus the address bar if the URL is empty so the user can type.
      if (!url) {
        setTimeout(() => previewRefs.current.get(id)?.focusAddressBar(), 0);
      }
      return id;
    },
    [newPreviewTab],
  );

  const splitActivePaneInActiveTab = useCallback(
    (dir: "row" | "col") => {
      const t = tabsRef.current.find((x) => x.id === activeId);
      if (!t || t.kind !== "terminal") return;
      splitActivePane(activeId, dir);
    },
    [activeId, splitActivePane],
  );

  const livePaneBounds = useCallback((tabId: number): PaneBounds[] => {
    const tab = document.querySelector<HTMLElement>(
      `[data-terminal-tab="${tabId}"]`,
    );
    if (!tab) return [];
    return [...tab.querySelectorAll<HTMLElement>("[data-pane-leaf]")].flatMap(
      (element) => {
        const id = Number(element.dataset.paneLeaf);
        if (!Number.isFinite(id)) return [];
        const { left, right, top, bottom } = element.getBoundingClientRect();
        return [{ id, left, right, top, bottom }];
      },
    );
  }, []);

  const swapActivePane = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      swapActivePaneInDirection(activeId, direction, livePaneBounds(activeId));
    },
    [activeId, livePaneBounds, swapActivePaneInDirection],
  );

  const handleCloseTabOrPane = useCallback(() => {
    const t = tabsRef.current.find((x) => x.id === activeId);
    if (t?.kind === "terminal" && leafIds(t.paneTree).length > 1) {
      closeActivePane(activeId);
      return;
    }
    void handleClose(activeId);
  }, [activeId, closeActivePane, handleClose]);

  const [zenMode, setZenMode] = useState(false);

  // Focus an agent's tab, switching to its space first so the header and tab
  // strip don't end up showing a different space than the focused pane.
  const activateAgentTarget = useCallback(
    (tabId: number, leafId: number) => {
      const space = tabsRef.current.find((t) => t.id === tabId)?.spaceId;
      if (space && space !== useSpaces.getState().activeId) {
        useSpaces.getState().setActive(space);
      }
      setActiveId(tabId);
      focusPane(tabId, leafId);
    },
    [setActiveId, focusPane],
  );

  const shortcutHandlers = useMemo<ShortcutHandlers>(
    () => ({
      "commandPalette.open": () => openCommandPalette("commands"),
      "commandPalette.content": () => openCommandPalette("content"),
      "devtools.open": () => {
        void invoke("open_devtools").catch((error) => {
          console.error("open_devtools failed:", error);
        });
      },
      "tab.new": openNewTab,
      "tab.newPrivate": openNewPrivateTab,
      "tab.newPreview": () => openPreviewTab(""),
      "tab.newEditor": () => setNewEditorOpen(true),
      "terminal.pathHistory": () => setPathHistoryOpen(true),
      "tab.close": handleCloseTabOrPane,
      "tab.next": () => stepSwitcher(1),
      "tab.prev": () => stepSwitcher(-1),
      "tab.selectByIndex": (e) =>
        selectByIndex(
          parseInt(e.key, 10) - 1,
          activeSpaceId ?? DEFAULT_SPACE_ID,
        ),
      "space.next": () => cycleSpace(1),
      "space.prev": () => cycleSpace(-1),
      "space.overview": () => setSwitcherOpen(true),
      "pane.splitRight": () => splitActivePaneInActiveTab("row"),
      "pane.splitDown": () => splitActivePaneInActiveTab("col"),
      "pane.undoSplit": () => undoLastSplit(activeId),
      "pane.focusNext": () => focusNextPaneInTab(activeId, 1),
      "pane.focusPrev": () => focusNextPaneInTab(activeId, -1),
      "pane.swapLeft": () => swapActivePane("left"),
      "pane.swapRight": () => swapActivePane("right"),
      "pane.swapUp": () => swapActivePane("up"),
      "pane.swapDown": () => swapActivePane("down"),
      "pane.source": toggleSourceControl,
      "terminal.clear": () => {
        clearFocusedTerminal();
      },
      // A preview keeps the web page's own find (Ctrl+F must reach the frame),
      // so the handler is left unregistered there.
      ...(isPreviewTab
        ? {}
        : {
            "search.focus": () => {
              if (isSettingsTab) {
                focusSettingsSearch();
                return;
              }
              const editor = editorRefs.current.get(activeId);
              if (editor) editor.openSearch();
              else searchInlineRef.current?.focus();
            },
          }),
      "ai.toggle": toggleAi,
      "ai.askSelection": onAskFromSelection,
      "agent.focusAttention": () => {
        const t = nextAttentionTarget();
        if (t) activateAgentTarget(t.tabId, t.leafId);
      },
      "settings.open": () => void openSettings(),
      "sidebar.toggle": toggleSidebar,
      "explorer.focus": toggleExplorerFocus,
      "explorer.toggleHidden": toggleHiddenFiles,
      "view.zoomIn": zoomIn,
      "view.zoomOut": zoomOut,
      "view.zoomReset": zoomReset,
      "view.zenMode": () => setZenMode((v) => !v),
      "editor.undo": () => editorRefs.current.get(activeId)?.undo(),
      "editor.redo": () => editorRefs.current.get(activeId)?.redo(),
      "editor.save": () => {
        void editorRefs.current.get(activeId)?.save();
      },
      "editor.aiComplete": () =>
        editorRefs.current.get(activeId)?.triggerAiComplete(),
      "editor.codeComplete": () =>
        editorRefs.current.get(activeId)?.triggerCodeComplete(),
    }),
    [
      activeId,
      openCommandPalette,
      stepSwitcher,
      cycleSpace,
      handleCloseTabOrPane,
      openNewTab,
      openNewPrivateTab,
      openPreviewTab,
      activeSpaceId,
      selectByIndex,
      splitActivePaneInActiveTab,
      undoLastSplit,
      focusNextPaneInTab,
      swapActivePane,
      toggleSourceControl,
      toggleAi,
      onAskFromSelection,
      toggleSidebar,
      toggleExplorerFocus,
      toggleHiddenFiles,
      zoomIn,
      zoomOut,
      zoomReset,
      activateAgentTarget,
      isPreviewTab,
      isSettingsTab,
    ],
  );

  const shortcutsDisabled = useCallback(
    (id: ShortcutId, e: KeyboardEvent) => {
      const terminalPaneCount =
        activeTab?.kind === "terminal"
          ? leafIds(activeTab.paneTree).length
          : null;
      if (shouldDisablePaneSwapShortcut(id, terminalPaneCount)) return true;
      if (id === "pane.undoSplit") return activeTab?.kind !== "terminal";
      // Ctrl+E: inside a terminal tab the history picker owns the key; outside
      // terminals the key does nothing (tab.newEditor lives on Mod+Alt+E).
      if (id === "terminal.pathHistory") return activeTab?.kind !== "terminal";
      if (id === "tab.newEditor") return activeTab?.kind === "terminal";
      if (
        id === "editor.undo" ||
        id === "editor.redo" ||
        id === "editor.save" ||
        id === "editor.aiComplete" ||
        id === "editor.codeComplete"
      ) {
        return activeTab?.kind !== "editor";
      }
      if (id === "ai.askSelection") {
        const target =
          (e.target as HTMLElement | null) ?? document.activeElement;
        const inTerminal = isTerminalSurfaceTarget(target);
        if (!inTerminal) return false;
        const sel = captureActiveSelection();
        return !sel?.trim();
      }
      if (id === "terminal.clear") {
        // Only intercept ⌘K while a terminal is focused; elsewhere let the key
        // fall through (we never preventDefault when disabled).
        const target =
          (e.target as HTMLElement | null) ?? document.activeElement;
        return !isTerminalSurfaceTarget(target);
      }
      if (id === "sidebar.toggle") {
        // Plain Ctrl+B is readline's backward-char and Claude Code's "run in
        // background" key. It is no longer a default sidebar binding, but a
        // user-assigned plain Ctrl+B still defers to the shell while a
        // terminal is focused; Shift variants toggle from anywhere.
        const target =
          (e.target as HTMLElement | null) ?? document.activeElement;
        const inTerminal = isTerminalSurfaceTarget(target);
        return inTerminal && !e.shiftKey;
      }
      return false;
    },
    [activeTab, captureActiveSelection],
  );

  useGlobalShortcuts(shortcutHandlers, { isDisabled: shortcutsDisabled });

  const registerTerminalHandle = useCallback(
    (leafId: number, h: TerminalPaneHandle | null) => {
      if (h) terminalRefs.current.set(leafId, h);
      else terminalRefs.current.delete(leafId);
    },
    [],
  );

  const registerEditorHandle = useCallback(
    (id: number, h: EditorPaneHandle | null) => {
      if (h) {
        editorRefs.current.set(id, h);
        const pending = pendingEditorNavigation.current.get(id);
        if (pending != null) {
          pendingEditorNavigation.current.delete(id);
          if (pending.line === undefined) h.focus();
          else h.gotoLine(pending.line, { focus: pending.focus });
        }
      } else {
        editorRefs.current.delete(id);
      }
      if (id === activeId) setActiveEditorHandle(h);
    },
    [activeId],
  );

  const registerPreviewHandle = useCallback(
    (id: number, h: PreviewPaneHandle | null) => {
      if (h) previewRefs.current.set(id, h);
      else previewRefs.current.delete(id);
    },
    [],
  );

  const handlePreviewUrl = useCallback(
    (id: number, url: string) => updateTab(id, { url }),
    [updateTab],
  );

  const authorizedCwds = useRef(new Set<string>());
  const handleTerminalCwd = useCallback(
    (leafId: number, cwd: string) => {
      // Browser-history model: record the directory the shell just left.
      const previous = tabsRef.current.flatMap((t) =>
        t.kind === "terminal" && hasLeaf(t.paneTree, leafId)
          ? [findLeafCwd(t.paneTree, leafId)]
          : [],
      )[0];
      setLeafCwd(leafId, cwd);
      if (previous && previous !== cwd) {
        const { pathHistory, pathHistoryLimit } =
          usePreferencesStore.getState();
        void setPathHistory(
          recordPathHistory(pathHistory, previous, pathHistoryLimit),
        );
      }
      if (cwd && !authorizedCwds.current.has(cwd)) {
        authorizedCwds.current.add(cwd);
        native.workspaceAuthorize(cwd).catch(() => {
          authorizedCwds.current.delete(cwd);
        });
      }
    },
    [setLeafCwd],
  );

  const visiblePathHistory = useVisiblePathHistory(
    usePreferencesStore((s) => s.pathHistory),
    commandPaletteOpen,
  );

  const handlePathHistoryPick = useCallback(
    (path: string) => {
      const tab = tabsRef.current.find((t) => t.id === activeId);
      if (tab?.kind !== "terminal") return;
      cdTerminalLeafTo(tab.activeLeafId, path);
      focusPane(tab.id, tab.activeLeafId);
    },
    [activeId, focusPane],
  );

  const handleFocusLeaf = useCallback(
    (tabId: number, leafId: number) => focusPane(tabId, leafId),
    [focusPane],
  );

  const onActivateAgent = activateAgentTarget;

  const onActivateLocalAgent = useCallback(() => {
    openAi();
  }, [openAi]);

  const handleLeafExit = useCallback(
    (leafId: number, _code: number) => {
      const all = tabsRef.current;
      const tab = all.find(
        (t) => t.kind === "terminal" && hasLeaf(t.paneTree, leafId),
      );
      if (!tab || tab.kind !== "terminal") return;
      // Last pane of the last tab: quit instead of respawning a shell.
      if (leafIds(tab.paneTree).length === 1 && all.length === 1) {
        quitWithoutChoice();
      } else {
        closePaneByLeaf(leafId);
      }
    },
    [closePaneByLeaf, quitWithoutChoice],
  );

  const handleEditorDirty = useCallback(
    (id: number, dirty: boolean) => updateTab(id, { dirty }),
    [updateTab],
  );

  const handleRenameTab = useCallback(
    (id: number, title: string) => updateTab(id, { customTitle: title.trim() }),
    [updateTab],
  );

  const searchTarget = useMemo<SearchTarget>(() => {
    if (blockSearch && isTerminalTab && activeLeafId === blockSearch.leafId)
      return {
        kind: "terminal",
        addon: blockSearch.addon,
        focus: () => terminalRefs.current.get(blockSearch.leafId)?.focus(),
        placeholder: t("terminal.block.findInBlock"),
        onClose: () => handleBlockSearchClose(blockSearch.leafId),
      };
    if (isTerminalTab && activeLeafId !== null && activeSearchAddon)
      return {
        kind: "terminal",
        addon: activeSearchAddon,
        focus: () => terminalRefs.current.get(activeLeafId)?.focus(),
      };
    if (isEditorTab && activeEditorHandle)
      return {
        kind: "editor",
        handle: activeEditorHandle,
        focus: () => activeEditorHandle.focus(),
      };
    if (isGitHistoryTab && gitHistoryHandle)
      return {
        kind: "git-history",
        handle: gitHistoryHandle,
        focus: () => {},
      };
    return null;
  }, [
    isTerminalTab,
    isEditorTab,
    isGitHistoryTab,
    activeLeafId,
    activeSearchAddon,
    blockSearch,
    handleBlockSearchClose,
    activeEditorHandle,
    gitHistoryHandle,
  ]);

  const activeCwd = activeTerminalLeafCwd;

  const handleNewSpace = useCallback(() => {
    const { spaces, create, setActive } = useSpaces.getState();
    const meta = create({
      name: t("spaces.defaultName", { index: spaces.length + 1 }),
      root: activeCwd ?? home ?? null,
      env: workspaceEnv,
    });
    setActiveSpaceForNewTabs(meta.id);
    newTab(activeCwd ?? undefined);
    setActive(meta.id);
    return meta.id;
  }, [activeCwd, home, workspaceEnv, newTab, setActiveSpaceForNewTabs]);

  const handleDeleteSpace = useCallback(
    (id: string) => {
      const nextSpaceId = useSpaces.getState().remove(id);
      if (!nextSpaceId) return;
      const root = useSpaces
        .getState()
        .spaces.find((s) => s.id === nextSpaceId)?.root;
      removeTabsForSpace(id, nextSpaceId, root ?? undefined);
    },
    [removeTabsForSpace],
  );

  const handleMoveTab = useCallback(
    (tabId: number, targetSpaceId: string) => {
      if (moveTabToSpace(tabId, targetSpaceId)) {
        useSpaces.getState().setActive(targetSpaceId);
      }
    },
    [moveTabToSpace],
  );

  const handleReorderTab = useCallback(
    (tabId: number, targetTabId: number, edge: "top" | "bottom") => {
      if (reorderTab(tabId, targetTabId, edge)) {
        const target = tabsRef.current.find((x) => x.id === targetTabId);
        if (target) useSpaces.getState().setActive(target.spaceId);
      }
    },
    [reorderTab],
  );

  const handleNewTabInSpace = useCallback(
    (spaceId: string) => {
      const root = useSpaces
        .getState()
        .spaces.find((s) => s.id === spaceId)?.root;
      newTabInSpace(spaceId, root ?? undefined);
    },
    [newTabInSpace],
  );

  const jumpToTab = useCallback(
    (tabId: number) => {
      const t = tabsRef.current.find((x) => x.id === tabId);
      if (!t) return;
      setActiveId(tabId);
      useSpaces.getState().setActive(t.spaceId);
      setSwitcherOpen(false);
    },
    [setActiveId],
  );

  const spaceSwitcher = (
    <SpaceSwitcher
      open={switcherOpen}
      onOpenChange={setSwitcherOpen}
      tabs={tabs}
      onNewSpace={() => void handleNewSpace()}
      onDeleteSpace={handleDeleteSpace}
      onNewTabInSpace={handleNewTabInSpace}
      onJumpTab={jumpToTab}
      onCloseTab={handleClose}
      onMoveTabToSpace={handleMoveTab}
      onReorderTab={handleReorderTab}
      onReorderSpaces={(ids) => useSpaces.getState().reorder(ids)}
    />
  );

  const commandPaletteItems = useMemo(
    () =>
      commandPaletteOpen
        ? createCommandItems({
            tabs,
            activeId,
            searchTarget,
            explorerRoot,
            home,
            openNewTab,
            openNewPrivate: openNewPrivateTab,
            openNewEditor: () => setNewEditorOpen(true),
            openNewPreview: () => openPreviewTab(""),
            openGitGraph: openGitGraphFromContext,
            toggleSourceControl,
            closeActiveTabOrPane: handleCloseTabOrPane,
            splitPaneRight: () => splitActivePaneInActiveTab("row"),
            splitPaneDown: () => splitActivePaneInActiveTab("col"),
            focusSearch: () => searchInlineRef.current?.focus(),
            focusExplorerSearch: () => explorerRef.current?.focusSearch(),
            toggleSidebar,
            toggleHiddenFiles,
            toggleAi,
            askAiSelection: askFromSelection,
            openSettings: () => void openSettings(),
            openKeyboardShortcuts: () => void openSettings("shortcuts"),
            spaces: useSpaces.getState().spaces,
            activeSpaceId,
            openSpacesOverview: () => setSwitcherOpen(true),
            newSpace: () => void handleNewSpace(),
            switchSpace: (id) => useSpaces.getState().setActive(id),
          })
        : [],
    [
      commandPaletteOpen,
      tabs,
      activeId,
      searchTarget,
      explorerRoot,
      home,
      openNewTab,
      openNewPrivateTab,
      openPreviewTab,
      openGitGraphFromContext,
      toggleSourceControl,
      handleCloseTabOrPane,
      splitActivePaneInActiveTab,
      toggleSidebar,
      toggleHiddenFiles,
      toggleAi,
      askFromSelection,
      activeSpaceId,
      handleNewSpace,
    ],
  );

  const pendingEditorNavigation = useRef<
    Map<number, { line?: number; focus: boolean }>
  >(new Map());
  const openContentHit = useCallback(
    (path: string, line: number) => {
      const id = openFileTab(path, true);
      if (id == null) return;
      const h = editorRefs.current.get(id);
      if (h) h.gotoLine(line);
      else pendingEditorNavigation.current.set(id, { line, focus: true });
    },
    [openFileTab],
  );

  const openControlFile = useCallback(
    ({
      path,
      line,
      focus,
      spaceId,
    }: {
      path: string;
      line?: number;
      focus: boolean;
      spaceId: string;
    }) => {
      if (focus && useSpaces.getState().activeId !== spaceId) {
        useSpaces.getState().setActive(spaceId);
      }
      const id = openFileTab(path, true, {
        spaceId,
        activate: focus,
      });
      const editor = editorRefs.current.get(id);
      if (line !== undefined) {
        if (editor) editor.gotoLine(line, { focus });
        else pendingEditorNavigation.current.set(id, { line, focus });
      } else if (focus) {
        if (editor) editor.focus();
        else pendingEditorNavigation.current.set(id, { focus: true });
      }
      return id;
    },
    [openFileTab],
  );

  useControlBridge({
    ready: spacesHydrated && launchCwdResolved,
    tabsRef,
    activeTabIdRef: activeIdRef,
    activeSpaceIdRef,
    onOpen: openControlFile,
  });

  useEffect(() => {
    setLspNavigator({ openFile: openContentHit });
    return () => setLspNavigator(null);
  }, [openContentHit]);

  useAiLiveBridge({
    setLive,
    activeId,
    tabs,
    explorerRoot,
    launchCwd,
    home,
    openPreviewTab,
    newAgentTab,
    terminalRefs,
  });

  const shell = (
    <ThemeProvider>
      <TooltipProvider>
        {BenchBridge && (
          <Suspense fallback={null}>
            <BenchBridge
              tabs={tabs}
              activeId={activeId}
              booted={booted}
              setActiveId={setActiveId}
              newTab={newTab}
              newAgentGroupTab={newAgentGroupTab}
              splitActivePane={splitActivePane}
              closeTab={closeTab}
              readBuffer={(leafId, maxLines) =>
                terminalRefs.current.get(leafId)?.getBuffer(maxLines) ?? null
              }
            />
          </Suspense>
        )}
        <div className="relative flex h-screen flex-col overflow-hidden bg-frame text-foreground">
          {!zenMode && (
            <Header
              tabs={spaceTabs}
              activeId={activeId}
              onSelect={setActiveId}
              onNew={openNewTab}
              onNewPrivate={openNewPrivateTab}
              onNewPreview={() => openPreviewTab("")}
              onNewEditor={() => setNewEditorOpen(true)}
              onNewGitGraph={openGitGraphFromContext}
              onLaunchAgents={launchAgentGroup}
              onClose={handleClose}
              onCloseTabsToRight={handleCloseTabsToRight}
              onCloseOtherTabs={handleCloseOtherTabs}
              onPin={pinTab}
              onRename={handleRenameTab}
              onRefresh={(id) => void handleRefreshTab(id)}
              onReorder={reorderTabByGap}
              onToggleSidebar={toggleSidebar}
              onOpenCommandPalette={() => openCommandPalette("commands")}
              onActivateAgent={onActivateAgent}
              onActivateLocalAgent={onActivateLocalAgent}
              onOpenSettings={() => void openSettings()}
              spaceSwitcher={spaceSwitcher}
              searchTarget={searchTarget}
              searchRef={searchInlineRef}
              onOverrideLanguage={setOverrideLanguage}
            />
          )}

          <main className="zoom-content flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1">
              <ResizablePanelGroup
                orientation="horizontal"
                className="min-h-0 flex-1"
                onLayoutChanged={(_, { isUserInteraction }) => {
                  const width = sidebarRef.current?.getSize().inPixels ?? 0;
                  persistSidebarWidth(width, isUserInteraction);
                }}
              >
                <ResizablePanel
                  id="sidebar"
                  panelRef={sidebarRef}
                  defaultSize={
                    initialSidebarCollapsed
                      ? "0px"
                      : `${sidebarWidthRef.current}px`
                  }
                  minSize={`${sidebarLiveMinSize}px`}
                  maxSize={`${SIDEBAR_MAX_WIDTH}px`}
                  collapsible
                  collapsedSize={0}
                  onResize={(size) => {
                    persistSidebarCollapsed(size.inPixels <= 0);
                  }}
                >
                  <div className="h-full min-h-0 pl-2 pr-0.5">
                    <div className="terax-pane flex h-full min-h-0 flex-col">
                      <div
                        key={sidebarView}
                        className="min-h-0 flex-1 terax-panel-in"
                      >
                        {deferredUiReady ? (
                          sidebarView === "explorer" ? (
                            <FileExplorer
                              ref={explorerRef}
                              rootPath={explorerRoot}
                              gitStatus={
                                explorerGitDecorations
                                  ? sourceControl.status
                                  : null
                              }
                              activeFilePath={explorerActiveFilePath}
                              onOpenFile={handleOpenFile}
                              onPathRenamed={handleExplorerPathRenamed}
                              onPathsDeleted={handlePathsDeleted}
                              canReplacePath={canReplaceExplorerPath}
                              onRevealInTerminal={cdInNewTab}
                              onOpenInSourceControl={
                                handleOpenRepositoryInSourceControl
                              }
                              onOpenGitHistory={handleOpenGitHistoryForPath}
                              onAttachToAgent={handleAttachFileToAgent}
                              pathDropTarget={explorerPathDropTarget}
                              visible={!sidebarCollapsed}
                            />
                          ) : (
                            <SourceControlPanel
                              open
                              sourceControl={sourceControl}
                              onOpenDiff={openGitDiffTab}
                              onOpenGitGraph={openGitGraphFromContext}
                              onOpenFile={handleOpenFile}
                              onNavigateToPath={cdInNewTab}
                              repositoryTarget={sourceControlRepositoryTarget}
                              onFollowRepositoryContext={
                                handleFollowRepositoryContext
                              }
                            />
                          )
                        ) : null}
                      </div>
                      <SidebarRail
                        activeView={sidebarView}
                        onSelectView={persistSidebarView}
                        changedCount={sourceControl.changedCount}
                      />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle
                  grip
                  className="w-1 rounded-full bg-transparent transition-colors duration-[var(--dur-fast)] after:w-4 hover:bg-border"
                />
                <ResizablePanel id="workspace" defaultSize="78%" minSize="30%">
                  <div className="h-full min-h-0 px-0.5">
                    <div className="terax-pane flex h-full min-h-0 flex-col">
                      <div className="relative min-h-0 flex-1">
                        <WorkspaceSurface
                          tabs={tabs}
                          activeId={activeId}
                          activeTab={activeTab}
                          registerTerminalHandle={registerTerminalHandle}
                          onSearchReady={handleSearchReady}
                          onBlockSearch={handleBlockSearch}
                          onBlockSearchClose={handleBlockSearchClose}
                          onCwd={handleTerminalCwd}
                          onExit={handleLeafExit}
                          onOpenPreviewUrl={openPreviewTab}
                          onFocusLeaf={handleFocusLeaf}
                          registerEditorHandle={registerEditorHandle}
                          onEditorDirtyChange={handleEditorDirty}
                          onEditorCloseTab={disposeTab}
                          registerPreviewHandle={registerPreviewHandle}
                          onPreviewUrlChange={handlePreviewUrl}
                          onAiDiffAccept={(id) => respondToApproval(id, true)}
                          onAiDiffReject={(id) => respondToApproval(id, false)}
                          onOpenCommitFile={openCommitFileDiffTab}
                          onGitHistorySearchHandle={setGitHistoryHandle}
                          onSetMarkdownView={setMarkdownView}
                          onSettingsSectionChange={(section) => {
                            const settings = tabs.find(
                              (t) => t.kind === "settings",
                            );
                            if (settings) {
                              setSettingsSection(settings.id, section);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle
                  grip
                  disabled={!hasComposer}
                  onPointerDown={handleAiPanelSeparatorPointerDown}
                  className="w-1 rounded-full bg-transparent transition-colors duration-[var(--dur-fast)] after:w-4 hover:bg-border"
                />
                <ResizablePanel
                  id="ai-panel"
                  panelRef={aiPanelRef}
                  defaultSize="0px"
                  minSize={`${aiPanelLiveMinSize}px`}
                  collapsible
                  collapsedSize={0}
                  onResize={(size) => {
                    if (!hasComposer) {
                      if (size.inPixels > 0) aiPanelRef.current?.collapse();
                      return;
                    }
                    if (size.inPixels <= 0) {
                      // 拖拽收合与 closePanel 同步（含清除 prefill），
                      // 下一次 Ctrl+I 从收合位重新展开。
                      if (useAiPanelStore.getState().open) {
                        useAiPanelStore.getState().closePanel();
                      }
                      return;
                    }
                    try {
                      localStorage.setItem(
                        AI_PANEL_WIDTH_KEY,
                        String(size.inPixels),
                      );
                    } catch {
                      /* ignore */
                    }
                    if (!useAiPanelStore.getState().open) {
                      openAiPanel();
                    }
                  }}
                >
                  {aiPanelVisible ? (
                    <div className="h-full min-h-0 pl-0.5 pr-2">
                      <div className="terax-pane h-full min-h-0 overflow-hidden">
                        <Suspense fallback={<AiPanelSkeleton />}>
                          <AiPanel onClose={closeAiPanel} />
                        </Suspense>
                      </div>
                    </div>
                  ) : null}
                </ResizablePanel>
              </ResizablePanelGroup>
              <WindowEdgeValves
                left={sidebarValve}
                right={aiPanelValve}
                leftCollapsed={sidebarCollapsed}
                rightCollapsed={!aiPanelVisible}
              />
            </div>
          </main>

          {!zenMode && (
            <StatusBar
              cwd={activeCwd}
              filePath={activeFilePath}
              home={home}
              onCd={sendCd}
              onWorkspaceChange={handleWorkspaceChange}
              onOpenMini={openAi}
              onOpenAi={openAi}
              privateActive={
                activeTab?.kind === "terminal" && activeTab.private === true
              }
            />
          )}

          <WindowVibrancyBridge />
          {IS_MAC ? <LivePageResizeBridge /> : null}
          <WindowActivityBridge
            bindFocus={bindTerminalWindowFocus}
            subscribePresentation={subscribeWindowPresentation}
          />

          <AgentNotificationsBridge
            tabs={tabs}
            activeId={activeId}
            onActivate={onActivateAgent}
          />
          <Toaster position="bottom-right" />

          {hasComposer ? (
            <>
              <AgentRunBridge
                openAiDiffTab={openAiDiffTab}
                closeAiDiffTab={closeAiDiffTab}
              />
              <LocalAgentNotificationsBridge />
            </>
          ) : null}

          {askPresence.mounted ? (
            <SelectionAskAi
              state={askPresence.state}
              x={askPopup?.x ?? 0}
              y={askPopup?.y ?? 0}
              onAsk={onAskFromSelection}
              onDismiss={() => setAskPopup(null)}
            />
          ) : null}

          {switcherState && (
            <TabSwitcherHud tabs={spaceTabs} state={switcherState} />
          )}

          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
            initialMode={paletteInitialMode}
            commandItems={commandPaletteItems}
            workspaceRoot={explorerRoot}
            onOpenContentHit={openContentHit}
            pathHistory={visiblePathHistory}
            onOpenHistoryPath={handlePathHistoryPick}
          />

          <PathHistoryDialog
            open={pathHistoryOpen}
            onOpenChange={setPathHistoryOpen}
            onPick={handlePathHistoryPick}
            disabledReasonKey={
              activeTab?.kind === "terminal"
                ? null
                : "terminal.pathHistory.noTerminal"
            }
          />

          <NewEditorDialog
            open={newEditorOpen}
            onOpenChange={setNewEditorOpen}
            rootPath={explorerRoot ?? home}
            onCreated={(path) => openFileTab(path)}
          />

          <CloseDialogs
            tabs={tabs}
            pendingCloseTab={pendingCloseTab}
            onCancelClose={cancelClose}
            onConfirmClose={confirmClose}
            pendingTerminalCloseTab={pendingTerminalCloseTab}
            onCancelTerminalClose={cancelTerminalClose}
            onConfirmTerminalClose={confirmTerminalClose}
            pendingDeleteTabs={pendingDeleteTabs}
            onCancelDeleteClose={cancelDeleteClose}
            onConfirmDeleteClose={confirmDeleteClose}
            pendingCloseMany={pendingCloseMany}
            closeManyConfirming={closeManyConfirming}
            onCancelCloseMany={cancelCloseMany}
            onConfirmCloseMany={confirmCloseMany}
            pendingAppClose={pendingAppClose}
            onCancelAppClose={cancelAppClose}
            onConfirmAppClose={confirmAppClose}
            pendingCloseChoice={pendingCloseChoice}
            onCancelCloseChoice={cancelCloseChoice}
            onChooseCloseAction={(action, remember) => {
              void chooseCloseAction(action, remember);
            }}
          />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );

  return shell;
}
