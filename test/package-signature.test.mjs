/**
 * 逐包签名（方案 C）：声明、envelope、sidecar、v2 清单与篡改检测。
 *
 * 密钥即时生成、不落盘入库；这里验的是格式与校验逻辑，不是真实发布密钥。
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  RELEASE_SCHEMA_VERSION,
  canonicalReleaseJson,
  generateKeyPairPem,
  sha256Hex,
  signBytes,
  verifyRelease,
} from "../scripts/lib/signing.mjs";
import {
  canonicalPackageStatement,
  localSignaturePath,
  packageStatementFor,
  readPackageSignature,
  signaturePublicPathFor,
  signPackageStatement,
  verifyPackageSignatures,
  writePackageSignature,
} from "../scripts/lib/package-signature.mjs";
import { checkRelease } from "../scripts/verify-release.mjs";

const ZIP = Buffer.from("fake widget zip bytes, not a real archive");

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "lull-package-signature-"));
  for (const dir of ["keys", "release", "site/public/downloads", "site/src/generated"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  return root;
};

const writeKeys = (root, pairs) =>
  writeFileSync(
    join(root, "keys/publisher-keys.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        keys: [
          {
            keyId: pairs.keyId,
            algorithm: "ed25519",
            publicKey: pairs.publicPem,
            notBefore: "2026-01-01",
            retiredAt: null,
            revoked: false,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

const writeZip = (root, name = "breathing-1.0.0.lull-widget.zip", bytes = ZIP) => {
  writeFileSync(join(root, "site/public/downloads", name), bytes);
  return name;
};

const itemFor = (zipName, bytes = ZIP) => ({
  kind: "widget",
  slug: "breathing",
  id: "community-breath",
  version: "1.0.0",
  digest: "d".repeat(64),
  zip: { path: `/downloads/${zipName}`, sha256: sha256Hex(bytes), bytes: bytes.length },
});

const releaseFor = (pairs, item) => ({
  schemaVersion: RELEASE_SCHEMA_VERSION,
  releaseSeq: 3,
  generatedAt: "2026-11-02T03:15:00Z",
  signedBy: { keyId: pairs.keyId, algorithm: "ed25519" },
  repo: { url: "https://example.test/Lull-Community", builtFrom: "0".repeat(40) },
  items: [item],
});

const writeSignedRelease = (root, pairs, release) => {
  for (const item of release.items) {
    const signed = writePackageSignature({
      root,
      release,
      item,
      privateKeyPem: pairs.privatePem,
    });
    item.signature = { path: signed.path, sha256: signed.sha256 };
  }
  const text = canonicalReleaseJson(release);
  writeFileSync(join(root, "release/release.json"), text);
  writeFileSync(
    join(root, "release/release.json.sig"),
    `${signBytes(Buffer.from(text, "utf8"), pairs.privatePem)}\n`,
  );
  return text;
};

const writeCatalog = (root, items) =>
  writeFileSync(
    join(root, "site/src/generated/catalog.json"),
    `${JSON.stringify({ schemaVersion: 1, items }, null, 2)}\n`,
  );

test("包声明字节稳定，envelope 结构完整", () => {
  const pairs = generateKeyPairPem();
  const item = itemFor("breathing-1.0.0.lull-widget.zip");
  const release = releaseFor(pairs, item);

  const statement = packageStatementFor(release, item);
  assert.equal(
    canonicalPackageStatement(statement),
    canonicalPackageStatement({ ...statement }),
  );
  assert.equal(statement.digest.value, item.digest);
  assert.equal(statement.signedBy.keyId, pairs.keyId);
  assert.equal(statement.signedAt, release.generatedAt);

  const first = signPackageStatement({ release, item, privateKeyPem: pairs.privatePem });
  const second = signPackageStatement({ release, item, privateKeyPem: pairs.privatePem });
  // Ed25519 与 envelope 都是确定性的：同输入必须同字节，便于复算
  assert.equal(first.bytes.toString("utf8"), second.bytes.toString("utf8"));
  assert.equal(
    first.path,
    "/release/signatures/widget/breathing-1.0.0.lull-signature.json",
  );

  const envelope = JSON.parse(first.bytes.toString("utf8"));
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.algorithm, "ed25519");
  assert.equal(envelope.keyId, pairs.keyId);
  assert.equal(envelope.signature.length, 88);
  assert.equal(first.sha256, sha256Hex(first.bytes));
});

test("sidecar 路径拒绝越界与非法文件名", () => {
  assert.throws(() => signaturePublicPathFor({ kind: "widget", slug: "../x", version: "1.0.0" }), /不能用作/);
  assert.throws(() => signaturePublicPathFor({ kind: "widget", slug: "ok", version: "1/0" }), /不能用作/);
  assert.throws(() => localSignaturePath("/tmp/root", "/release/signatures/widget/../x.json"), /不能包含|越界/);
  assert.throws(() => localSignaturePath("/tmp/root", "/downloads/x.json"), /必须以/);
  assert.equal(
    localSignaturePath("C:/repo", "/release/signatures/widget/x-1.0.0.lull-signature.json"),
    join("C:/repo", "release/signatures/widget/x-1.0.0.lull-signature.json"),
  );
});

test("v2 清单 + 逐包签名验得过", () => {
  const pairs = generateKeyPairPem();
  const root = fixture();
  const zipName = writeZip(root);
  const item = itemFor(zipName);
  const release = releaseFor(pairs, item);
  writeKeys(root, pairs);
  writeSignedRelease(root, pairs, release);
  writeCatalog(root, [
    { kind: "widget", slug: "breathing", id: "community-breath", version: "1.0.0", download: `/downloads/${zipName}` },
  ]);

  const check = verifyRelease(root);
  assert.equal(check.ok, true);
  assert.equal(check.release.data.schemaVersion, 2);

  const signatures = verifyPackageSignatures({
    root,
    release: check.release.data,
    key: check.key,
  });
  assert.deepEqual(signatures.errors, []);
  assert.equal(signatures.verified.size, 1);

  const result = checkRelease(root, { checkHistory: false });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);

  rmSync(root, { recursive: true, force: true });
});

test("改 sidecar 一个字符 → V8 必须拦住", () => {
  const pairs = generateKeyPairPem();
  const root = fixture();
  const zipName = writeZip(root);
  const item = itemFor(zipName);
  const release = releaseFor(pairs, item);
  writeKeys(root, pairs);
  writeSignedRelease(root, pairs, release);

  const local = localSignaturePath(root, release.items[0].signature.path);
  const text = readFileSync(local, "utf8");
  const envelope = JSON.parse(text);
  envelope.signature = `${envelope.signature[0] === "A" ? "B" : "A"}${envelope.signature.slice(1)}`;
  writeFileSync(local, `${JSON.stringify(envelope, null, 2)}\n`);

  const result = checkRelease(root, { checkHistory: false });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.map((entry) => `${entry.code} ${entry.message}`).join("\n"),
    /V8/,
  );

  rmSync(root, { recursive: true, force: true });
});

test("删掉 sidecar 或改清单里的摘要 → V8 必须拦住", () => {
  const pairs = generateKeyPairPem();
  const root = fixture();
  const zipName = writeZip(root);
  const item = itemFor(zipName);
  const release = releaseFor(pairs, item);
  writeKeys(root, pairs);
  writeSignedRelease(root, pairs, release);

  const local = localSignaturePath(root, release.items[0].signature.path);
  rmSync(local);
  let result = checkRelease(root, { checkHistory: false });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((entry) => entry.code).join(","), /V8/);

  rmSync(root, { recursive: true, force: true });
});

test("清单里的 digest 与 sidecar 声明不一致 → V8", () => {
  const pairs = generateKeyPairPem();
  const root = fixture();
  const zipName = writeZip(root);
  const item = itemFor(zipName);
  const release = releaseFor(pairs, item);
  writeKeys(root, pairs);
  writeSignedRelease(root, pairs, release);

  // 只改清单里的 digest 并重签清单，不动 sidecar：
  // 清单签名仍然有效，但逐包声明对不上——这正是「签名只覆盖清单」时的缺口。
  const releasePath = join(root, "release/release.json");
  const data = JSON.parse(readFileSync(releasePath, "utf8"));
  data.items[0].digest = "e".repeat(64);
  const text = canonicalReleaseJson(data);
  writeFileSync(releasePath, text);
  writeFileSync(join(root, "release/release.json.sig"), `${signBytes(Buffer.from(text, "utf8"), pairs.privatePem)}\n`);

  const result = checkRelease(root, { checkHistory: false });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.map((entry) => `${entry.code} ${entry.message}`).join("\n"),
    /V8.*digest 与清单不一致/,
  );

  rmSync(root, { recursive: true, force: true });
});

test("旧版 v1 只警告；--strict 要求重签", () => {
  const pairs = generateKeyPairPem();
  const root = fixture();
  const zipName = writeZip(root);
  const item = itemFor(zipName);
  const release = { ...releaseFor(pairs, item), schemaVersion: 1 };
  writeKeys(root, pairs);
  const text = canonicalReleaseJson(release);
  writeFileSync(join(root, "release/release.json"), text);
  writeFileSync(join(root, "release/release.json.sig"), `${signBytes(Buffer.from(text, "utf8"), pairs.privatePem)}\n`);

  const relaxed = checkRelease(root, { checkHistory: false });
  assert.equal(relaxed.ok, true);
  assert.equal(relaxed.signed, true);
  assert.match(relaxed.warnings.map((entry) => entry.code).join(","), /V5|V8/);

  const strict = checkRelease(root, { strict: true, checkHistory: false });
  assert.equal(strict.ok, false);
  assert.match(strict.errors.map((entry) => entry.code).join(","), /V8/);

  rmSync(root, { recursive: true, force: true });
});

test("孤立的逐包签名只警告，不阻断", () => {
  const pairs = generateKeyPairPem();
  const root = fixture();
  const zipName = writeZip(root);
  const item = itemFor(zipName);
  const release = releaseFor(pairs, item);
  writeKeys(root, pairs);
  writeSignedRelease(root, pairs, release);

  const source = localSignaturePath(root, release.items[0].signature.path);
  const orphan = join(root, "release/signatures/widget/orphan-1.0.0.lull-signature.json");
  mkdirSync(join(root, "release/signatures/widget"), { recursive: true });
  writeFileSync(orphan, readFileSync(source));

  const result = checkRelease(root, { checkHistory: false });
  assert.equal(result.ok, true);
  assert.match(result.warnings.map((entry) => entry.message).join("\n"), /孤立/);

  rmSync(root, { recursive: true, force: true });
});

test("envelope 结构损坏时 readPackageSignature 抛错", () => {
  const root = fixture();
  const file = join(root, "bad.lull-signature.json");
  writeFileSync(file, JSON.stringify({ schemaVersion: 1, algorithm: "ed25519", keyId: "0".repeat(16), payload: "!!!", signature: "x" }));
  assert.throws(() => readPackageSignature(file), /base64|签名/);
  rmSync(root, { recursive: true, force: true });
});
