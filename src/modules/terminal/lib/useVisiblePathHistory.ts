import { useMemo } from "react";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  WSL_DEFAULT_AUTOMOUNT_ROOT,
  normalizePathHistoryForEnv,
} from "@/modules/terminal/lib/pathHistory";
import {
  useWslAutomountRoot,
  useWorkspaceEnvStore,
} from "@/modules/workspace";

export function useVisiblePathHistory(
  history: readonly string[],
  enabled = true,
): string[] {
  const env = useWorkspaceEnvStore((s) => s.env);
  const lastWslDistro = usePreferencesStore((s) => s.lastWslDistro);
  const distro = env.kind === "wsl" ? env.distro : lastWslDistro;
  const resolvedRoot = useWslAutomountRoot(distro, enabled);
  const automountRoot = resolvedRoot ?? WSL_DEFAULT_AUTOMOUNT_ROOT;
  return useMemo(
    () => normalizePathHistoryForEnv(history, env, automountRoot),
    [history, env, automountRoot],
  );
}
