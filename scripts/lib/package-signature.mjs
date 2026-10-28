/**
 * `scripts/lib/package-signature.mjs`
 *
 * 逐包签名：把「一个包的身份 + 内容摘要」写成一份声明，用与批次清单相同的
 * Ed25519 私钥签一次，**签名文件随包放在包根 `.lull-signature.json`**，
 * 同时在 `release/signatures/` 保留一份供 CI/站点审计的副本。
 *
 * 为什么不是直接签 zip 字节：
 * - 内容 `digest` 才是安装器认的包身份，重新压缩/换打包器不应该让签名失效；
 * - 签名文件在包内，zip 自身的哈希会因「把签名放进去」而改变，所以声明里
 *   不再写 zip 哈希；zip 传输完整性由批次 `release.json` 的 `zip.sha256` 负责。
 *
 * 为什么 envelope 里放 base64 的 payload：
 * - 签的是签名方生成的**原始字节**，验签方不需要重新序列化 JSON；
 * - Node 与 Rust 的键序、转义、换行差异不会影响验签。
 *
 * 声明本身不是「作者认证」，只回答「这个包是不是持有 community 私钥的一方签的」。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import {
  PUBLIC_SIGNATURE_PREFIX,
  PUBLISHED_SIGNATURE_ALGORITHM,
  RELEASE_SIGNATURES_DIR,
  keyIdOf,
  publicKeyPemOf,
  sha256Hex,
  signBytes,
  verifyBytes,
} from "./signing.mjs";

export const PACKAGE_SIGNATURE_SCHEMA_VERSION = 2;
export const PACKAGE_STATEMENT_VERSION = 2;
/** 旧版：签名在包外、声明里带 zip 哈希；仍可验，但不再生成。 */
export const LEGACY_PACKAGE_SIGNATURE_SCHEMA_VERSION = 1;
export const LEGACY_PACKAGE_STATEMENT_VERSION = 1;
export const PACKAGE_SIGNATURE_SUFFIX = ".lull-signature.json";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const KEY_ID = /^[0-9a-f]{16}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const assertSafeSegment = (value, label) => {
  if (
    typeof value !== "string" ||
    value === "" ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("..") ||
    value === "."
  ) {
    throw new Error(`${label} 不能用作签名文件名：${JSON.stringify(value)}`);
  }
  return value;
};

/**
 * 逐包签名文件对外的站点路径。
 *
 * 文件名用 slug 而不是 id：slug 的字符集更窄（`^[a-z0-9][a-z0-9-]{1,31}$`），
 * 不把 scene id 里的点号带进路径；id 仍然完整写在签名声明里。
 */
export const signaturePublicPathFor = (item) => {
  if (item?.kind !== "scene" && item?.kind !== "widget") {
    throw new Error(`未知 kind：${String(item?.kind)}`);
  }
  const slug = assertSafeSegment(item.slug, "slug");
  const version = assertSafeSegment(item.version, "version");
  return `${PUBLIC_SIGNATURE_PREFIX}${item.kind}/${slug}-${version}${PACKAGE_SIGNATURE_SUFFIX}`;
};

/** 把站点绝对路径映射回仓库里的 `release/signatures/`，并拒绝越界。 */
export const localSignaturePath = (root, publicPath) => {
  if (typeof publicPath !== "string" || !publicPath.startsWith(PUBLIC_SIGNATURE_PREFIX)) {
    throw new Error(`签名路径必须以 ${PUBLIC_SIGNATURE_PREFIX} 开头：${String(publicPath)}`);
  }
  const rest = publicPath.slice(PUBLIC_SIGNATURE_PREFIX.length);
  const segments = rest.split("/");
  if (
    rest === "" ||
    rest.startsWith("/") ||
    rest.includes("\\") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`签名路径不能为空、不能包含 .. 或反斜杠：${publicPath}`);
  }
  const base = resolve(root, RELEASE_SIGNATURES_DIR);
  const local = resolve(base, ...segments);
  const inside = relative(base, local);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    throw new Error(`签名路径越界：${publicPath}`);
  }
  return local;
};

