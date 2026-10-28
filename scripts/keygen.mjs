#!/usr/bin/env node
/**
 * `scripts/keygen.mjs`
 *
 * 生成 community 的发布密钥对（Ed25519）。**只在离线机器上跑**。
 *
 *   node scripts/keygen.mjs --out ~/lull-release-keys
 *
 * 产出：
 *   <out>/publisher.pem        私钥（PKCS#8）。这是发布权，不入库、不进 CI、不外传。
 *   <out>/publisher.pub.pem    公钥。抄进 keys/publisher-keys.json。
 *
 * 脚本会把公钥清单条目直接打到终端，复制粘贴即可。
 * 拒绝在 CI 上运行，拒绝把私钥写进仓库目录，拒绝覆盖已有私钥（覆盖等于换掉发布权）。
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expandHome, generateKeyPairPem } from "./lib/signing.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const argValue = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};

const bail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};

if (process.env.CI) {
  bail("检测到 CI 环境：发布密钥必须离线生成，CI 永远不接触私钥。");
}

const rawOut = expandHome(argValue("--out", join(homedir(), "lull-release-keys")));
const outDir = isAbsolute(rawOut) ? rawOut : resolve(process.env.INIT_CWD ?? process.cwd(), rawOut);

const insideRepo = relative(ROOT, outDir);
if (!insideRepo.startsWith("..") && !isAbsolute(insideRepo)) {
  bail(
    `拒绝把私钥写进仓库目录（${insideRepo}）。\n` +
      "  换一个仓库外的目录，例如 --out ~/lull-release-keys，\n" +
      "  再把公钥那一行抄进 keys/publisher-keys.json。",
  );
}

const privatePath = join(outDir, "publisher.pem");
const publicPath = join(outDir, "publisher.pub.pem");

if (existsSync(privatePath)) {
  bail(
    `${privatePath} 已存在。\n` +
      "  覆盖等于换掉发布权：旧密钥签过的清单将再也验不过。\n" +
      "  确实要换密钥，请先按 RELEASING.md 的轮换流程处理（旧密钥只 retiredAt，不删）。",
  );
}

mkdirSync(outDir, { recursive: true });
const { publicPem, privatePem, keyId } = generateKeyPairPem();

writeFileSync(privatePath, privatePem, { mode: 0o600 });
writeFileSync(publicPath, publicPem);

const entry = {
  keyId,
  algorithm: "ed25519",
  publicKey: publicPem,
  notBefore: new Date().toISOString().slice(0, 10),
  retiredAt: null,
  revoked: false,
  note: "community 发布密钥",
};

console.log(`✓ 已生成密钥对（keyId ${keyId}）`);
console.log(`  私钥：${privatePath}   ← 离线保管，绝不入库`);
console.log(`  公钥：${publicPath}`);
console.log("\n把下面这一条加进 keys/publisher-keys.json 的 keys 数组，然后提交 PR：\n");
console.log(JSON.stringify(entry, null, 2));
console.log("\n之后签名时用：pnpm sign:release --key <私钥路径>\n");
