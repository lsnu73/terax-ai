import "@/modules/terminal/block/block.css";

import { cn } from "@/lib/utils";
import { CommandLineIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import type { PositionedBlock, VisibleBlocks } from "./lib/blockTypes";

type Props = {
  subscribe: (cb: () => void) => () => void;
  getVisible: () => VisibleBlocks;
  onCloseSearch: () => void;
};

const EMPTY: VisibleBlocks = { blocks: [], sticky: null, generation: 0 };

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
        <BlockChrome key={block.id} block={block} />
      ))}
      {vis.sticky && <StickyHeader block={vis.sticky} />}
    </div>
  );
}

// No chrome while the command runs; only the divider lands with the bar once
// the block is finished (the bar itself only carries the failed exit code).
function BlockChrome({ block }: { block: PositionedBlock }) {
  if (block.running) return null;
  const failed = !block.ok && block.exitCode !== null;
  return (
    <div
      className={cn("bt-divider", !block.ok && "bt-divider-fail")}
      style={{ top: block.bottom }}
    >
      {failed && (
        <div className="bt-bar">
          <ExitCode block={block} />
        </div>
      )}
    </div>
  );
}

function ExitCode({ block }: { block: PositionedBlock }) {
  const { t } = useTranslation();
  return (
    <div className="bt-tools">
      <span className="bt-exit">
        {t("terminal.block.exitCode", { code: block.exitCode })}
      </span>
    </div>
  );
}

function StickyHeader({ block }: { block: PositionedBlock }) {
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
    </div>
  );
}
