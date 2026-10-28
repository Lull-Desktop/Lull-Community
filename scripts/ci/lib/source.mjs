/**
 * `scripts/ci/lib/source.mjs`
 *
 * 把一个「作者自己仓库里的作品目录」取出来。
 *
 * 投稿只给三样东西：仓库的 https 地址、一个 ref（tag / 分支 / 完整 commit）、
 * 目录在仓库里的相对路径。ref 在这里**只解析一次**成 commit，之后审查、`/merge <commit>`、
 * 导入全部绑定这个 commit——作者事后移动 tag 不影响已经审过的内容。
 *
 * 仓库一律当作**数据**取：单 commit 浅取、禁 hooks、禁子模块、禁 LFS、禁 ext/file 协议，
 * 取回来只在目标目录上复制，绝不执行其中任何内容。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FULL_SHA = /^[0-9a-f]{40}$/;
const FETCH_TIMEOUT_MS = 120_000;

/**
 * 校验提交上来的仓库地址：https、不带凭据、不带 query/fragment、
 * 至少两段路径（owner/repo）。返回归一化地址（去掉尾部 `/` 与 `.git`），不合法返回 null。
 */
export const normalizeRepositoryUrl = (value) => {
  let url;
  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
  const pathname = url.pathname.replace(/\/+$/, "").replace(/\.git$/, "");
  if (!/^\/[^/]+\/.+/.test(pathname)) return null;
  return `https://${url.host}${pathname}`;
};

/**
 * 仓库内作品目录：空 = 仓库根，否则是正斜杠相对路径。
 * 试图离开仓库（`..`、绝对路径、反斜杠、盘符）返回 null。
 */
export const normalizeItemPath = (value) => {
  const raw = String(value ?? "").trim().replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (raw === "" || raw === ".") return "";
  if (raw.startsWith("/") || raw.includes("\\") || /^[a-zA-Z]:/.test(raw)) return null;
  const segments = raw.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return null;
  return segments.join("/");
};

/** ref 要么是完整 commit，要么是一个 git 能接受的 tag/分支名。 */
export const isValidRef = (value) => {
  const ref = String(value ?? "").trim();
  if (FULL_SHA.test(ref.toLowerCase())) return true;
  return (
    /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(ref) &&
    !ref.includes("..") &&
    !ref.endsWith(".lock") &&
    !ref.endsWith("/")
  );
};

/**
 * 从 `git ls-remote` 的输出里挑出 ref 指向的 commit。
 * 附注标签会列两行，`^{}` 那行才是 commit；同名时 tag 优先于分支。
 */
export const pickCommitFromLsRemote = (output, ref) => {
  const lines = String(output ?? "")
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 2);
  const find = (name) => lines.find(([, refName]) => refName === name)?.[0] ?? null;
  return find(`refs/tags/${ref}^{}`) ?? find(`refs/tags/${ref}`) ?? find(`refs/heads/${ref}`) ?? null;
};

/** 导入时要跳过的目录项：版本库内部、依赖、系统垃圾文件。 */
export const isExcludedFromImport = (segment) =>
  segment === "node_modules" || segment === ".git" || segment === ".DS_Store" || segment === ".gitignore" || segment === ".gitattributes";

const gitEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_LFS_SKIP_SMUDGE: "1",
  GIT_CONFIG_NOSYSTEM: "1",
};

/**
 * 传给 git 的目标地址。生产里永远是 https，只有测试会传本地路径；
 * Windows 的 `C:\...` 反斜杠 git 不认，转成正斜杠。
 */
const gitTarget = (value) => {
  const text = String(value);
  return /^[a-zA-Z]:[\\/]/.test(text) ? text.replaceAll("\\", "/") : text;
};

