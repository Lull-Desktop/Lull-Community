#!/usr/bin/env node
/**
 * 生成网站索引与可下载的内容包。
 *
 *   node scripts/build-catalog.mjs
 *
 * 做三件事，都不需要数据库：
 * 1. 复制预览图到 site/public/content-assets/（网站只读这一份，不读 content/）
 * 2. 把每个作品打成 Lull 能直接安装的 zip，放到 site/public/downloads/
 * 3. 输出 site/src/generated/catalog.json，供 Next 在构建时生成静态页面
 *
 * 「内容 → 网站」只有这一个方向：网站不再维护第二份作品清单。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { listPackageFiles, readFiles } from "./lib/digest.mjs";
import { getEntry, readRegistry } from "./lib/registry.mjs";
import { RELEASE_FILE, SIGNATURE_FILE, readRelease } from "./lib/signing.mjs";
import { writeZip } from "./lib/zip.mjs";
import { loadContent, printReport } from "./validate-content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const GENERATED = join(SITE, "src", "generated");
const ASSETS = join(SITE, "public", "content-assets");
const DOWNLOADS = join(SITE, "public", "downloads");
/** 发布清单与签名对外公布的副本（站点根 /release/）。 */
const RELEASE_PUBLIC = join(SITE, "public", "release");

/**
 * 固定 zip 内时间戳，让同一份内容在不同机器、不同时间打出相同字节。
 * 只影响 zip 头的 DOS 时间，不影响内容摘要。
 */
const ZIP_TIMESTAMP = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));

const repoSlug = process.env.GITHUB_REPOSITORY ?? "lull-desktop/Lull-Community";
const repoUrl = `https://github.com/${repoSlug}`;
const branch = process.env.GITHUB_REF_NAME ?? "main";

function fail(message) {
  console.error(`[build:catalog] ${message}`);
  process.exit(1);
}

/** 场景包：catalog.json + entry 所在目录，与 upstream content:pack 一致。 */
function sceneZipEntries(item) {
  const catalogPath = join(item.dir, "package", "catalog.json");
  const files = readFiles(listPackageFiles(item.packageDir));
  return [
    { name: "catalog.json", data: readFileSync(catalogPath) },
    ...files.map((file) => ({ name: `${item.manifest.entry.split("/").slice(0, -1).join("/")}/${file.name}`, data: file.data })),
  ];
}

/** Widget 包：包根全部非点号文件 + 旁路摘要锁。 */
function widgetZipEntries(item) {
  const files = readFiles(listPackageFiles(item.packageDir, { includeDot: false }));
  const lockPath = join(item.packageDir, ".lull-integrity.json");
  const lock = existsSync(lockPath)
    ? readFileSync(lockPath)
    : Buffer.from(
        `${JSON.stringify(
          {
            schemaVersion: 1,
            algorithm: "sha256",
            scope: "package",
            digest: item.digest,
            source: "computed",
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
  return [...files.map((file) => ({ name: file.name, data: file.data })), { name: ".lull-integrity.json", data: lock }];
}

function main() {
  const result = loadContent({ root: ROOT, fix: false });
  if (result.errors > 0) {
    printReport(result);
    fail("内容校验未通过，已停止构建。先跑 pnpm content:check 看问题。");
  }
  if (result.warnings > 0) printReport(result);

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

      const entries = item.kind === "scene" ? sceneZipEntries(item) : widgetZipEntries(item);
      const zipName =
        item.kind === "scene"
          ? `${item.manifest.id}-${item.manifest.version}.zip`
          : `${item.manifest.id}-${item.manifest.version}.lull-widget.zip`;
      const zipBytes = writeZip(join(DOWNLOADS, zipName), entries, ZIP_TIMESTAMP);

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
  const release = readRelease(ROOT);
  let releaseInfo = null;
  if (release.exists && release.data) {
    mkdirSync(RELEASE_PUBLIC, { recursive: true });
    cpSync(join(ROOT, RELEASE_FILE), join(RELEASE_PUBLIC, "release.json"));
    if (release.signatureExists) cpSync(join(ROOT, SIGNATURE_FILE), join(RELEASE_PUBLIC, "release.json.sig"));
    releaseInfo = {
      keyId: release.data.signedBy?.keyId ?? null,
      releaseSeq: release.data.releaseSeq ?? null,
      signedAt: release.data.generatedAt ?? null,
      url: "/release/release.json",
      signatureUrl: release.signatureExists ? "/release/release.json.sig" : null,
    };
  }

  // 逐项标注是否被签名覆盖：签名清单里有同 id、同版本、同摘要的条目才算。
  // 只比对 id 会把「签完之后又更新了版本」的旧条目算成已签名，那是错的。
  const signedKeys = new Set(
    (release.data?.items ?? []).map((entry) => `${entry.kind}:${entry.id}:${entry.version}:${entry.digest}`),
  );
  for (const item of items) {
    item.signed = signedKeys.has(`${item.kind}:${item.id}:${item.version}:${item.integrity}`);
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
      ? `[build:catalog] 发布签名：keyId ${releaseInfo.keyId} · seq ${releaseInfo.releaseSeq}`
      : "[build:catalog] 发布签名：尚未签名（站点上所有作品都会标为「来源未验证」）",
  );
}

main();
