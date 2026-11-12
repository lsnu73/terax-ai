type ModelAutosaveFlush = () => Promise<boolean>;

/** True once the user leaves the visible Models section by navigation or tab switch. */
export function isLeavingModelsSettings(
  previousSection: string,
  previousVisible: boolean,
  activeSection: string,
  activeVisible: boolean,
): boolean {
  return (
    previousSection === "models" &&
    previousVisible &&
    !(activeSection === "models" && activeVisible)
  );
}

const flushes = new Set<ModelAutosaveFlush>();
const activeSaves = new Set<Promise<boolean>>();

/** Called when the provider form unmounts or the models section is left. */
export function registerModelAutosaveFlush(
  flush: ModelAutosaveFlush,
): () => void {
  flushes.add(flush);
  return () => flushes.delete(flush);
}

/** Tracks an in-flight save so a leave notice can wait for it to settle. */
export function trackModelAutosave(
  promise: Promise<boolean>,
): Promise<boolean> {
  activeSaves.add(promise);
  return promise.finally(() => activeSaves.delete(promise));
}

/**
 * Flushes every registered provider form, then waits for saves already in
 * flight. Returns false when any form could not save its current draft.
 */
export async function settleModelAutosave(): Promise<boolean> {
  let saved = true;
  const flushResults = await Promise.all(
    [...flushes].map(async (flush) => {
      try {
        return await flush();
      } catch {
        return false;
      }
    }),
  );
  saved = flushResults.every(Boolean);

  while (activeSaves.size > 0) {
    const pending = [...activeSaves];
    const results = await Promise.all(
      pending.map((promise) => promise.catch(() => false)),
    );
    saved = saved && results.every(Boolean);
  }
  return saved;
}
