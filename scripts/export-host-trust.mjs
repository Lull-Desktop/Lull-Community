#!/usr/bin/env node
/**
 * `scripts/export-host-trust.mjs`
 *
 * 把 `keys/publisher-keys.json`（PEM）导出成宿主可内置的「raw 公钥」信任包。
 *
 *   node scripts/export-host-trust.mjs --out ../lull-app/src-tauri/trust/publisher-keys.json
 *
 * 为什么不让宿主直接读 PEM：
 * - 宿主只需要 Ed25519 的 32 字节公钥，raw 形式没有 PEM 解析依赖；
 * - keyId / fingerprint 仍然由 SPKI DER 推导，和社区脚本完全一致；
 * - 宿主测试会把 keyId / fingerprint 钉死，信任包被误改时直接失败。
 */
import { createHash, createPublicKey } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEYS_FILE = join(ROOT, "keys", "publisher-keys.json");

const argValue = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};

const fail = (message) => {
  console.error(`[export-host-trust] ${message}`);
  process.exit(1);
};

const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

const source = JSON.parse(readFileSync(KEYS_FILE, "utf8"));
if (!source || !Array.isArray(source.keys)) {
  fail(`${KEYS_FILE} 必须是 { schemaVersion, keys: [...] }`);
}

const keys = source.keys.map((entry, index) => {
  const at = `keys[${index}]`;
  if (entry.algorithm !== "ed25519") {
    fail(`${at} 只支持 ed25519，当前 ${String(entry.algorithm)}`);
  }
  if (typeof entry.publicKey !== "string" || !entry.publicKey.includes("BEGIN PUBLIC KEY")) {
    fail(`${at}.publicKey 必须是完整的 SPKI PEM`);
  }
  const der = createPublicKey(entry.publicKey).export({ type: "spki", format: "der" });
  if (der.length < 32) fail(`${at} 的 SPKI DER 长度异常：${der.length}`);
  const raw = der.subarray(der.length - 32);
  const keyId = sha256Hex(der).slice(0, 16);
  const fingerprint = sha256Hex(der);
  if (entry.keyId !== keyId) {
    fail(`${at}.keyId 与公钥不匹配：声明 ${entry.keyId}，实际 ${keyId}`);
  }
  if (entry.fingerprint && entry.fingerprint !== fingerprint) {
    fail(`${at}.fingerprint 与公钥不匹配：声明 ${entry.fingerprint}，实际 ${fingerprint}`);
  }
  const label = [entry.name, entry.label].filter(Boolean).join(" ") || keyId;
  // 防止再次把 Folium 的密钥标签抄进 Lull 的信任包。
  if (/folium/i.test(label)) {
    fail(`${at} 的 name/label 仍含 Folium：${label}。这里必须标成 Lull Community 的发布密钥。`);
  }
  return {
    keyId,
    label,
    algorithm: "ed25519",
    publicKey: raw.toString("base64"),
    notBefore: entry.notBefore ?? null,
    retiredAt: entry.retiredAt ?? null,
    revoked: entry.revoked === true,
    fingerprint,
  };
});

const bundle = {
  schemaVersion: 1,
  source: "Lull-Community/keys/publisher-keys.json",
  keys,
};

const text = `${JSON.stringify(bundle, null, 2)}\n`;
const out = argValue("--out");
if (out) {
  const path = resolve(process.cwd(), out);
  writeFileSync(path, text);
  console.log(`[export-host-trust] ${keys.length} 把公钥 → ${path}`);
} else {
  process.stdout.write(text);
}
