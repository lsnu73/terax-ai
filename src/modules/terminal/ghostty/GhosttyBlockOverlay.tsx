import { useCallback, useSyncExternalStore } from "react";
import { BlockOverlay } from "@/modules/terminal/block/BlockOverlay";
import { BlockWatermark } from "@/modules/terminal/block/BlockWatermark";
import { ensureGhosttyBlocks } from "@/modules/terminal/ghostty/ghosttyBlockSessions";
import { ghosttyBlockCellHeight } from "@/modules/terminal/ghostty/useGhosttyTerminalSession";
import { submitToLeaf } from "@/modules/terminal/lib/terminalSessionApi";

type Props = {
  leafId: number;
  searchId: string | null;
  onCloseSearch: () => void;
};

export default function GhosttyBlockOverlay({
  leafId,
  searchId,
  onCloseSearch,
}: Props) {
  const state = ensureGhosttyBlocks(leafId);
  const mode = useSyncExternalStore(state.subscribeMode, state.getMode);
  const getVisible = useCallback(
    () =>
      state.controller?.visibleBlocks(ghosttyBlockCellHeight(leafId)) ?? {
        blocks: [],
        sticky: null,
        generation: 0,
      },
    [leafId, state],
  );
  const closeSearch = useCallback(() => {
    state.controller?.clearSearch();
    onCloseSearch();
  }, [state, onCloseSearch]);
  return (
    <>
      <BlockWatermark leafId={leafId} subscribe={state.subscribeContent} />
      <BlockOverlay
        subscribe={state.subscribeViewport}
        getVisible={getVisible}
        searchBlock={(id, query, signal) =>
          state.controller?.searchBlock(id, query, signal) ??
          Promise.resolve([])
        }
        revealMatch={(match) => state.controller?.revealMatch(match)}
        clearSearch={() => state.controller?.clearSearch()}
        searchId={searchId}
        onCloseSearch={closeSearch}
        promptReady={mode === "prompt"}
        onRunAgain={(command) => submitToLeaf(leafId, command)}
      />
    </>
  );
}
