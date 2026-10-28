#!/usr/bin/env node
/**
 * `scripts/verify-release.mjs`
 *
 * 验「这批发布字节确实是 community 发的」，CI 与本地用的是同一份逻辑。
 *
 *   pnpm verify:release            # 默认：签名坏了才失败，清单过期只警告
 *   pnpm verify:release --strict   # 发布前用：连「有内容没被签名覆盖」也算失败
 *   pnpm verify:release --json     # 给脚本看的输出
 *
 * 检查项（编号与 docs/issue-submission-plan.md §3.10 对应）：
 *   V1 release.json / .sig 存在且结构合法
 *   V2 keyId 认得、未撤销、在签名时间点有效
 *   V3 对清单原始字节验签通过
 *   V4 清单里列出的 zip 若存在，sha256 必须一致   ← 已签名的字节被改，必须拦住
 *   V5 清单里列出的 zip 不存在（被新版本取代 / 下架）→ 提示重签
 *   V6 当前内容里有、清单里没有 → 提示重签
 *   V7 releaseSeq 必须比上次真正修改清单的提交大（防回滚，警告）
 *   V8 v2 清单里每个 item 的逐包签名存在、验签通过、声明与 item 一致
 *   V9 release/signatures/ 里没有当前清单之外的孤立签名（警告）
 *
 * **V1–V4、V8 阻断部署。** 清单是「上一次签名时的快照」，不是「当前内容清单」；
 * 把 V5–V7 做成错误，就会变成「每次合并都要立刻离线重签」，自动部署链直接断。
 * 旧版 v1 没有逐包签名，默认只警告；`--strict` 时要求重签。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

import { RELEASE_FILE, sha256Hex, verifyRelease } from "./lib/signing.mjs";
import { verifyPackageSignatures } from "./lib/package-signature.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 对某个仓库根做全套检查。返回 `{ ok, signed, keyId, errors, warnings }`，
 * 每条都是 `{ code, message }`。纯本地，不联网。
 */
