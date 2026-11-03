/**
 * 终端会话创建时的代理快照登记表。
 *
 * PTY 只在创建时注入一次代理环境变量（`shell_init::build_command`），
 * 「设置里的终端代理」与「已存在终端实际生效的代理」可能不一致。
 * 这里按 leafId 记录每个终端会话创建时使用的代理 URL（null 表示未注入），
 * 供状态栏判断是否需要提示用户刷新终端。开关关了再开、URL 与创建时一致
 * 的话快照相同，不会误报为已变更。
 */

type Listener = () => void;

const spawnedProxyByLeaf = new Map<number, string | null>();
const listeners = new Set<Listener>();
let version = 0;

function emit(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** 终端 PTY 创建时登记该会话实际使用的终端代理。 */
export function recordLeafSpawnedProxy(
  leafId: number,
  proxyUrl: string | null,
): void {
  spawnedProxyByLeaf.set(leafId, proxyUrl);
  emit();
}

/** 终端会话销毁时移除登记。 */
export function forgetLeafSpawnedProxy(leafId: number): void {
  if (!spawnedProxyByLeaf.delete(leafId)) return;
  emit();
}

export function subscribeLeafSpawnedProxy(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** useSyncExternalStore 快照：登记表版本号。 */
export function getLeafSpawnedProxyVersion(): number {
  return version;
}

/** 是否存在创建时代理与当前设置不一致的终端（需刷新才能生效）。 */
export function hasTerminalProxyDrift(currentProxyUrl: string | null): boolean {
  for (const spawned of spawnedProxyByLeaf.values()) {
    if (spawned !== currentProxyUrl) return true;
  }
  return false;
}
