#!/usr/bin/env node
/**
 * `scripts/sign-release.mjs`
 *
 * 离线签一批发布：先为每个包写一份逐包签名 sidecar，再把「这次要发布的全部字节」
 * 压成一份清单，用 community 的私钥签一次。
 *
 *   pnpm build            # 先产出 site/src/generated/catalog.json 与 public/downloads/*.zip
 *   pnpm sign:release --key ~/lull-release-keys/publisher.pem
 *
 * 只有这一步需要私钥，而且它**永远在离线机器上跑**：脚本看到 `CI` 就直接退出。
 * 产出的文件都要提交：
 *   release/signatures/<kind>/<slug>-<version>.lull-signature.json  逐包签名
 *   release/release.json       发布清单（每项的整包摘要 + zip 的 sha256 + signature 指针）
 *   release/release.json.sig   对清单原始字节的 Ed25519 签名（单行 base64）
 *
 * 签完立刻用公钥自验一次（清单 + 每个包）——签坏了当场知道，不要等到 CI 上只看到「验签失败」四个字。
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ZIP_TIMESTAMP, packageZipEntries, packageZipName } from "./lib/package-zip.mjs";
import { loadContent } from "./validate-content.mjs";
import { writeZip } from "./lib/zip.mjs";

import {
  RELEASE_DIR,
  RELEASE_FILE,
  RELEASE_SCHEMA_VERSION,
  RELEASE_SIGNATURES_DIR,
  SIGNATURE_FILE,
  assertOfflineSigningAllowed,
  canonicalReleaseJson,
  expandHome,
  findSigningKey,
  keyIdOf,
  loadPublicKeys,
  publicKeyPemOf,
  readRelease,
  sha256Hex,
  signBytes,
  verifyRelease,
} from "./lib/signing.mjs";
import { verifyPackageSignatures, writePackageSignature } from "./lib/package-signature.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = join(ROOT, "site", "src", "generated", "catalog.json");
const PUBLIC = join(ROOT, "site", "public");

const bail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

const keyPath = argValue("--key");
if (!keyPath) {
  bail("用法：pnpm sign:release --key <私钥路径>\n  私钥由 scripts/keygen.mjs 在离线机器上生成，不入库。");
}

try {
  assertOfflineSigningAllowed(keyPath, ROOT);
} catch (error) {
  bail(error.message);
}

if (!existsSync(CATALOG)) {
  bail("找不到 site/src/generated/catalog.json：先跑 pnpm build（或 pnpm build:catalog）。");
}

const privateKeyPem = readFileSync(resolve(expandHome(keyPath)), "utf8");
const publicKeyPem = publicKeyPemOf(privateKeyPem);
const keyId = keyIdOf(publicKeyPem);

// 公钥必须先登记在仓库里，否则签出来的东西 CI 一定验不过——先拦在这里。
const usable = findSigningKey(loadPublicKeys(ROOT), keyId);
if (usable.error) {
  bail(
    `${usable.error}\n` +
      `  这把私钥对应的公钥要先加进 keys/publisher-keys.json：\n\n` +
      publicKeyPem
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
  );
}

const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));

// 从内容目录重新读一遍：签名必须覆盖「当前内容」的摘要，不能信任可能已经
// 过期的 catalog.json。zip 也在这里用共享的 package-zip 入口重新生成，
// 保证 build-catalog 刷新时能打出完全相同的字节。
const content = loadContent({ root: ROOT, fix: false });
if (content.errors > 0) {
  for (const problem of content.problems) {
    if (problem.level === "error") {
      console.error(`  · ${problem.where}: ${problem.message}`);
    }
  }
  bail("内容校验未通过：先修 content:check 再签名。");
}

const previous = readRelease(ROOT);
const previousSeq = previous.exists && Number.isInteger(previous.data?.releaseSeq) ? previous.data.releaseSeq : 0;

let builtFrom = "";
try {
  builtFrom = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  builtFrom = "";
}

const release = {
  schemaVersion: RELEASE_SCHEMA_VERSION,
  releaseSeq: previousSeq + 1,
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  signedBy: { keyId, algorithm: "ed25519" },
  repo: { url: catalog.repo?.url ?? "https://github.com/Lull-Desktop/Lull-Community", builtFrom },
  items: [],
};

// 先逐包签，再用「内容 + 包内签名」重新打 zip：
// - 签名放在包根 `.lull-signature.json`，宿主下载一个 zip 就能验；
// - zip 的 sha256 在签名之后才算，写进 release.json 的批次清单；
// - 每次重建目录，避免上一批的孤立签名被带进这一批。
rmSync(join(ROOT, RELEASE_SIGNATURES_DIR), { recursive: true, force: true });
const downloads = join(PUBLIC, "downloads");
rmSync(downloads, { recursive: true, force: true });
mkdirSync(downloads, { recursive: true });

const items = [];
for (const contentItem of content.items) {
  const item = {
    kind: contentItem.kind,
    slug: contentItem.slug,
    id: contentItem.manifest.id,
    version: contentItem.manifest.version,
    digest: contentItem.digest,
  };
  const signed = writePackageSignature({ root: ROOT, release, item, privateKeyPem });
  const entries = packageZipEntries(contentItem, signed.bytes);
  const zipName = packageZipName(contentItem);
  const zipPath = join(downloads, zipName);
  writeZip(zipPath, entries, ZIP_TIMESTAMP);
  const zipBytes = readFileSync(zipPath);

  item.zip = {
    path: `/downloads/${zipName}`,
    sha256: sha256Hex(zipBytes),
    bytes: zipBytes.length,
  };
  item.signature = { path: signed.path, sha256: signed.sha256 };
  items.push(item);
}
release.items = items;

const text = canonicalReleaseJson(release);
const signature = signBytes(Buffer.from(text, "utf8"), privateKeyPem);

mkdirSync(join(ROOT, RELEASE_DIR), { recursive: true });
writeFileSync(join(ROOT, RELEASE_FILE), text);
writeFileSync(join(ROOT, SIGNATURE_FILE), `${signature}\n`);

// 自验：走的是 CI 那条一模一样的路径（读盘 → 找公钥 → 验签 → 规范化核对）。
const check = verifyRelease(ROOT);
const signatureCheck = verifyPackageSignatures({
  root: ROOT,
  release: check.release.data ?? release,
  key: check.key,
});
if (!check.ok || signatureCheck.errors.length > 0) {
  for (const error of check.errors) console.error(`  · ${error}`);
  for (const error of signatureCheck.errors) console.error(`  · [逐包] ${error}`);
  bail("签名写完但自验失败：不要提交，先按上面的错误修。");
}
if (signatureCheck.verified.size !== items.length) {
  bail(
    `逐包签名自验覆盖不全：清单 ${items.length} 个条目，只有 ${signatureCheck.verified.size} 个通过`,
  );
}

const totalBytes = items.reduce((sum, item) => sum + item.zip.bytes, 0);
console.log("✓ 已签名");
console.log(`  keyId      ${keyId}`);
console.log(`  releaseSeq ${release.releaseSeq}`);
console.log(`  时间       ${release.generatedAt}`);
console.log(`  条目       ${items.length} 个（壁纸 ${items.filter((i) => i.kind === "scene").length}，插件 ${items.filter((i) => i.kind === "widget").length}）`);
console.log(`  总字节     ${(totalBytes / 1024).toFixed(1)} KiB`);
console.log(`  逐包签名   ${signatureCheck.verified.size} 个 → ${RELEASE_SIGNATURES_DIR}/`);
console.log(`\n提交：${RELEASE_FILE}、${SIGNATURE_FILE}、${RELEASE_SIGNATURES_DIR}/`);
console.log("建议开 PR 让别人看一眼 diff，再合并——签名也值得被第二个人核对。\n");