/** 生成一份包的规范声明（未签名）。字段顺序固定，供签名方生成原始字节。 */
export const packageStatementFor = (release, item) => ({
  statementVersion: PACKAGE_STATEMENT_VERSION,
  kind: item.kind,
  slug: item.slug,
  id: item.id,
  version: item.version,
  digest: {
    algorithm: "sha256",
    scope: "package",
    value: item.digest,
  },
  signedBy: {
    keyId: release.signedBy.keyId,
    algorithm: release.signedBy.algorithm ?? PUBLISHED_SIGNATURE_ALGORITHM,
  },
  releaseSeq: release.releaseSeq,
  signedAt: release.generatedAt,
});

/**
 * 声明的规范化文本。
 *
 * 验签方**不需要**调用它来重建字节：签名覆盖的是 envelope 里的 payload，
 * 这里只用于签名端生成与「是否规范化」的警告。
 */
export const canonicalPackageStatement = (statement) => {
  const lines = [
    "{",
    `  "statementVersion": ${PACKAGE_STATEMENT_VERSION},`,
    `  "kind": ${JSON.stringify(statement.kind)},`,
    `  "slug": ${JSON.stringify(statement.slug)},`,
    `  "id": ${JSON.stringify(statement.id)},`,
    `  "version": ${JSON.stringify(statement.version)},`,
    '  "digest": {',
    `    "algorithm": ${JSON.stringify(statement.digest?.algorithm ?? "sha256")},`,
    `    "scope": ${JSON.stringify(statement.digest?.scope ?? "package")},`,
    `    "value": ${JSON.stringify(statement.digest?.value)}`,
    "  },",
    '  "signedBy": {',
    `    "keyId": ${JSON.stringify(statement.signedBy?.keyId)},`,
    `    "algorithm": ${JSON.stringify(statement.signedBy?.algorithm ?? PUBLISHED_SIGNATURE_ALGORITHM)}`,
    "  },",
    `  "releaseSeq": ${Number(statement.releaseSeq)},`,
    `  "signedAt": ${JSON.stringify(statement.signedAt)}`,
    "}",
  ];
  return `${lines.join("\n")}\n`;
};

/**
 * 签一个包，返回 envelope 与文件字节。
 *
 * 私钥只在这里出现；调用方负责把它保持在离线机器上。
 */
export const signPackageStatement = ({ release, item, privateKeyPem }) => {
  const keyId = keyIdOf(publicKeyPemOf(privateKeyPem));
  if (keyId !== release.signedBy.keyId) {
    throw new Error(
      `私钥对应的 keyId 是 ${keyId}，清单 signedBy.keyId 是 ${release.signedBy.keyId}：签错钥匙了`,
    );
  }
  const statement = packageStatementFor(release, item);
  const payload = Buffer.from(canonicalPackageStatement(statement), "utf8");
  const signature = signBytes(payload, privateKeyPem);
  const envelope = {
    schemaVersion: PACKAGE_SIGNATURE_SCHEMA_VERSION,
    algorithm: PUBLISHED_SIGNATURE_ALGORITHM,
    keyId,
    payload: payload.toString("base64"),
    signature,
  };
  const bytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  return {
    statement,
    envelope,
    bytes,
    path: signaturePublicPathFor(item),
    sha256: sha256Hex(bytes),
  };
};

/** 写入一个包的签名文件，返回 `{ path, sha256 }`，供 release.json 的 item 引用。 */
export const writePackageSignature = ({ root, release, item, privateKeyPem }) => {
  const signed = signPackageStatement({ release, item, privateKeyPem });
  const local = localSignaturePath(root, signed.path);
  mkdirSync(dirname(local), { recursive: true });
  writeFileSync(local, signed.bytes);
  return { path: signed.path, sha256: signed.sha256, bytes: signed.bytes, statement: signed.statement };
};

