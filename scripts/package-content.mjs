#!/usr/bin/env node
/**
 * 只打包，不建站。
 *
 *   node scripts/package-content.mjs            # 全部作品 → artifacts/
 *   node scripts/package-content.mjs mist       # 指定 slug → artifacts/
 *
 * 用的是和构建网站完全相同的打包逻辑（build-catalog 内部同一套函数语义），
 * 产物可以拖进 Lull 直接安装，用来在合并 PR 前手工验收。
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { listPackageFiles, readFiles } from "./lib/digest.mjs";
import { writeZip } from "./lib/zip.mjs";
import { loadContent, printReport } from "./validate-content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ZIP_TIMESTAMP = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));

const only = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const outDir = join(ROOT, "artifacts");

const result = loadContent({ root: ROOT, fix: false });
printReport(result);
if (result.errors > 0) {
  console.error("\n校验未通过，不打包。");
  process.exit(1);
}

const targets = result.items.filter((item) => only.length === 0 || only.includes(item.slug));
if (targets.length === 0) {
  console.error(`没有匹配的作品：${only.join(", ")}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const item of targets) {
  const files = readFiles(listPackageFiles(item.packageDir, { includeDot: false }));
  let entries;
  let name;

  if (item.kind === "scene") {
    const dirPart = item.manifest.entry.split("/").slice(0, -1).join("/");
    entries = [
      { name: "catalog.json", data: readFileSync(join(item.dir, "package", "catalog.json")) },
      ...files.map((file) => ({ name: `${dirPart}/${file.name}`, data: file.data })),
    ];
    name = `${item.manifest.id}-${item.manifest.version}.zip`;
  } else {
    const lockPath = join(item.packageDir, ".lull-integrity.json");
    entries = [
      ...files,
      {
        name: ".lull-integrity.json",
        data: existsSync(lockPath)
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
            ),
      },
    ];
    name = `${item.manifest.id}-${item.manifest.version}.lull-widget.zip`;
  }

  const bytes = writeZip(join(outDir, name), entries, ZIP_TIMESTAMP);
  console.log(
    `[content:pack] ${item.manifest.name} v${item.manifest.version} → artifacts/${name} ` +
      `(${entries.length} 个文件，${(bytes / 1024).toFixed(1)} KiB，${item.digest.slice(0, 12)}…)`,
  );
}
