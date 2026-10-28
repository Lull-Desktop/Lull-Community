#!/usr/bin/env node
/**
 * 生成网站索引与可下载的内容包。
 *
 *   node scripts/build-catalog.mjs
 *
 * 做四件事，都不需要数据库：
 * 1. 复制预览图到 site/public/content-assets/（网站只读这一份，不读 content/）
 * 2. 把每个作品打成 Lull 能直接安装的 zip，放到 site/public/downloads/
 * 3. 验签后把 release.json / .sig / signatures/ / keys.json 复制到 site/public/release/
 * 4. 输出 site/src/generated/catalog.json，供 Next 在构建时生成静态页面
 *
 * 清单验签失败时直接停止：不能让伪造/损坏的清单在页面上显示成「已签署发布」。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getEntry, readRegistry } from "./lib/registry.mjs";
import {
  RELEASE_FILE,
  RELEASE_SIGNATURES_DIR,
  SIGNATURE_FILE,
  fingerprintOf,
  loadPublicKeys,
  sha256Hex,
  verifyRelease,
} from "./lib/signing.mjs";
import {
  PACKAGE_SIGNATURE_SCHEMA_VERSION,
  PACKAGE_SIGNATURE_SUFFIX,
  PACKAGE_STATEMENT_VERSION,
  readPackageSignature,
  verifyPackageSignatures,
} from "./lib/package-signature.mjs";
import { ZIP_TIMESTAMP, packageZipEntries, packageZipName } from "./lib/package-zip.mjs";
import { writeZip } from "./lib/zip.mjs";
import { loadContent, printReport } from "./validate-content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const GENERATED = join(SITE, "src", "generated");
const ASSETS = join(SITE, "public", "content-assets");
const DOWNLOADS = join(SITE, "public", "downloads");
/** 发布清单与签名对外公布的副本（站点根 /release/）。 */
const RELEASE_PUBLIC = join(SITE, "public", "release");

const repoSlug = process.env.GITHUB_REPOSITORY ?? "lull-desktop/Lull-Community";
const repoUrl = `https://github.com/${repoSlug}`;
const branch = process.env.GITHUB_REF_NAME ?? "main";

function fail(message) {
  console.error(`[build:catalog] ${message}`);
  process.exit(1);
}

/**
 * 读取外部 sidecar，只有 v2（包内签名格式）才注入 zip。
 * v1 是「签名在包外、声明带 zip 哈希」的旧格式，注入后会自相矛盾；
 * 这里只提示重签，不阻断裂发布。
 */
function signatureBytesFor(item) {
  const path = join(
    ROOT,
    RELEASE_SIGNATURES_DIR,
    item.kind,
    `${item.slug}-${item.manifest.version}${PACKAGE_SIGNATURE_SUFFIX}`,
  );
  if (!existsSync(path)) return null;
  const parsed = readPackageSignature(path);
  if (parsed.envelope.schemaVersion !== PACKAGE_SIGNATURE_SCHEMA_VERSION) {
    console.warn(
      `[build:catalog] ${item.kind} \`${item.slug}\` 的逐包签名还是旧版 v${String(parsed.envelope.schemaVersion)}：` +
        "重新运行 pnpm release 生成包内 v2，当前 zip 不注入签名。",
    );
    return null;
  }
  return readFileSync(path);
}