export const checkRelease = (root, { strict = false, now = Date.now(), checkHistory = true } = {}) => {
  const PUBLIC = join(root, "site", "public");
  const CATALOG = join(root, "site", "src", "generated", "catalog.json");

  const errors = [];
  const warnings = [];
  const error = (code, message) => errors.push({ code, message });
  const warn = (code, message) => warnings.push({ code, message });

  const check = verifyRelease(root, { now });
  errors.push(...check.errors.map((message) => ({ code: "V1", message })));
  warnings.push(...check.warnings.map((message) => ({ code: "V5", message })));

  const exists = check.release.exists;
  const data = check.release.data;

  // 清单本身无效（签名坏、结构错）时，绝不能用它里面的路径去读本地文件。
  // 这既是「不消费未验证数据」，也堵住 zip.path 里带 ../ 的越界读取。
  if (errors.length > 0) {
    return { ok: false, signed: false, keyId: check.key?.keyId ?? null, errors, warnings };
  }

  if (!exists) {
    if (strict) error("V1", "还没有发布清单：--strict 要求先签一次");
    return { ok: errors.length === 0, signed: false, keyId: null, errors, warnings };
  }

  // V8/V9：v2 清单的逐包签名。旧版 v1 只提示，--strict 时要求重签。
  const signatures = verifyPackageSignatures({ root, release: data, key: check.key, now });
  errors.push(...signatures.errors.map((message) => ({ code: "V8", message })));
  // 旧版的提示由 verifyRelease 统一发（V5）；这里不再重复一条措辞不同的 V8。
  if (!signatures.legacy) {
    warnings.push(...signatures.warnings.map((message) => ({ code: "V8", message })));
  }
  if (strict && signatures.legacy) {
    error("V8", "清单是旧版 schemaVersion 1，没有逐包签名：先重新运行 pnpm release 生成 v2");
  }

  if (data) {
    const catalog = existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, "utf8")) : null;

    // V4 / V5：清单承诺的 zip 与本地产物
    for (const item of data.items ?? []) {
      const raw = String(item?.zip?.path ?? "");
      // 只接受站点绝对路径。之前这里直接 join(PUBLIC, relative)，签名无效的清单
      // 也能用 ../ 读到 public 之外的文件；现在清单无效时已经在上面提前返回，
      // 这里再做一次形状检查，避免将来别处复用这段时又踩一次。
      const relative = raw.replace(/^\//, "");
      const segments = relative.split("/");
      if (
        !relative ||
        relative.includes("\\") ||
        /^[A-Za-z]:/.test(relative) ||
        segments.some((segment) => segment === "" || segment === "." || segment === "..")
      ) {
        error("V4", `清单里的 \`${item?.slug}\` 的 zip.path 不安全或不是站点绝对路径：${raw}`);
        continue;
      }
      const local = join(PUBLIC, relative);
      if (!existsSync(local)) {
        warn("V5", `清单里的 \`${item?.slug}\` 已没有对应产物（被新版本取代或已下架），需要重新签名`);
        continue;
      }
      // 先比长度：不符就不必算哈希，报错也更直观（差了几个字节 / 差了几个数量级）
      const size = statSync(local).size;
      if (Number.isInteger(item.zip.bytes) && size !== item.zip.bytes) {
        error(
          "V4",
          `\`${item.slug}\` 的 zip 大小与清单不符：清单 ${item.zip.bytes} 字节，实际 ${size} 字节。` +
            "已签名的字节被改过——要么还原，要么重新签名",
        );
        continue;
      }
      const digest = sha256Hex(readFileSync(local));
      if (digest !== item.zip.sha256) {
        error(
          "V4",
          `\`${item.slug}\` 的 zip 与签名清单不符：清单 ${String(item.zip.sha256).slice(0, 12)}…，实际 ${digest.slice(0, 12)}…` +
            "。已签名的字节被改过——要么还原，要么重新签名",
        );
      }
    }

    // V6：当前内容的覆盖度
    if (catalog) {
      const signed = new Map((data.items ?? []).map((item) => [`${item.kind}:${item.id}`, item]));
      for (const item of catalog.items ?? []) {
        const covered = signed.get(`${item.kind}:${item.id}`);
        if (!covered) {
          const message = `${item.kind} \`${item.id}\` 还没进签名清单（站点上会标为「来源未验证」）`;
          if (strict) error("V6", message);
          else warn("V6", message);
        } else if (covered.version !== item.version) {
          warn("V6", `${item.kind} \`${item.id}\` 已更新到 ${item.version}，签名清单里还是 ${covered.version}`);
        }
      }
    }

    // V7：防回滚。只在 release.json 真的在本次提交里变化时比较，
    // 否则每个无关提交都会误报「没有递增」。
    if (checkHistory) {
      const previous = readPreviousRelease(root);
      if (previous && Number.isInteger(previous.releaseSeq)) {
        if (Number(data.releaseSeq) <= previous.releaseSeq) {
          warn(
            "V7",
            `releaseSeq 没有递增（上一次 ${previous.releaseSeq}，这次 ${data.releaseSeq}）：` +
              "可能是把旧清单贴回来了；请重新签，不要手改清单",
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, signed: check.signed, keyId: check.key?.keyId ?? null, errors, warnings };
};

/**
 * 取本次提交之前那份 release.json；没有历史、或本次没有改这个文件时返回 null。
 *
 * 用 `HEAD^1..HEAD` 而不是 `HEAD~1:...`：合并提交的 `HEAD~1` 可能是旁支，
 * 而 `HEAD^1` 是主干一侧。只在 `release.json` 真的变化时才比较，避免无关提交误报。
 */
const readPreviousRelease = (root) => {
  try {
    const changed = execFileSync(
      "git",
      ["diff", "--name-only", "HEAD^1", "HEAD", "--", RELEASE_FILE],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    if (changed === "") return null;
    const text = execFileSync("git", ["show", `HEAD^1:${RELEASE_FILE}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return text.trim() === "" ? null : JSON.parse(text);
  } catch {
    // 首次提交、浅克隆、或没有 git：不是错误
    return null;
  }
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const strict = process.argv.includes("--strict");
  const asJson = process.argv.includes("--json");
  const result = checkRelease(ROOT, { strict });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!result.signed && result.errors.length === 0) {
    console.log("· 尚未签名：站点上所有作品都会标为「来源未验证」，这不影响安装与运行。");
  } else if (result.ok) {
    console.log(`✓ 发布清单验签通过：keyId ${result.keyId}`);
  } else {
    console.error("✗ 发布清单验签失败：");
    for (const item of result.errors) console.error(`  [${item.code}] ${item.message}`);
  }
  if (!asJson) {
    for (const item of result.warnings) console.log(`  [${item.code}] ${item.message}`);
  }
  process.exit(result.ok ? 0 : 1);
}