const decodeBase64Strict = (value, label) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !BASE64.test(value)
  ) {
    throw new Error(`${label} 必须是合法的 base64`);
  }
  const bytes = Buffer.from(value, "base64");
  // 拒绝 Node 会「宽容解码」但重新编码后不一致的输入（例如夹了换行/空白）。
  if (bytes.toString("base64") !== value) throw new Error(`${label} 不是规范 base64`);
  return bytes;
};

/** 读并做结构校验；损坏的签名文件抛错，不降级成「未签名」。 */
export const readPackageSignature = (file) => {
  const bytes = readFileSync(file);
  let envelope;
  try {
    envelope = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`签名文件不是合法 JSON：${error.message}`);
  }
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("签名文件必须是 JSON 对象");
  }
  if (
    envelope.schemaVersion !== PACKAGE_SIGNATURE_SCHEMA_VERSION &&
    envelope.schemaVersion !== LEGACY_PACKAGE_SIGNATURE_SCHEMA_VERSION
  ) {
    throw new Error(`不支持的签名 schemaVersion：${String(envelope.schemaVersion)}`);
  }
  if (envelope.algorithm !== PUBLISHED_SIGNATURE_ALGORITHM) {
    throw new Error(`不支持的签名算法：${String(envelope.algorithm)}（只接受 ${PUBLISHED_SIGNATURE_ALGORITHM}）`);
  }
  if (typeof envelope.keyId !== "string" || !KEY_ID.test(envelope.keyId)) {
    throw new Error("签名文件的 keyId 必须是 16 位小写 hex");
  }
  const payloadBytes = decodeBase64Strict(envelope.payload, "payload");
  const signatureBytes = decodeBase64Strict(envelope.signature, "signature");
  if (signatureBytes.length !== 64) throw new Error(`签名必须是 64 字节，当前 ${signatureBytes.length} 字节`);
  return { bytes, envelope, payloadBytes, signatureBytes };
};

const parseStatement = (payloadBytes, schemaVersion = PACKAGE_SIGNATURE_SCHEMA_VERSION) => {
  let statement;
  try {
    statement = JSON.parse(payloadBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`签名声明不是合法 JSON：${error.message}`);
  }
  if (!statement || typeof statement !== "object" || Array.isArray(statement)) {
    throw new Error("签名声明必须是 JSON 对象");
  }
  const expectedStatementVersion =
    schemaVersion === LEGACY_PACKAGE_SIGNATURE_SCHEMA_VERSION
      ? LEGACY_PACKAGE_STATEMENT_VERSION
      : PACKAGE_STATEMENT_VERSION;
  if (statement.statementVersion !== expectedStatementVersion) {
    throw new Error(
      `不支持的声明版本：${String(statement.statementVersion)}（envelope v${schemaVersion} 期望 v${expectedStatementVersion}）`,
    );
  }
  for (const field of ["kind", "slug", "id", "version", "signedAt"]) {
    if (typeof statement[field] !== "string" || statement[field] === "") {
      throw new Error(`签名声明缺 ${field}`);
    }
  }
  if (statement.kind !== "scene" && statement.kind !== "widget") {
    throw new Error(`签名声明的 kind 非法：${String(statement.kind)}`);
  }
  if (
    !statement.digest ||
    statement.digest.algorithm !== "sha256" ||
    statement.digest.scope !== "package" ||
    typeof statement.digest.value !== "string" ||
    !SHA256_HEX.test(statement.digest.value)
  ) {
    throw new Error("签名声明的 digest 必须是 { algorithm: sha256, scope: package, value: 64 位 hex }");
  }
  if (schemaVersion === LEGACY_PACKAGE_SIGNATURE_SCHEMA_VERSION) {
    if (
      !statement.zip ||
      typeof statement.zip.path !== "string" ||
      typeof statement.zip.sha256 !== "string" ||
      !SHA256_HEX.test(statement.zip.sha256) ||
      !Number.isInteger(statement.zip.bytes) ||
      statement.zip.bytes < 0
    ) {
      throw new Error("签名声明的 zip 必须是 { path, sha256: 64 位 hex, bytes: ≥0 整数 }");
    }
  } else if (statement.zip !== undefined) {
    // v2 的签名随包走，zip 自身哈希由批次清单负责；声明里再放 zip 会
    // 变成「把自己装进 zip 再签自己的哈希」，语义上不成立。
    throw new Error("v2 签名声明不应包含 zip 字段：包内签名只签内容摘要");
  }
  if (
    !statement.signedBy ||
    typeof statement.signedBy.keyId !== "string" ||
    !KEY_ID.test(statement.signedBy.keyId) ||
    statement.signedBy.algorithm !== PUBLISHED_SIGNATURE_ALGORITHM
  ) {
    throw new Error("签名声明的 signedBy 必须是 { keyId: 16 位 hex, algorithm: ed25519 }");
  }
  if (!Number.isInteger(statement.releaseSeq) || statement.releaseSeq < 1) {
    throw new Error("签名声明的 releaseSeq 必须是 ≥1 的整数");
  }
  if (Number.isNaN(Date.parse(statement.signedAt))) {
    throw new Error("签名声明的 signedAt 不是合法的 ISO 时间");
  }
  return statement;
};

