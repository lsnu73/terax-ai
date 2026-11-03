# Windows 上 pnpm tauri build 连环失败：代理、镜像、锁、corepack、NSIS 下载
- 首次出现：2026-10-23
- 影响范围：本机（wang 的 Windows 开发机）的一切 cargo/tauri 构建；其他机器不一定复现
- 复现条件：在本机执行 `pnpm tauri build` 或任何需要从 crates.io 下载依赖的 cargo 命令

## 表象

按出现顺序：
1. cargo 报 `Could not connect to index.crates.io:443 over proxy localhost` 或 `transfer too slow: failed to transfer more than 10 bytes in 30s`；
2. cargo 长时间无任何输出后报 `Blocking waiting for file lock on package cache`；
3. corepack 运行 pnpm 报 `Cannot find matching keyid`；
4. tauri 的 beforeBuildCommand 报 `'pnpm' 不是内部或外部命令`；
5. 捆绑 NSIS 时 `failed to bundle project: timeout: global`（下载 `nsis_tauri_utils.dll` 失败）。

## 根因

五个独立问题叠加：
1. `~/.gitconfig` 里残留 `http.proxy = http://localhost:65532`，代理工具未运行时该端口是死端口，而 cargo 的 HTTP 层会继承这个代理；
2. 本机访问 `static.crates.io` 只有约 9 KB/s，低于 cargo 低速中断阈值；
3. 用任务管理器/终端强行结束后台 bash 任务时，子进程 cargo.exe 不会被一起杀掉，残留的 cargo 持有 `~/.cargo` 包缓存锁，后续命令全部阻塞；
4. 本机 corepack 0.30.0 过旧，签名密钥已过期（npm 已轮换密钥），无法自动安装 pnpm；
5. `scripts/build-cli.mjs` 以**仓库根目录**为 cwd 调用 `cargo build --manifest-path src-tauri/...`，而 cargo 的配置发现从 cwd 向上查找——放在 `src-tauri/.cargo/config.toml` 的镜像配置对它不生效；
6. GitHub Releases 直连超时（tauri 下载 NSIS 插件）。

## 已采用的修复

- 在**仓库根目录**新建 `.cargo/config.toml`（已被 `.gitignore` 覆盖，不入库）：crates-io 源替换为 USTC 稀疏镜像，`[http] proxy = ""` 显式禁代理，`git-fetch-with-cli = true`；
- `npm install -g pnpm@11.9.0`（全局前缀 `C:\Users\wang\NodeRepository` 已在 PATH），绕过 corepack；
- 手动经 `https://ghfast.top/` 镜像下载 `nsis_tauri_utils.dll`（v0.5.3）放到 `%LOCALAPPDATA%\tauri\NSIS\Plugins\x86-unicode\additional\`；
- 遇到锁阻塞时 `taskkill //F //IM cargo.exe` 清掉全部残留 cargo 再重试。

## 复发防护

`.cargo/config.toml` 留在仓库根目录（gitignored），本机后续构建自动生效；若换机器或删除该文件后再次遇到上述报错，按本条「已采用的修复」逐项重建环境。根因 3 的防护是操作纪律：结束后台构建任务后先 `tasklist //FI "IMAGENAME eq cargo.exe"` 确认无残留。
