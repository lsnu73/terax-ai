import { BlockOverlay } from "@/modules/terminal/block/BlockOverlay";
import { ensureGhosttyBlocks } from "@/modules/terminal/ghostty/ghosttyBlockSessions";
import { ghosttyBlockCellHeight } from "@/modules/terminal/ghostty/useGhosttyTerminalSession";
import { useCallback } from "react";

type Props = {
  leafId: number;
  onCloseSearch: () => void;
};

export default function GhosttyBlockOverlay({ leafId, onCloseSearch }: Props) {
  const state = ensureGhosttyBlocks(leafId);
  const getVisible = useCallback(
    () =>
      state.controller?.visibleBlocks(ghosttyBlockCellHeight(leafId)) ?? {
        blocks: [],
        sticky: null,
        generation: 0,
      },
    [leafId, state],
  );
  const getTimeline = useCallback(
    () => state.controller?.timeline() ?? null,
    [state],
  );
  const reveal = useCallback(
    (id: string) => state.controller?.revealBlock(id, true),
    [state],
  );
  const closeSearch = useCallback(() => {
    state.controller?.clearSearch();
    onCloseSearch();
  }, [state, onCloseSearch]);
  return (
    <BlockOverlay
      subscribe={state.subscribeViewport}
      getVisible={getVisible}
      getTimeline={getTimeline}
      onReveal={reveal}
      onCloseSearch={closeSearch}
    />
  );
}
