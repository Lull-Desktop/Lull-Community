/**
 * `scripts/lib/signing.mjs`
 *
 * community 发布签名的全部原语：Ed25519 密钥、签名与验签、发布清单的规范化字节。
 *
 * 分工（别混）：
 * - **私钥 = 发布权**，只有 community 独占持有，离线保存。本仓库任何路径都不该出现它；
 * - **公钥 = 验收标准**，放在 `keys/publisher-keys.json` 并随站点公布，后期内置进 LullAPP。
 *
 * 签名对象是 `release/release.json` 的**原始字节**（PureEdDSA，无预哈希）。
 * 因此写这个文件的那段代码必须自己拼文本——任何「先 parse 再 serialize」都会让
 * 签名与文件字节对不上，而这正是最容易踩的坑。
 *
 * 签名不参与「能不能装」，也不参与「能不能跑」；它只回答「这批字节是不是 community 发的」。
 */
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

export const RELEASE_DIR = "release";
export const RELEASE_FILE = "release/release.json";
export const SIGNATURE_FILE = "release/release.json.sig";
export const KEYS_FILE = "keys/publisher-keys.json";
export const RELEASE_SCHEMA_VERSION = 1;
export const PUBLISHED_SIGNATURE_ALGORITHM = "ed25519";

/** keyId = SPKI 公钥 DER 的 sha256 前 16 位 hex，人可读、够短、不会撞。 */
export const keyIdOf = (publicKeyPem) => {
  const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
};

/** 生成一对 Ed25519 密钥（PEM）。只在 keygen 与测试里用。 */
export const generateKeyPairPem = () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return { publicPem, privatePem, keyId: keyIdOf(publicPem) };
};

/** 从私钥推出公钥 PEM（签名后自检用，省得两边对不上）。 */
export const publicKeyPemOf = (privateKeyPem) =>
  createPublicKey(createPrivateKey(privateKeyPem)).export({ type: "spki", format: "pem" }).toString();

/** 对一段字节签名，返回单行 base64（64 字节签名）。 */
export const signBytes = (bytes, privateKeyPem) => {
  const key = createPrivateKey(privateKeyPem);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error(`私钥必须是 Ed25519，当前是 ${String(key.asymmetricKeyType)}`);
  }
  return sign(null, Buffer.from(bytes), key).toString("base64");
};

/** 验签：签名坏了、公钥不对、数据被改，一律 false（不抛错，避免把「无效」当成「崩溃」）。 */
export const verifyBytes = (bytes, signatureBase64, publicKeyPem) => {
  try {
    const signature = Buffer.from(String(signatureBase64).trim(), "base64");
    if (signature.length !== 64) return false;
    return verify(null, Buffer.from(bytes), createPublicKey(publicKeyPem), signature);
  } catch {
    return false;
  }
};

/** 读公钥清单；文件不存在返回空数组（首次上线的合法状态）。 */
export const loadPublicKeys = (root) => {
  const file = join(root, KEYS_FILE);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.keys)) {
    throw new Error(`${KEYS_FILE} 必须是 { schemaVersion, keys: [...] }`);
  }
  // 手改这个文件太容易只粘了 base64 或漏了字段；与其让 keyId 变成 undefined 静默失配，
  // 不如在这里说清楚该长什么样。
  parsed.keys.forEach((entry, index) => {
    const at = `${KEYS_FILE} 的 keys[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `${at} 必须是对象（keyId / algorithm / publicKey / notBefore），当前是 ${JSON.stringify(entry).slice(0, 60)}`,
      );
    }
    if (typeof entry.keyId !== "string" || !/^[0-9a-f]{16}$/.test(entry.keyId)) {
      throw new Error(`${at} 的 keyId 必须是 16 位小写 hex（由公钥算出，别手写）`);
    }
    if (typeof entry.publicKey !== "string" || !entry.publicKey.includes("BEGIN PUBLIC KEY")) {
      throw new Error(
        `${at} 的 publicKey 必须是完整 PEM（-----BEGIN PUBLIC KEY----- 开头）；` +
          "只粘 base64 正文不行，Node 读不出一把钥匙",
      );
    }
  });
  return parsed.keys;
};

/** 按 keyId 找一把当前可用的公钥，返回 `{ key, error }`。 */
export const findUsableKey = (keys, keyId, now = Date.now()) => {
  const key = (keys ?? []).find((entry) => entry.keyId === keyId);
  if (!key) return { key: null, error: `公钥清单里没有 keyId \`${keyId}\`` };
  if (key.revoked === true) return { key: null, error: `keyId \`${keyId}\` 已被撤销` };
  if (key.algorithm !== PUBLISHED_SIGNATURE_ALGORITHM) {
    return { key: null, error: `keyId \`${keyId}\` 的算法是 ${String(key.algorithm)}，只接受 ed25519` };
  }
  if (key.notBefore && Date.parse(`${key.notBefore}T00:00:00Z`) > now) {
    return { key: null, error: `keyId \`${keyId}\` 尚未生效（notBefore ${key.notBefore}）` };
  }
  if (key.retiredAt && Date.parse(`${key.retiredAt}T00:00:00Z`) <= now) {
    return { key: null, error: `keyId \`${keyId}\` 已于 ${key.retiredAt} 退役，不再用于新签名` };
  }
  return { key, error: null };
};