const git = (args, { cwd, allowLocal = false } = {}) =>
  execFileSync(
    "git",
    [
      "-c",
      `protocol.file.allow=${allowLocal ? "always" : "never"}`,
      "-c",
      "protocol.ext.allow=never",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "submodule.recurse=false",
      "-c",
      "advice.detachedHead=false",
      ...args,
    ],
    { cwd, env: gitEnv, encoding: "utf8", timeout: FETCH_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"] },
  ).trim();

/**
 * 把 ref 解析成完整 commit。完整 commit 直接采信（是否真的存在由 fetch 证明），
 * tag 与分支走 `ls-remote`。`allowLocal` 只给测试用（file:// 仓库）。
 */
export const resolveRef = (url, ref, { allowLocal = false } = {}) => {
  const value = String(ref).trim();
  if (FULL_SHA.test(value.toLowerCase())) return value.toLowerCase();
  const output = git(["ls-remote", "--tags", "--heads", gitTarget(url), value, `${value}^{}`], { allowLocal });
  const commit = pickCommitFromLsRemote(output, value);
  if (!commit) throw new Error(`仓库里找不到 tag 或分支 \`${value}\``);
  return commit;
};

/**
 * 取回指定 commit 到临时目录并检出。`ref`（tag/分支名）按名字一起试，
 * 因为有些宿主拒绝直接按任意 commit 取。两种方式都必须最终检出同一个 commit。
 */
export const fetchCommit = (url, commit, { ref = null, allowLocal = false } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lull-source-"));
  git(["init", "-q", dir]);
  git(["remote", "add", "origin", gitTarget(url)], { cwd: dir });
  const wants = [commit, ...(ref && !FULL_SHA.test(ref) ? [ref] : [])];
  let fetched = false;
  let lastError = null;
  for (const want of wants) {
    try {
      git(["fetch", "-q", "--depth", "1", "--no-tags", "--no-recurse-submodules", "origin", want], {
        cwd: dir,
        allowLocal,
      });
      if (git(["rev-parse", "FETCH_HEAD"], { cwd: dir }) === commit) {
        fetched = true;
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (!fetched) {
    fs.rmSync(dir, { recursive: true, force: true });
    const detail = lastError ? `：${String(lastError.stderr ?? lastError.message).trim().split("\n").pop()}` : "";
    throw new Error(`无法从仓库取得提交 \`${commit.slice(0, 12)}\`${detail}；请确认仓库公开、ref 正确`);
  }
  git(["checkout", "-q", "--detach", "FETCH_HEAD"], { cwd: dir });
  return dir;
};

/**
 * 把仓库里的作品目录复制到 `<stagingRoot>/<slug>/`，跳出版本库与依赖。
 *
 * 符号链接**原样复制**，让摘要计算的「包内不允许符号链接」检查去拒绝它——
 * 静默跟随会让「摘要覆盖的字节」与「运行时读到的字节」不是同一份。
 */
export const stageItemFiles = (checkoutDir, itemPath, slug, stagingRoot) => {
  const sourceDir = itemPath ? path.join(checkoutDir, ...itemPath.split("/")) : checkoutDir;
  if (!fs.existsSync(sourceDir) || !fs.lstatSync(sourceDir).isDirectory()) {
    throw new Error(`仓库里没有目录 \`${itemPath || "/"}\``);
  }
  const target = path.join(stagingRoot, slug);
  fs.mkdirSync(target, { recursive: true });
  const copy = (from, to) => {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      if (isExcludedFromImport(entry.name)) continue;
      const source = path.join(from, entry.name);
      const destination = path.join(to, entry.name);
      if (entry.isSymbolicLink()) {
        fs.symlinkSync(fs.readlinkSync(source), destination);
      } else if (entry.isDirectory()) {
        fs.mkdirSync(destination);
        copy(source, destination);
      } else if (entry.isFile()) {
        fs.copyFileSync(source, destination);
      }
    }
  };
  copy(sourceDir, target);
  return target;
};

/**
 * 维护者审查时点开的链接：该 commit 下的作品目录，以及（更新时）与已收录 commit 的对比。
 * 只认已知宿主，别的一律不给链接。
 */
export const reviewLinks = (repository, commit, itemPath, previousCommit = null) => {
  let host;
  try {
    host = new URL(repository).host;
  } catch {
    return { tree: null, compare: null };
  }
  const suffix = itemPath ? `/${itemPath}` : "";
  if (host === "github.com") {
    return {
      tree: `${repository}/tree/${commit}${suffix}`,
      compare: previousCommit ? `${repository}/compare/${previousCommit}...${commit}` : null,
    };
  }
  if (host === "gitlab.com") {
    return {
      tree: `${repository}/-/tree/${commit}${suffix}`,
      compare: previousCommit ? `${repository}/-/compare/${previousCommit}...${commit}` : null,
    };
  }
  if (host === "codeberg.org") {
    return {
      tree: `${repository}/src/commit/${commit}${suffix}`,
      compare: previousCommit ? `${repository}/compare/${previousCommit}...${commit}` : null,
    };
  }
  return { tree: null, compare: null };
};
