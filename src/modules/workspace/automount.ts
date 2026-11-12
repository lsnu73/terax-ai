import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/** Resolves the distro's `/etc/wsl.conf` [automount] root; null while unresolved. */
export async function fetchWslAutomountRoot(distro: string): Promise<string> {
  const cached = cache.get(distro);
  if (cached !== undefined) return cached;
  const root = await invoke<string>("wsl_automount_root", { distro });
  cache.set(distro, root);
  return root;
}

/** Only queries WSL while enabled, so closed surfaces never spawn wsl.exe. */
export function useWslAutomountRoot(
  distro: string | null,
  enabled: boolean,
): string | null {
  const [root, setRoot] = useState<string | null>(null);

  useEffect(() => {
    if (!distro || !enabled) {
      setRoot(null);
      return;
    }
    const cached = cache.get(distro);
    if (cached !== undefined) {
      setRoot(cached);
      return;
    }
    let live = true;
    fetchWslAutomountRoot(distro)
      .then((value) => {
        if (live) setRoot(value);
      })
      .catch(() => {
        if (live) setRoot(null);
      });
    return () => {
      live = false;
    };
  }, [distro, enabled]);

  return root;
}
