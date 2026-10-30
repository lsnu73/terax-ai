import { homeRelativePath } from "@/lib/homeRelativePath";
import "@/modules/terminal/block/block.css";

import { cn } from "@/lib/utils";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Clock01Icon,
  CommandLineIcon,
  Refresh01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { homeDir } from "@tauri-apps/api/path";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  BlockMatch,
  PositionedBlock,
  VisibleBlocks,
} from "./lib/blockTypes";

let cachedHome: string | null = null;
void homeDir()
  .then((h) => {
    cachedHome = h.replace(/\\/g, "/").replace(/\/+$/, "");
  })
  .catch(() => {});

type Props = {
  subscribe: (cb: () => void) => () => void;
  getVisible: () => VisibleBlocks;
  searchBlock: (
    id: string,
    query: string,
    signal: AbortSignal,
  ) => Promise<BlockMatch[]>;
  revealMatch: (m: BlockMatch) => void;
  clearSearch: () => void;
  searchId: string | null;
  onCloseSearch: () => void;
  promptReady: boolean;
  onRunAgain: (command: string) => void;
};

const EMPTY: VisibleBlocks = { blocks: [], sticky: null, generation: 0 };

function fmtDuration(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60000);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function sameBlock(
  a: PositionedBlock | null,
  b: PositionedBlock | null,
): boolean {
  if (a === b) return true;
  return (
    !!a &&
    !!b &&
    a.id === b.id &&
    a.command === b.command &&
    a.canRerun === b.canRerun &&
    a.cwd === b.cwd &&
    a.exitCode === b.exitCode &&
    a.running === b.running &&
    a.ok === b.ok &&
    a.startedAt === b.startedAt &&
    a.finishedAt === b.finishedAt &&
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.headerTop === b.headerTop
  );
}

function sameVisibleBlocks(a: VisibleBlocks, b: VisibleBlocks): boolean {
  if (
    a.generation !== b.generation ||
    !sameBlock(a.sticky, b.sticky) ||
    a.blocks.length !== b.blocks.length
  )
    return false;
  for (let index = 0; index < a.blocks.length; index++) {
    if (!sameBlock(a.blocks[index], b.blocks[index])) return false;
  }
  return true;
}

export function BlockOverlay(props: Props) {
  const { subscribe, getVisible, onCloseSearch } = props;
  const [vis, setVis] = useState<VisibleBlocks>(EMPTY);
  const lastVisible = useRef(EMPTY);

  useEffect(() => {
    const update = (synchronous = false) => {
      const v = getVisible();
      if (sameVisibleBlocks(v, lastVisible.current)) return;
      const cleared = v.generation !== lastVisible.current.generation;
      lastVisible.current = v;
      const commit = () => {
        if (cleared) onCloseSearch();
        setVis(v);
      };
      if (synchronous) flushSync(commit);
      else commit();
    };
    update();
    return subscribe(() => update(true));
  }, [subscribe, getVisible, onCloseSearch]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {vis.blocks.map((block) => (
        <BlockChrome key={block.id} block={block} all={props} />
      ))}
      {vis.sticky && <StickyHeader block={vis.sticky} all={props} />}
      {props.searchId && (
        <SearchBar
          key={props.searchId}
          clearSearch={props.clearSearch}
          blockId={props.searchId}
          searchBlock={props.searchBlock}
          revealMatch={props.revealMatch}
          onClose={onCloseSearch}
        />
      )}
    </div>
  );
}

type ChromeProps = {
  block: PositionedBlock;
  all: Props;
};

// No chrome while the command runs; the bar lands together with the divider
// once the block is finished.
function BlockChrome({ block, all }: ChromeProps) {
  if (block.running) return null;
  return (
    <>
      <div
        className={cn("bt-divider", !block.ok && "bt-divider-fail")}
        style={{ top: block.bottom }}
      />
      <div className="bt-bar" style={{ top: block.headerTop }}>
        <Meta block={block} />
        <Toolbar block={block} all={all} />
      </div>
    </>
  );
}