/**
 * 展开开头的 `~`。
 *
 * Node 不会替你展开它：`--key ~/keys/publisher.pem` 会被当成仓库里的一个字面量
 * `~` 目录，然后报「私钥不存在」——一个很容易查半天的坑。PowerShell 也不展开（那是 bash 的活）。
 */
export const expandHome = (value) => {
  const text = String(value ?? "");
  if (text === "~") return homedir();
  if (text.startsWith("~/") || text.startsWith("~\\")) return join(homedir(), text.slice(2));
  return text;
};

/**
 * 私钥绝不能在仓库里、也不能在 CI 上。这两条是硬保护，不靠「请注意」：
 * 私钥落在仓库目录内 → 拒绝；`CI` 环境变量存在 → 拒绝。
 */
export const assertOfflineSigningAllowed = (keyPath, root) => {
  if (process.env.CI) {
    throw new Error("检测到 CI 环境：发布签名必须在离线机器上完成，CI 永远不接触私钥");
  }
  const absoluteKey = resolve(expandHome(keyPath));
  if (!isAbsolute(absoluteKey) || !existsSync(absoluteKey)) {
    throw new Error(`私钥文件不存在：${keyPath}`);
  }
  const inside = relative(resolve(root), absoluteKey);
  if (!inside.startsWith("..") && !isAbsolute(inside)) {
    throw new Error(`私钥不能放在仓库目录里（${inside}）：请移到离线介质，仓库只保存公钥`);
  }
};

/** 把任意二进制字节算成 sha256 hex，用于 zip 与清单条目比对。 */
export const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * 发布清单的规范化文本。
 *
 * 字节稳定是签名可复现的前提，所以键序、缩进、换行、时间格式全部写死，
 * **不依赖 `JSON.stringify` 的偶然行为**。验签方算出的文本必须与文件字节逐字相同。
 */
export const canonicalReleaseJson = (release) => {
  const items = [...(release.items ?? [])].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "scene" ? -1 : 1;
    return String(left.slug).localeCompare(String(right.slug), "en");
  });
  const lines = [
    "{",
    `  "schemaVersion": ${RELEASE_SCHEMA_VERSION},`,
    `  "releaseSeq": ${Number(release.releaseSeq)},`,
    `  "generatedAt": ${JSON.stringify(release.generatedAt)},`,
    '  "signedBy": {',
    `    "keyId": ${JSON.stringify(release.signedBy.keyId)},`,
    `    "algorithm": ${JSON.stringify(release.signedBy.algorithm ?? PUBLISHED_SIGNATURE_ALGORITHM)}`,
    "  },",
    '  "repo": {',
    `    "url": ${JSON.stringify(release.repo.url)},`,
    `    "builtFrom": ${JSON.stringify(release.repo.builtFrom ?? "")}`,
    "  },",
    '  "counts": {',
    `    "scenes": ${items.filter((item) => item.kind === "scene").length},`,
    `    "widgets": ${items.filter((item) => item.kind === "widget").length}`,
    "  },",
    '  "items": [',
  ];
  items.forEach((item, index) => {
    lines.push("    {");
    lines.push(`      "kind": ${JSON.stringify(item.kind)},`);
    lines.push(`      "slug": ${JSON.stringify(item.slug)},`);
    lines.push(`      "id": ${JSON.stringify(item.id)},`);
    lines.push(`      "version": ${JSON.stringify(item.version)},`);
    lines.push(`      "digest": ${JSON.stringify(item.digest)},`);
    lines.push('      "zip": {');
    lines.push(`        "path": ${JSON.stringify(item.zip.path)},`);
    lines.push(`        "sha256": ${JSON.stringify(item.zip.sha256)},`);
    lines.push(`        "bytes": ${Number(item.zip.bytes)}`);
    lines.push("      }");
    lines.push(`    }${index === items.length - 1 ? "" : ","}`);
  });
  lines.push("  ]");
  lines.push("}");
  return `${lines.join("\n")}\n`;
};

