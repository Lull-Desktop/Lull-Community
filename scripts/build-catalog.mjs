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
import { writeZip } from "./lib/zip.mjs";
import { loadContent, printReport } from "./validate-content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const GENERATED = join(SITE, "src", "generated");
const ASSETS = join(SITE, "public", "content-assets");
const DOWNLOADS = join(SITE, "public", "downloads");

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

  const catalog = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repo: { url: repoUrl, branch },
    counts: {
      scenes: items.filter((item) => item.kind === "scene").length,
      widgets: items.filter((item) => item.kind === "widget").length,
    },
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
}

main();