const compareStatement = (statement, release, item, schemaVersion) => {
  const problems = [];
  const expect = (condition, message) => {
    if (!condition) problems.push(message);
  };
  expect(statement.kind === item.kind, `kind 不一致：声明 ${statement.kind}，清单 ${item.kind}`);
  expect(statement.slug === item.slug, `slug 不一致：声明 ${statement.slug}，清单 ${item.slug}`);
  expect(statement.id === item.id, `id 不一致：声明 ${statement.id}，清单 ${item.id}`);
  expect(statement.version === item.version, `version 不一致：声明 ${statement.version}，清单 ${item.version}`);
  expect(statement.digest.value === item.digest, "digest 与清单不一致");
  if (schemaVersion === LEGACY_PACKAGE_SIGNATURE_SCHEMA_VERSION) {
    expect(statement.zip?.path === item.zip.path, "zip.path 与清单不一致");
    expect(statement.zip?.sha256 === item.zip.sha256, "zip.sha256 与清单不一致");
    expect(statement.zip?.bytes === item.zip.bytes, "zip.bytes 与清单不一致");
  }
  expect(statement.signedBy.keyId === release.signedBy.keyId, "signedBy.keyId 与清单不一致");
  expect(
    statement.signedBy.algorithm === (release.signedBy.algorithm ?? PUBLISHED_SIGNATURE_ALGORITHM),
    "signedBy.algorithm 与清单不一致",
  );
  expect(statement.releaseSeq === release.releaseSeq, "releaseSeq 与清单不一致");
  expect(statement.signedAt === release.generatedAt, "signedAt 与清单 generatedAt 不一致");
  return problems;
};