/** 读发布清单与签名；不存在时 `exists: false`（等价于「还没签过」）。 */
export const readRelease = (root) => {
  const file = join(root, RELEASE_FILE);
  if (!existsSync(file)) return { exists: false, bytes: null, data: null, signature: null, signatureExists: false };
  const bytes = readFileSync(file);
  const signatureFile = join(root, SIGNATURE_FILE);
  const signatureExists = existsSync(signatureFile);
  let data = null;
  try {
    data = JSON.parse(bytes.toString("utf8"));
  } catch {
    data = null;
  }
  return {
    exists: true,
    bytes,
    data,
    signature: signatureExists ? readFileSync(signatureFile, "utf8").trim() : null,
    signatureExists,
  };
};

/**
 * 验一份已读出的发布清单：结构 → 公钥 → 签名 → 规范化。
 * 返回 `{ ok, errors, warnings, key }`；签名问题一律是错误，格式漂移只是警告。
 */
export const verifyRelease = (root, { now = Date.now() } = {}) => {
  const errors = [];
  const warnings = [];
  const release = readRelease(root);

  if (!release.exists) {
    return { ok: true, signed: false, errors, warnings: ["还没有发布清单（release/release.json）：当前一切内容都标为「来源未验证」"], release, key: null };
  }
  if (!release.data) {
    errors.push(`${RELEASE_FILE} 不是合法 JSON`);
    return { ok: false, signed: false, errors, warnings, release, key: null };
  }
  if (release.data.schemaVersion !== RELEASE_SCHEMA_VERSION) {
    errors.push(`${RELEASE_FILE} 的 schemaVersion 必须是 ${RELEASE_SCHEMA_VERSION}`);
  }
  if (!Number.isInteger(release.data.releaseSeq) || release.data.releaseSeq < 1) {
    errors.push(`${RELEASE_FILE} 的 releaseSeq 必须是 ≥1 的整数`);
  }
  const keyId = release.data.signedBy?.keyId;
  if (typeof keyId !== "string" || keyId === "") errors.push(`${RELEASE_FILE} 缺 signedBy.keyId`);

  if (!release.signatureExists) {
    errors.push(`缺少签名文件 ${SIGNATURE_FILE}`);
    return { ok: false, signed: false, errors, warnings, release, key: null };
  }

  const { key, error } = findUsableKey(loadPublicKeys(root), keyId, now);
  if (error) errors.push(error);
  if (!key) return { ok: false, signed: false, errors, warnings, release, key: null };

  if (!verifyBytes(release.bytes, release.signature, key.publicKey)) {
    errors.push(`${RELEASE_FILE} 的签名与公钥 \`${keyId}\` 不匹配：清单被改过，或签的不是这一份`);
    return { ok: false, signed: false, errors, warnings, release, key };
  }

  if (release.bytes.toString("utf8") !== canonicalReleaseJson(release.data)) {
    warnings.push(`${RELEASE_FILE} 的字节不是规范化输出（可能是手工编辑过）：签名有效，但下次签名会整段重写`);
  }

  return { ok: errors.length === 0, signed: true, errors, warnings, release, key };
};
