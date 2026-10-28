#!/usr/bin/env node
/**
 * `scripts/release.mjs`
 *
 * 一条命令走完「校验 → 重新打包 → 签名 → 验签」。
 *
 *   pnpm release --key ~/lull-release-keys/publisher.pem
 *
 * 为什么要有它：签名不是一次性的命令，它依赖前面两步的产物，顺序错了签出来的东西就是错的；
 * 而在 shell 里串三步又会踩到平台差异——Windows PowerShell 5.1 根本不认 `&&`。
 * 与其在文档里教三种写法，不如把顺序写进脚本。
 *
 * 它只做发布需要的那两步（content:check + build:catalog），
 * 不跑 `next build`：签的是 zip 与索引，站点构建与签名无关。
 *
 * 仍然只在离线机器上用：私钥路径不许在仓库里，`CI` 环境下会被 sign-release 直接拒绝。
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

const key = argValue("--key") ?? process.env.LULL_RELEASE_KEY;

if (!key) {
  console.error(`
用法：pnpm release --key <私钥路径>

  私钥由 scripts/keygen.mjs 在离线机器上生成，不入库。
  也可以设环境变量 LULL_RELEASE_KEY 再跑 pnpm release。

  这条命令会依次执行：
    content:check  → 确认所有作品都能被装进 Lull
    build:catalog  → 重新产出 catalog.json 与 downloads/*.zip
    sign:release   → 用私钥签一份 release/release.json + .sig
    verify:release → 立刻验一遍（--strict，覆盖不全也算失败）
`);
  process.exit(2);
}

const steps = [
  ["content:check", ["scripts/validate-content.mjs"]],
  ["build:catalog", ["scripts/build-catalog.mjs"]],
  ["sign:release", ["scripts/sign-release.mjs", "--key", key]],
  // 签完再生成一次索引：catalog.json 的 release 字段与每项的 signed 标记
  // 都来自 release/，不重跑的话本地会停留在「尚未签名」的旧状态。
  ["build:catalog (refresh)", ["scripts/build-catalog.mjs"]],
  ["verify:release --strict", ["scripts/verify-release.mjs", "--strict"]],
];

for (const [label, args] of steps) {
  console.log(`\n▸ pnpm ${label}`);
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n✗ ${label} 失败，后面的步骤没有执行。`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n✓ 发布签名完成。下一步：\n");
console.log("  git add release/ && git commit -m \"content(release): 签一批发布\"");
console.log("  git push   # 建议开 PR，让别人核对一眼 diff\n");