function Meta({ block }: { block: PositionedBlock }) {
  return (
    <span className="bt-head-meta">
      {block.cwd && (
        <span className="bt-cwd">
          {homeRelativePath(block.cwd, cachedHome)}
        </span>
      )}
      <span className="bt-clock">
        <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.75} />
        {fmtTime(block.startedAt)}
      </span>
    </span>
  );
}

function StickyHeader({ block, all }: ChromeProps) {
  const { t } = useTranslation();
  return (
    <div className="bt-sticky">
      <HugeiconsIcon
        className="bt-sticky-icon"
        icon={CommandLineIcon}
        size={12}
        strokeWidth={1.75}
      />
      <span className="bt-sticky-cmd">
        {block.command || t("terminal.block.commandFallback")}
      </span>
      <Toolbar block={block} all={all} />
    </div>
  );
}

function Toolbar({ block, all }: ChromeProps) {
  const { t } = useTranslation();
  const duration = block.running
    ? null
    : fmtDuration(block.finishedAt - block.startedAt);
  const failed = !block.running && !block.ok && block.exitCode !== null;
  return (
    <div className="bt-tools">
      {failed && (
        <span className="bt-exit">
          {t("terminal.block.exitCode", { code: block.exitCode })}
        </span>
      )}
      {duration && <span className="bt-dur">{duration}</span>}
      {!block.running && block.canRerun && (
        <button
          type="button"
          title={t("terminal.block.runAgain")}
          className="bt-btn"
          disabled={!all.promptReady}
          onClick={() => all.onRunAgain(block.command)}
        >
          <HugeiconsIcon icon={Refresh01Icon} size={12.5} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

// One fixed search bar pinned to the top of the terminal so it stays put while
// navigating matches (the grid scrolls underneath).
function SearchBar({
  clearSearch,
  blockId,
  searchBlock,
  revealMatch,
  onClose,
}: {
  clearSearch: () => void;
  blockId: string;
  searchBlock: (
    id: string,
    query: string,
    signal: AbortSignal,
  ) => Promise<BlockMatch[]>;
  revealMatch: (m: BlockMatch) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<BlockMatch[]>([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => () => searchRef.current?.abort(), []);
  const run = (query: string) => {
    searchRef.current?.abort();
    clearSearch();
    const controller = new AbortController();
    searchRef.current = controller;
    setMatches([]);
    setIdx(0);
    setPending(!!query);
    void searchBlock(blockId, query, controller.signal).then(
      (m) => {
        if (controller.signal.aborted) return;
        setPending(false);
        setMatches(m);
        if (m.length) revealMatch(m[0]);
      },
      () => {
        if (controller.signal.aborted) return;
        setPending(false);
        toast.error(t("terminal.block.searchFailed"));
      },
    );
  };
  const nav = (dir: number) => {
    if (!matches.length) return;
    const next = (idx + dir + matches.length) % matches.length;
    setIdx(next);
    revealMatch(matches[next]);
  };

  return (
    <div className="bt-search pointer-events-auto">
      <HugeiconsIcon icon={Search01Icon} size={12} strokeWidth={1.75} />
      <input
        ref={inputRef}
        className="bt-search-input"
        placeholder={t("terminal.block.findInBlock")}
        onChange={(e) => run(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            nav(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="bt-search-count">
        {pending
          ? t("terminal.block.searching")
          : matches.length
            ? `${idx + 1}/${matches.length}`
            : "0"}
      </span>
      <SearchBtn
        title={t("terminal.block.previous")}
        icon={ArrowUp01Icon}
        onClick={() => nav(-1)}
      />
      <SearchBtn
        title={t("terminal.block.next")}
        icon={ArrowDown01Icon}
        onClick={() => nav(1)}
      />
      <SearchBtn
        title={t("terminal.block.close")}
        icon={Cancel01Icon}
        onClick={onClose}
      />
    </div>
  );
}

function SearchBtn({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: typeof Refresh01Icon;
  onClick: () => void;
}) {
  return (
    <button type="button" title={title} onClick={onClick} className="bt-btn">
      <HugeiconsIcon icon={icon} size={13} strokeWidth={1.75} />
    </button>
  );
}