function main() {
  const result = loadContent({ root: ROOT, fix: false });
  if (result.errors > 0) {
    printReport(result);
    fail("内容校验未通过，已停止构建。先跑 pnpm content:check 看问题。");
  }
  if (result.warnings > 0) printReport(result);

  // 先验签，再使用 release.json。否则一个伪造/损坏的清单也能让站点标出
  // 「已签署发布」——徽章就变成了「文件存在」而不是「签名有效」。
  const releaseCheck = verifyRelease(ROOT);
  if (releaseCheck.errors.length > 0) {
    for (const message of releaseCheck.errors) console.error(`[build:catalog] ${message}`);
    fail("发布清单验签失败：不复制清单、不生成 signed 标记。");
  }
  const signatureCheck = verifyPackageSignatures({
    root: ROOT,
    release: releaseCheck.release.data,
    key: releaseCheck.key,
  });
  if (signatureCheck.errors.length > 0) {
    for (const message of signatureCheck.errors) console.error(`[build:catalog] [逐包] ${message}`);
    fail("逐包签名校验失败：不复制清单、不生成 signed 标记。");
  }
  const seenWarnings = new Set();
  for (const warning of [
    ...releaseCheck.warnings,
    ...(signatureCheck.legacy ? [] : signatureCheck.warnings),
  ]) {
    if (seenWarnings.has(warning)) continue;
    seenWarnings.add(warning);
    console.warn(`[build:catalog] ${warning}`);
  }

  // 每次都重建，避免删掉的作品留下孤儿图和旧 zip
  for (const dir of [GENERATED, ASSETS, DOWNLOADS]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  // 发布清单的对外副本单独处理：没签名时这个目录根本不该存在（「未签名」要能表达出来）
  rmSync(RELEASE_PUBLIC, { recursive: true, force: true });

  // 登记表：谁提的、来自哪个仓库。文件不存在时（首次上线）当作空表。
  let registry = null;
  try {
    registry = readRegistry(ROOT);
  } catch (error) {
    fail(`community.json 读不出来：${error.message}`);
  }

  const items = result.items
    .map((item) => {
      const group = item.kind === "scene" ? "scenes" : "widgets";
      const assetDir = join(ASSETS, group, item.slug);
      mkdirSync(assetDir, { recursive: true });

      cpSync(join(item.dir, item.previewName), join(assetDir, item.previewName));
      for (const shot of item.item.screenshots ?? []) {
        cpSync(join(item.dir, shot), join(assetDir, shot));
      }

      // 签名随包：把外部 sidecar（v2）注入 zip 根部的 `.lull-signature.json`。
      // 这样用户只下载一个 zip，宿主就能在解压后直接验签。
      const signatureBytes = signatureBytesFor(item);
      const entries = packageZipEntries(item, signatureBytes);
      const zipName = packageZipName(item);
      const zipPath = join(DOWNLOADS, zipName);
      const zipBytes = writeZip(zipPath, entries, ZIP_TIMESTAMP);

      const packageBytes = entries.reduce((sum, entry) => sum + entry.data.length, 0);
      const registered = registry?.exists ? getEntry(registry, item.kind, item.manifest.id) : null;

      return {
        kind: item.kind,
        slug: item.slug,
        id: item.manifest.id,
        name: item.manifest.name,
        version: item.manifest.version,
        description: item.manifest.description ?? "",
        author: item.manifest.author ?? "未署名",
        license: item.manifest.license,
        capabilities: item.manifest.capabilities ?? [],
        tags: item.item.tags ?? [],
        featured: item.item.featured === true,
        addedAt: item.item.addedAt,
        preview: `/content-assets/${group}/${item.slug}/${item.previewName}`,
        screenshots: (item.item.screenshots ?? []).map(
          (shot) => `/content-assets/${group}/${item.slug}/${shot}`,
        ),
        download: `/downloads/${zipName}`,
        downloadBytes: zipBytes,
        // 站点上这份 zip 的字节摘要：页面「文件 SHA-256」直接用它，用户能对着自己的下载复算
        zipSha256: sha256Hex(readFileSync(zipPath)),
        packageBytes,
        fileCount: entries.length,
        integrity: item.digest,
        entry: item.manifest.entry,
        readme: item.readmePath ? readFileSync(item.readmePath, "utf8") : "",
        authorUrl: item.item.authorUrl ?? null,
        homepage: item.item.homepage ?? null,
        sourcePath: `content/${group}/${item.slug}`,
        // 登记信息：只对走过投稿流程的作品存在。展示层据此显示「来自 @alice 的仓库 · #42」。
        source: registered?.source ?? null,
        sourceCommit: registered?.commit ?? null,
        submission: registered?.submission ?? null,
        owners: registered?.owners ?? null,
        // 许可原文所在位置（相对仓库根），没有则是 null
        licensePath: item.licensePath
          ? relative(ROOT, item.licensePath).split("\\").join("/")
          : null,
        theme: item.manifest.theme ?? null,
        performance: item.manifest.performance ?? null,
        compatibility: item.manifest.compatibility ?? null,
        params: item.manifest.params ?? null,
        window: item.manifest.window ?? null,
        lifecycle: item.manifest.lifecycle ?? null,
        network: item.manifest.network ?? null,
      };
    })
    .sort((left, right) => {
      if (left.addedAt !== right.addedAt) return right.addedAt.localeCompare(left.addedAt);
      return left.name.localeCompare(right.name, "zh-Hans-CN");
    });

  // 发布清单与签名对外公布：站点根 /release/ 下给一份副本，用户与脚本都能直接取。
  // 没有清单（还没签过）时目录保持为空——「未签名」是一个要能表达出来的状态。
  // 走到这里时 releaseCheck 已经通过签名校验，才允许复制。
  const release = releaseCheck.release;
  let releaseInfo = null;
  /** 签名清单里「同 kind + id + 版本 + 摘要」的条目，用来标注 signed 与 zip 摘要。 */
  const signedEntries = new Map();
  if (release.exists && release.data && releaseCheck.signed) {
    mkdirSync(RELEASE_PUBLIC, { recursive: true });
    cpSync(join(ROOT, RELEASE_FILE), join(RELEASE_PUBLIC, "release.json"));
    if (release.signatureExists) cpSync(join(ROOT, SIGNATURE_FILE), join(RELEASE_PUBLIC, "release.json.sig"));

    // 逐包签名文件与公钥清单一并公布：前者供离线/镜像场景单独核对，
    // 后者供人工核对指纹。宿主端是否内置公钥、是否验签不在本仓库职责内。
    const signaturesDir = join(ROOT, RELEASE_SIGNATURES_DIR);
    if (existsSync(signaturesDir)) {
      cpSync(signaturesDir, join(RELEASE_PUBLIC, "signatures"), { recursive: true });
    }
    const publishedKeys = loadPublicKeys(ROOT).map(({ note, ...entry }) => ({
      ...entry,
      fingerprint: entry.fingerprint ?? fingerprintOf(entry.publicKey),
    }));
    writeFileSync(
      join(RELEASE_PUBLIC, "keys.json"),
      `${JSON.stringify({ schemaVersion: 1, keys: publishedKeys }, null, 2)}\n`,
    );

    const keyId = release.data.signedBy?.keyId ?? null;
    // 密钥的人可读名字只存在公钥清单里，清单本身只有 keyId；对不上就老实显示 keyId
    const key = keyId ? (loadPublicKeys(ROOT).find((entry) => entry.keyId === keyId) ?? null) : null;
    const keyStatus = key
      ? key.revoked === true
        ? "revoked"
        : key.retiredAt && Date.parse(`${key.retiredAt}T00:00:00Z`) <= Date.now()
          ? "retired"
          : key.notBefore && Date.parse(`${key.notBefore}T00:00:00Z`) > Date.now()
            ? "not-yet-valid"
            : "active"
      : "unknown";
    releaseInfo = {
      schemaVersion: release.data.schemaVersion ?? null,
      keyId,
      keyName: key?.name ?? null,
      keyLabel: key?.label ?? null,
      keyFingerprint: key ? (key.fingerprint ?? fingerprintOf(key.publicKey)) : null,
      keyStatus,
      releaseSeq: release.data.releaseSeq ?? null,
      signedAt: release.data.generatedAt ?? null,
      signatureAlgorithm: release.data.signedBy?.algorithm ?? "ed25519",
      signatureSchemaVersion:
        Number(release.data.schemaVersion) >= 2 ? PACKAGE_SIGNATURE_SCHEMA_VERSION : null,
      statementVersion: Number(release.data.schemaVersion) >= 2 ? PACKAGE_STATEMENT_VERSION : null,
      perPackageSignatures: Number(release.data.schemaVersion) >= 2,
      signatureCount: signatureCheck.verified.size,
      url: "/release/release.json",
      signatureUrl: "/release/release.json.sig",
      keysUrl: "/release/keys.json",
    };
    for (const entry of release.data.items ?? []) {
      signedEntries.set(`${entry.kind}:${entry.id}:${entry.version}:${entry.digest}`, entry);
    }
  }

  // 逐项标注是否被签名覆盖：签名清单里有同 id、同版本、同摘要的条目才算。
  // 只比对 id 会把「签完之后又更新了版本」的旧条目算成已签名，那是错的。
  for (const item of items) {
    const entry = signedEntries.get(`${item.kind}:${item.id}:${item.version}:${item.integrity}`);
    item.signed = Boolean(entry);
    item.signature = entry?.signature?.path ?? null;
    item.signatureSha256 = entry?.signature?.sha256 ?? null;
    item.signatureVerified = Boolean(
      entry &&
        signatureCheck.verified.has(`${item.kind}:${item.id}:${item.version}:${item.integrity}`),
    );
    // 清单里记的 zip 摘要必须与站上这份 zip 的字节一致，否则「签名覆盖」就是句空话
    const listedSha = entry?.zip?.sha256 ?? null;
    if (listedSha && listedSha !== item.zipSha256) {
      console.warn(
        `[build:catalog] ${item.id} v${item.version}：签名清单里的 zip 摘要与当前构建的 zip 不一致，` +
          "页面会按未覆盖处理。重新签一次再发布。",
      );
      item.signed = false;
      item.signatureVerified = false;
    }
    // 当前授权状态：current = 当前批次 + 逐包签名通过；batch-only = 当前批次但旧版清单无逐包签名；
    // not-listed = 有清单但这一版不在里面；unsigned = 整个仓库还没签过。
    item.authorization = item.signed
      ? item.signatureVerified
        ? "current"
        : "batch-only"
      : releaseInfo
        ? "not-listed"
        : "unsigned";
  }

  const catalog = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repo: { url: repoUrl, branch },
    counts: {
      scenes: items.filter((item) => item.kind === "scene").length,
      widgets: items.filter((item) => item.kind === "widget").length,
    },
    // 发布签名：只用于标注来源。null = 还没签过，页面显示「来源未验证」。
    release: releaseInfo,
    items,
  };

  writeFileSync(join(GENERATED, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);

  console.log(
    `[build:catalog] ${catalog.counts.scenes} 个壁纸 + ${catalog.counts.widgets} 个工具 → ` +
      `site/src/generated/catalog.json`,
  );
  for (const item of items) {
    console.log(
      `  · ${item.kind === "scene" ? "壁纸" : "工具"} ${item.name} v${item.version}` +
        ` → downloads/${item.download.split("/").pop()} (${(item.downloadBytes / 1024).toFixed(1)} KiB)`,
    );
  }
  console.log(
    releaseInfo
      ? `[build:catalog] 发布签名：${[releaseInfo.keyName, releaseInfo.keyLabel].filter(Boolean).join(" ") || "未登记名称"}` +
          `（keyId ${releaseInfo.keyId}）· seq ${releaseInfo.releaseSeq}` +
          (releaseInfo.perPackageSignatures
            ? ` · 逐包签名 ${releaseInfo.signatureCount} 个`
            : " · 旧版清单：没有逐包签名")
      : "[build:catalog] 发布签名：尚未签名（站点上所有作品都会标为「来源未验证」）",
  );
}

main();
