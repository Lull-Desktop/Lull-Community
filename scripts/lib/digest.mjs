/**
 * 内容包 / Widget 包摘要。
 *
 * 算法照 Lull 主仓库 `docs/content-format.md` §6.1 与 `docs/extension-center.md` §6.3
 * 的规范实现（不是抄代码，是按文档重写并做已知值自检）：
 *
 *   scene:  sha256("lull-content-package\0" + id + "\0" + version + "\0"
 *                  + Σ(relPath + "\0" + size + "\0" + bytes + "\0"))
 *   widget: sha256("lull-widget-package\0"  + id + "\0" + version + "\0"
 *                  + Σ(same))
 *
 * - relPath 按 UTF-8 字节序排序，保证可复现；
 * - id/version 拌进摘要，防止把 A 包的摘要抄到 B 包；
 * - scene 的摘要范围是 entry 所在目录；widget 是整包，但排除点号开头的路径
 *   （`.lull-integrity.json` 自己也不在范围内，否则写入锁会改变自身字节）。
 */
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SCENE_SCHEME = "lull-content-package\0";
const WIDGET_SCHEME = "lull-widget-package\0";

/** 官方「雾岚」包的摘要，Rust 与 Node 两侧实现共同的已知值。 */
export const KNOWN_SCENE_DIGEST =
  "f6b86e63434d810099e293bfa74c556542a02fbe96fc7ce97390e0938a608ecb";

/**
 * 收集目录内全部普通文件。遇到符号链接直接抛错：包内不允许链接，
 * 否则「摘要覆盖的字节」与「运行时读到的字节」可能不是同一份。
 *
 * @param {string} dir
 * @param {{ includeDot?: boolean }} [options] widget 需要排除点号路径
 * @returns {{ name: string, absolute: string }[]}
 */
export function listPackageFiles(dir, options = {}) {
  const includeDot = options.includeDot ?? true;
  const out = [];

  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (!includeDot && entry.name.startsWith(".")) continue;
      const absolute = join(current, entry.name);
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`包内不允许符号链接：${name}`);
      }
      if (stat.isDirectory()) {
        walk(absolute, name);
        continue;
      }
      if (stat.isFile()) out.push({ name, absolute });
    }
  };

  walk(dir, "");
  return out.sort((left, right) =>
    Buffer.compare(Buffer.from(left.name, "utf8"), Buffer.from(right.name, "utf8")),
  );
}

/**
 * @param {string} scheme
 * @param {string} id
 * @param {string} version
 * @param {{ name: string, data: Buffer }[]} files 已排序
 */
function digestOf(scheme, id, version, files) {
  const hash = createHash("sha256");
  hash.update(scheme, "utf8");
  for (const part of [id, version]) {
    hash.update(part, "utf8");
    hash.update("\0");
  }
  for (const file of files) {
    hash.update(file.name, "utf8");
    hash.update("\0");
    hash.update(String(file.data.length), "utf8");
    hash.update("\0");
    hash.update(file.data);
    hash.update("\0");
  }
  return hash.digest("hex");
}

/** 读出文件内容，供摘要与打包共用一次 IO。 */
export function readFiles(files) {
  return files.map((file) => ({ name: file.name, data: readFileSync(file.absolute) }));
}

/** 场景包摘要：范围是 entry 所在目录。 */
export function sceneDigest({ id, version, dir }) {
  if (!id || !version) throw new Error("计算摘要需要 id 与 version");
  const files = readFiles(listPackageFiles(dir));
  if (files.length === 0) throw new Error(`内容包目录为空：${dir}`);
  return digestOf(SCENE_SCHEME, id, version, files);
}

/** Widget 包摘要：范围是整包，排除点号开头的路径。 */
export function widgetDigest({ id, version, dir }) {
  if (!id || !version) throw new Error("计算摘要需要 id 与 version");
  const files = readFiles(listPackageFiles(dir, { includeDot: false }));
  if (files.length === 0) throw new Error(`Widget 包目录为空：${dir}`);
  return digestOf(WIDGET_SCHEME, id, version, files);
}

/**
 * 算法自检：用官方「雾岚」包重算，必须等于 Rust 侧的已知值。
 * 不一致说明实现漂移了，此时打出来的一切 zip 都会被安装器以
 * `integrity.mismatch` 拒绝——所以在校验和打包前都先跑这一步。
 *
 * @param {string} mistDir 雾岚包内容目录（含 index.html 的那一层）
 */
export function assertDigestAlgorithm(mistDir) {
  let digest;
  try {
    digest = sceneDigest({ id: "community.mist", version: "1.0.0", dir: mistDir });
  } catch (error) {
    throw new Error(`摘要自检无法执行：${error.message}`);
  }
  if (digest !== KNOWN_SCENE_DIGEST) {
    throw new Error(
      `摘要算法自检失败：算出 ${digest}，期望 ${KNOWN_SCENE_DIGEST}。\n` +
        "  请对照 docs/content-format.md §6.1 检查实现，否则生成的包会被 Lull 拒绝。",
    );
  }
}

/** 把 entry 换算成包内目录（entry 必须位于子目录内）。 */
export function packageDirFor(entry, packageRoot) {
  const segments = typeof entry === "string" ? entry.split("/") : [];
  if (segments.length < 2) {
    throw new Error(
      `entry 必须位于包内的独立目录（例如 scenes/mist/index.html），当前为 ${String(entry)}`,
    );
  }
  return join(packageRoot, ...segments.slice(0, -1));
}

export { SCENE_SCHEME, WIDGET_SCHEME };
