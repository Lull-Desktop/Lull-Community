/**
 * 发布签名的单元测试：签 → 验 → 篡改 → 必须失败。
 *
 * 密钥在测试里**即时生成**（不落盘、不入库）：任何一份"测试用私钥"一旦进仓库，
 * 迟早会被当成发布密钥。想验真实密钥，用 `pnpm verify:release`。
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertOfflineSigningAllowed,
  canonicalReleaseJson,
  expandHome,
  findUsableKey,
  generateKeyPairPem,
  keyIdOf,
  loadPublicKeys,
  publicKeyPemOf,
  sha256Hex,
  signBytes,
  verifyBytes,
  verifyRelease,
} from "../scripts/lib/signing.mjs";
import { checkRelease } from "../scripts/verify-release.mjs";

const ZIP = Buffer.from("fake zip bytes, not a real archive");

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "lull-signing-"));
  const keysDir = join(root, "keys");
  const releaseDir = join(root, "release");
  const downloads = join(root, "site", "public", "downloads");
  const generated = join(root, "site", "src", "generated");
  for (const dir of [keysDir, releaseDir, downloads, generated]) mkdirSync(dir, { recursive: true });

  const writeZip = (name = "alice.aurora-1.0.0.zip", bytes = ZIP) => {
    writeFileSync(join(downloads, name), bytes);
    return name;
  };
  const writeCatalog = (items) =>
    writeFileSync(join(generated, "catalog.json"), `${JSON.stringify({ schemaVersion: 1, items }, null, 2)}\n`);
  const writeKeys = (keys) => writeFileSync(join(keysDir, "publisher-keys.json"), `${JSON.stringify({ schemaVersion: 1, keys }, null, 2)}\n`);

  const signWith = (pairs, release, digestOverride) => {
    const text = canonicalReleaseJson(release);
    writeFileSync(join(releaseDir, "release.json"), text);
    writeFileSync(join(releaseDir, "release.json.sig"), `${signBytes(Buffer.from(text, "utf8"), pairs.privatePem)}\n`);
  };

  return { root, writeZip, writeCatalog, writeKeys, signWith };
};

const releaseFor = (keyId, zipName = "alice.aurora-1.0.0.zip", bytes = ZIP) => ({
  schemaVersion: 1,
  releaseSeq: 3,
  generatedAt: "2026-11-02T03:15:00Z",
  signedBy: { keyId, algorithm: "ed25519" },
  repo: { url: "https://github.com/Lull-Desktop/Lull-Community", builtFrom: "0".repeat(40) },
  items: [
    {
      kind: "scene",
      slug: "aurora",
      id: "alice.aurora",
      version: "1.0.0",
      digest: "d".repeat(64),
      zip: { path: `/downloads/${zipName}`, sha256: sha256Hex(bytes), bytes: bytes.length },
    },
  ],
});

test("签名与验签往返；改一个字节就验不过", () => {
  const pairs = generateKeyPairPem();
  const bytes = Buffer.from("hello 极光", "utf8");
  const signature = signBytes(bytes, pairs.privatePem);
  assert.equal(verifyBytes(bytes, signature, pairs.publicPem), true);
  assert.equal(verifyBytes(Buffer.from("hello 极光!", "utf8"), signature, pairs.publicPem), false);

  const other = generateKeyPairPem();
  assert.equal(verifyBytes(bytes, signature, other.publicPem), false);
  assert.equal(verifyBytes(bytes, "not-base64", pairs.publicPem), false);
  assert.equal(verifyBytes(bytes, Buffer.alloc(64).toString("base64"), pairs.publicPem), false);
});

test("keyId 由公钥导出且稳定；私钥能推出同一把公钥", () => {
  const pairs = generateKeyPairPem();
  assert.equal(keyIdOf(pairs.publicPem), pairs.keyId);
  assert.match(pairs.keyId, /^[0-9a-f]{16}$/);
  assert.equal(keyIdOf(publicKeyPemOf(pairs.privatePem)), pairs.keyId);
});

test("规范化字节稳定：条目顺序不影响输出", () => {
  const keyId = "0".repeat(16);
  const one = releaseFor(keyId);
  const two = {
    ...one,
    items: [
      { kind: "widget", slug: "breathing", id: "breathing", version: "1.0.0", digest: "e".repeat(64), zip: { path: "/downloads/b.zip", sha256: "f".repeat(64), bytes: 10 } },
      ...one.items,
    ],
  };
  const reversed = { ...two, items: [...two.items].reverse() };
  assert.equal(canonicalReleaseJson(two), canonicalReleaseJson(reversed));
  // counts 由 items 推出，不信手填
  assert.match(canonicalReleaseJson(two), /"scenes": 1,\n    "widgets": 1/);
  // 末尾恰好一个换行、LF
  const text = canonicalReleaseJson(one);
  assert.ok(text.endsWith("}\n"));
  assert.ok(!text.includes("\r"));
  assert.equal(text.match(/\n$/g).length, 1);
});

test("公钥状态：撤销 / 未生效 / 已退役都不能用", () => {
  const keys = [
    { keyId: "ok", algorithm: "ed25519", publicKey: "x", notBefore: "2026-01-01", retiredAt: null, revoked: false },
    { keyId: "revoked", algorithm: "ed25519", publicKey: "x", revoked: true },
    { keyId: "future", algorithm: "ed25519", publicKey: "x", notBefore: "2099-01-01", revoked: false },
    { keyId: "retired", algorithm: "ed25519", publicKey: "x", retiredAt: "2026-06-01", revoked: false },
    { keyId: "wrong-alg", algorithm: "rsa", publicKey: "x", revoked: false },
  ];
  const now = Date.parse("2026-11-01T00:00:00Z");
  assert.equal(findUsableKey(keys, "ok", now).key.keyId, "ok");
  assert.match(findUsableKey(keys, "revoked", now).error, /撤销/);
  assert.match(findUsableKey(keys, "future", now).error, /尚未生效/);
  assert.match(findUsableKey(keys, "retired", now).error, /退役/);
  assert.match(findUsableKey(keys, "wrong-alg", now).error, /只接受 ed25519/);
  assert.match(findUsableKey(keys, "missing", now).error, /没有 keyId/);
});

test("还没签过 = 未验证但不算失败", () => {
  const { root } = fixture();
  const result = verifyRelease(root);
  assert.equal(result.ok, true);
  assert.equal(result.signed, false);
  assert.equal(result.errors.length, 0);
  rmSync(root, { recursive: true, force: true });
});

test("签好的清单验得过；改清单或换包都验不过", () => {
  const pairs = generateKeyPairPem();
  const f = fixture();
  const zipName = f.writeZip();
  f.writeKeys([{ keyId: pairs.keyId, algorithm: "ed25519", publicKey: pairs.publicPem, notBefore: "2026-01-01", retiredAt: null, revoked: false }]);
  f.signWith(pairs, releaseFor(pairs.keyId, zipName));

  assert.deepEqual(verifyRelease(f.root).errors, []);
  assert.equal(verifyRelease(f.root).signed, true);

  // 改清单正文 → 签名不再匹配
  const file = join(f.root, "release", "release.json");
  writeFileSync(file, readFileSync(file, "utf8").replace("1.0.0", "1.0.1"));
  assert.match(verifyRelease(f.root).errors.join("\n"), /签名与公钥/);

  rmSync(f.root, { recursive: true, force: true });
});

test("清单里的 zip 被替换 → V4 必须拦住", () => {
  const pairs = generateKeyPairPem();
  const f = fixture();
  const zipName = f.writeZip();
  f.writeKeys([{ keyId: pairs.keyId, algorithm: "ed25519", publicKey: pairs.publicPem, notBefore: "2026-01-01", retiredAt: null, revoked: false }]);
  f.signWith(pairs, releaseFor(pairs.keyId, zipName));
  f.writeCatalog([
    { kind: "scene", slug: "aurora", id: "alice.aurora", version: "1.0.0", download: `/downloads/${zipName}` },
  ]);

  const clean = checkRelease(f.root, { checkHistory: false });
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.errors, []);

  f.writeZip(zipName, Buffer.from("evil bytes"));
  const tampered = checkRelease(f.root, { checkHistory: false });
  assert.equal(tampered.ok, false);
  assert.match(tampered.errors.map((item) => `${item.code} ${item.message}`).join("\n"), /V4/);

  rmSync(f.root, { recursive: true, force: true });
});

test("清单过期只警告；--strict 才变成错误", () => {
  const pairs = generateKeyPairPem();
  const f = fixture();
  const zipName = f.writeZip();
  f.writeKeys([{ keyId: pairs.keyId, algorithm: "ed25519", publicKey: pairs.publicPem, notBefore: "2026-01-01", retiredAt: null, revoked: false }]);
  f.signWith(pairs, releaseFor(pairs.keyId, zipName));
  // 内容里多了一个没签过的作品
  f.writeCatalog([
    { kind: "scene", slug: "aurora", id: "alice.aurora", version: "1.0.0", download: `/downloads/${zipName}` },
    { kind: "widget", slug: "breathing", id: "breathing", version: "1.0.0", download: "/downloads/breathing-1.0.0.lull-widget.zip" },
  ]);

  const relaxed = checkRelease(f.root, { checkHistory: false });
  assert.equal(relaxed.ok, true, "覆盖不全不该阻断部署");
  assert.match(relaxed.warnings.map((item) => item.code).join(","), /V6/);

  const strict = checkRelease(f.root, { strict: true, checkHistory: false });
  assert.equal(strict.ok, false);

  rmSync(f.root, { recursive: true, force: true });
});

test("私钥不许在 CI 上、不许在仓库里", () => {
  const root = mkdtempSync(join(tmpdir(), "lull-repo-"));
  const outside = join(tmpdir(), `lull-key-${Date.now()}.pem`);
  const inside = join(root, "publisher.pem");
  writeFileSync(outside, "x");
  writeFileSync(inside, "x");

  const savedCi = process.env.CI;
  try {
    process.env.CI = "true";
    assert.throws(() => assertOfflineSigningAllowed(outside, root), /CI/);
    delete process.env.CI;
    assert.throws(() => assertOfflineSigningAllowed(inside, root), /不能放在仓库目录里/);
    assert.doesNotThrow(() => assertOfflineSigningAllowed(outside, root));
    assert.throws(() => assertOfflineSigningAllowed(join(root, "nope.pem"), root), /不存在/);
  } finally {
    if (savedCi === undefined) delete process.env.CI;
    else process.env.CI = savedCi;
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});

test("公钥清单缺失时视为空表", () => {
  const root = mkdtempSync(join(tmpdir(), "lull-nokeys-"));
  assert.deepEqual(loadPublicKeys(root), []);
  rmSync(root, { recursive: true, force: true });
});

test("公钥清单写坏了要说清楚，而不是让 keyId 静默变成 undefined", () => {
  const root = mkdtempSync(join(tmpdir(), "lull-badkeys-"));
  mkdirSync(join(root, "keys"), { recursive: true });
  const write = (keys) => writeFileSync(join(root, "keys", "publisher-keys.json"), JSON.stringify({ schemaVersion: 1, keys }));

  // 手改时最常见的一种错：只粘了 base64 正文当字符串
  write(["MCowBQYDK2VwAyEAuXEeCgcI7Tn16mfAA8X7JXtCsSUSsuWRjOcNEvPlCZs="]);
  assert.throws(() => loadPublicKeys(root), /必须是对象/);

  write([{ keyId: "279AFF591D2627ED", algorithm: "ed25519", publicKey: "x" }]);
  assert.throws(() => loadPublicKeys(root), /16 位小写 hex/);

  write([{ keyId: "279aff591d2627ed", algorithm: "ed25519", publicKey: "MCowBQYDK2VwAyEA" }]);
  assert.throws(() => loadPublicKeys(root), /完整 PEM/);

  rmSync(root, { recursive: true, force: true });
});

test("~/ 会被展开——PowerShell 不展开它，Node 也不展开它", () => {
  assert.equal(expandHome("~/keys/publisher.pem"), join(homedir(), "keys/publisher.pem"));
  assert.equal(expandHome("~\\keys\\publisher.pem"), join(homedir(), "keys\\publisher.pem"));
  assert.equal(expandHome("~"), homedir());
  assert.equal(expandHome("C:/keys/x.pem"), "C:/keys/x.pem");
  assert.equal(expandHome("./x.pem"), "./x.pem");
  assert.equal(expandHome(""), "");
});
