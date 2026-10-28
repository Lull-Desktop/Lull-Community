/**
 * 格式契约：release.schema.json 与 package-signature.schema.json。
 *
 * 这两个 schema 是本仓库自有格式，不属于 Lull 内容包；校验它们是为了防止
 * 「脚本能跑、格式却漂了」——宿主/外部工具最终要按这两个文件解析。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import { generateKeyPairPem } from "../scripts/lib/signing.mjs";
import { signPackageStatement } from "../scripts/lib/package-signature.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readSchema = (name) => JSON.parse(readFileSync(join(ROOT, "schemas", name), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateRelease = ajv.compile(readSchema("release.schema.json"));
const validateSignature = ajv.compile(readSchema("package-signature.schema.json"));

const itemFor = (keyId) => {
  const release = {
    schemaVersion: 2,
    releaseSeq: 3,
    generatedAt: "2026-11-02T03:15:00Z",
    signedBy: { keyId, algorithm: "ed25519" },
    repo: { url: "https://example.test/Lull-Community", builtFrom: "" },
    counts: { scenes: 0, widgets: 1 },
    items: [
      {
        kind: "widget",
        slug: "breathing",
        id: "community-breath",
        version: "1.0.0",
        digest: "d".repeat(64),
        zip: {
          path: "/downloads/community-breath-1.0.0.lull-widget.zip",
          sha256: "a".repeat(64),
          bytes: 3792,
        },
        signature: {
          path: "/release/signatures/widget/breathing-1.0.0.lull-signature.json",
          sha256: "b".repeat(64),
        },
      },
    ],
  };
  return release;
};

test("v2 清单通过 schema；缺 signature 的 v2 被拒", () => {
  const { keyId } = generateKeyPairPem();
  const release = itemFor(keyId);
  assert.equal(validateRelease(release), true, JSON.stringify(validateRelease.errors));

  const broken = structuredClone(release);
  delete broken.items[0].signature;
  assert.equal(validateRelease(broken), false);
});

test("v1 清单允许没有 signature", () => {
  const { keyId } = generateKeyPairPem();
  const release = itemFor(keyId);
  release.schemaVersion = 1;
  delete release.items[0].signature;
  assert.equal(validateRelease(release), true, JSON.stringify(validateRelease.errors));
});

test("逐包签名 envelope 通过 schema", () => {
  const pairs = generateKeyPairPem();
  const release = itemFor(pairs.keyId);
  const item = release.items[0];
  const signed = signPackageStatement({ release, item, privateKeyPem: pairs.privatePem });
  const envelope = JSON.parse(signed.bytes.toString("utf8"));
  assert.equal(validateSignature(envelope), true, JSON.stringify(validateSignature.errors));

  delete envelope.payload;
  assert.equal(validateSignature(envelope), false);
});
