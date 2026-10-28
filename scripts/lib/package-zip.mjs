/**
 * `scripts/lib/package-zip.mjs`
 *
 * 逐包 zip 的唯一构建入口：build-catalog 与 sign-release 必须用同一份条目
 * 生成同一份字节，否则「签名清单里的 zip 哈希」和「站点实际分发的 zip」会漂移。
 *
 * 包内签名文件固定放在包根 `.lull-signature.json`：
 * - widget 的摘要算法排除点号路径，签名文件天然不在摘要内；
 * - scene 的摘要只覆盖 entry 所在目录，包根的签名文件也在摘要之外。
 * 因此签名文件不会改变包摘要，也不会形成「签自己」的循环。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { listPackageFiles, readFiles } from "./digest.mjs";
import { PACKAGE_SIGNATURE_SUFFIX } from "./package-signature.mjs";

/** 固定 zip 内时间戳，让同一份内容在不同机器、不同时间打出相同字节。 */
export const ZIP_TIMESTAMP = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));

/** 场景包：`catalog.json` + entry 所在目录，与 upstream content:pack 一致。 */
function sceneEntries(item) {
  const catalogPath = join(item.dir, "package", "catalog.json");
  const files = readFiles(listPackageFiles(item.packageDir)).filter(
    (file) => !file.name.endsWith(PACKAGE_SIGNATURE_SUFFIX),
  );
  return [
    { name: "catalog.json", data: readFileSync(catalogPath) },
    ...files.map((file) => ({
      name: `${item.manifest.entry.split("/").slice(0, -1).join("/")}/${file.name}`,
      data: file.data,
    })),
  ];
}

/** Widget 包：包根全部非点号文件 + 旁路摘要锁。 */
function widgetEntries(item) {
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
  return [
    ...files.map((file) => ({ name: file.name, data: file.data })),
    { name: ".lull-integrity.json", data: lock },
  ];
}

/**
 * 构建一个包的 zip 条目。
 *
 * @param {object} item `loadContent()` 返回的作品条目
 * @param {Buffer|null} signatureBytes 包内 `.lull-signature.json` 的字节；null = 未签名
 * @returns {{ name: string, data: Buffer }[]}
 */
export function packageZipEntries(item, signatureBytes = null) {
  const entries = item.kind === "scene" ? sceneEntries(item) : widgetEntries(item);
  if (signatureBytes) {
    entries.push({ name: PACKAGE_SIGNATURE_SUFFIX, data: signatureBytes });
  }
  return entries;
}

/** 站点下载文件名（沿用现有命名，避免已发链接失效）。 */
export function packageZipName(item) {
  return item.kind === "scene"
    ? `${item.manifest.id}-${item.manifest.version}.zip`
    : `${item.manifest.id}-${item.manifest.version}.lull-widget.zip`;
}

/** 站点下载路径。 */
export function packageDownloadPath(item) {
  return `/downloads/${packageZipName(item)}`;
}