/** 校验单个 item 的逐包签名文件；返回 `{ statement, errors, warnings }`。 */
export const verifyPackageSignatureForItem = ({ root, release, item, key }) => {
  const errors = [];
  const warnings = [];
  if (!key) return { statement: null, errors: ["没有可用于验签的公钥"], warnings };
  if (!item?.signature || typeof item.signature !== "object") {
    return { statement: null, errors: ["缺 signature 指针"], warnings };
  }
  let local;
  try {
    local = localSignaturePath(root, item.signature.path);
  } catch (error) {
    return { statement: null, errors: [error.message], warnings };
  }
  if (!existsSync(local)) {
    return { statement: null, errors: [`签名文件不存在：${item.signature.path}`], warnings };
  }
  const fileBytes = readFileSync(local);
  const actualSha = sha256Hex(fileBytes);
  if (actualSha !== item.signature.sha256) {
    errors.push(
      `签名文件摘要与清单不一致：清单 ${String(item.signature.sha256).slice(0, 12)}…，实际 ${actualSha.slice(0, 12)}…`,
    );
  }

  let parsed;
  try {
    parsed = readPackageSignature(local);
  } catch (error) {
    return { statement: null, errors: [...errors, error.message], warnings };
  }
  if (parsed.envelope.keyId !== key.keyId) {
    errors.push(`签名文件 keyId ${parsed.envelope.keyId} 与清单 keyId ${key.keyId} 不一致`);
  }
  if (parsed.envelope.keyId !== release.signedBy.keyId) {
    errors.push(`签名文件 keyId ${parsed.envelope.keyId} 与 signedBy.keyId 不一致`);
  }
  if (!verifyBytes(parsed.payloadBytes, parsed.envelope.signature, key.publicKey)) {
    errors.push("逐包签名与公钥不匹配：包声明被改过，或签的不是这一份");
    return { statement: null, errors, warnings };
  }

  let statement;
  try {
    statement = parseStatement(parsed.payloadBytes, parsed.envelope.schemaVersion);
  } catch (error) {
    return { statement: null, errors: [...errors, error.message], warnings };
  }
  if (parsed.envelope.schemaVersion === LEGACY_PACKAGE_SIGNATURE_SCHEMA_VERSION) {
    warnings.push("逐包签名是旧版 v1（签名在包外、声明带 zip 哈希）：重新运行 pnpm release 生成包内 v2");
  } else {
    const payloadText = parsed.payloadBytes.toString("utf8");
    if (payloadText !== canonicalPackageStatement(statement)) {
      warnings.push("签名声明不是规范化输出：签名有效，但下次签名会整段重写");
    }
  }
  errors.push(...compareStatement(statement, release, item, parsed.envelope.schemaVersion));
  return { statement, errors, warnings };
};

/** 遍历目录里的逐包签名文件，用于报告孤立文件。 */
const listSignatureFiles = (dir) => {
  const out = [];
  const walk = (current) => {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(PACKAGE_SIGNATURE_SUFFIX)) out.push(absolute);
    }
  };
  walk(dir);
  return out;
};

/**
 * 校验一份 v2 清单里的全部逐包签名。
 *
 * @returns {{ errors: string[], warnings: string[], verified: Map<string, object>, legacy: boolean }}
 *   `verified` 的 key 与 build-catalog 的 `kind:id:version:digest` 对齐。
 */
export const verifyPackageSignatures = ({ root, release, key, now = Date.now() }) => {
  const errors = [];
  const warnings = [];
  const verified = new Map();
  if (!release) return { errors, warnings, verified, legacy: false };
  const schemaVersion = Number(release.schemaVersion);
  if (schemaVersion < 2) {
    warnings.push("清单是旧版 schemaVersion 1：没有逐包签名，重新运行 pnpm release 生成 v2");
    return { errors, warnings, verified, legacy: true };
  }
  if (!key) {
    errors.push("找不到可用于验证逐包签名的公钥");
    return { errors, warnings, verified, legacy: false };
  }
  const expected = new Set();
  for (const item of Array.isArray(release.items) ? release.items : []) {
    const result = verifyPackageSignatureForItem({ root, release, item, key });
    const where = `${item?.kind ?? "?"} \`${item?.slug ?? item?.id ?? "?"}\``;
    errors.push(...result.errors.map((message) => `${where}：${message}`));
    warnings.push(...result.warnings.map((message) => `${where}：${message}`));
    if (result.errors.length === 0 && result.statement) {
      verified.set(`${item.kind}:${item.id}:${item.version}:${item.digest}`, {
        path: item.signature.path,
        sha256: item.signature.sha256,
        statement: result.statement,
      });
      try {
        expected.add(localSignaturePath(root, item.signature.path));
      } catch {
        // 路径错误已经在 verifyPackageSignatureForItem 里报过
      }
    }
  }

  for (const file of listSignatureFiles(resolve(root, RELEASE_SIGNATURES_DIR))) {
    if (!expected.has(resolve(file))) {
      warnings.push(`存在孤立的逐包签名：${relative(root, file).split("\\").join("/")}`);
    }
  }
  return { errors, warnings, verified, legacy: false };
};
