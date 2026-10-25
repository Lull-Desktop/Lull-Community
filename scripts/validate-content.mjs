#!/usr/bin/env node
/**
 * 社区内容校验。
 *
 *   node scripts/validate-content.mjs          # 只校验（PR / 部署前）
 *   node scripts/validate-content.mjs --fix    # 重算并写回摘要（= pnpm content:hash）
 *
 * 校验标准一律来自 Lull 主仓库，本仓库不自创格式：
 * - Scene / Catalog：直接用 `schemas/scene.schema.json`、`schemas/catalog.schema.json`
 *   （逐字复制自上游 `content/schema/`）走 JSON Schema 校验，再做语义与摘要检查；
 * - Widget：上游没有导出 schema，规则来自 `src-tauri/src/widget_package/manifest.rs`，
 *   这里逐条镜像（id、窗口区间、能力白名单、chrome 联动、network 联动…）。
 *
 * 设计原则：这里只判断「能不能装进 Lull」，不判断「好不好看」。
 * 展示层的问题（缺预览图、缺 README）只在 build 阶段警告。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import {
  assertDigestAlgorithm,
  listPackageFiles,
  packageDirFor,
  sceneDigest,
  widgetDigest,
} from "./lib/digest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content");
const SCHEMA_DIR = join(ROOT, "schemas");

/** 场景能力白名单，对应上游 `content/schema/scene.schema.json` 的 enum。 */
export const SCENE_CAPABILITIES = [
  "wallpaper.viewport",
  "wallpaper.canvas",
  "wallpaper.sync",
  "wallpaper.params",
  "wallpaper.script",
];

/** Widget 能力白名单，对应上游 `PLUGIN_CAPABILITIES`。 */
export const WIDGET_CAPABILITIES = [
  "widget.ui",
  "widget.theme",
  "widget.state",
  "widget.audio",
  "widget.media",
  "widget.network",
  "widget.chrome",
];

const SCENE_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const WIDGET_ID = /^[a-z][a-z0-9-]{1,31}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SLUG = /^[a-z0-9][a-z0-9-]{1,31}$/;
const SAFE_ENTRY = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*\.html$/;
const IMAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:webp|png|jpg|jpeg|avif)$/i;
const NETWORK_SOURCE = /^https:\/\/[^\s]+$|^http:\/\/localhost:\d+$/;

/** 与 Lull 安装管线一致的体积上限（`docs/extension-center.md` §7.1）。 */
const LIMITS = {
  files: 512,
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  previewBytes: 3 * 1024 * 1024,
};

const KINDS = ["scenes", "widgets"];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** 用 JSON Schema 校验，返回可读消息数组。 */
function ajvProblemList(validate, data) {
  if (validate(data)) return [];
  return (validate.errors ?? []).map((error) => {
    const at = error.instancePath.replace(/^\//, "").replaceAll("/", ".") || "根";
    const detail =
      error.keyword === "required"
        ? `缺少必填字段 ${error.params.missingProperty}`
        : error.keyword === "additionalProperties"
          ? `存在未定义字段 ${error.params.additionalProperty}`
          : error.keyword === "enum"
            ? `取值必须是 ${error.params.allowedValues.join(" / ")}`
            : error.keyword === "pattern"
              ? `格式不符合 ${error.params.pattern}`
              : error.message;
    return `${at}: ${detail}`;
  });
}

function loadValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  const sceneSchema = readJson(join(SCHEMA_DIR, "scene.schema.json"));
  const catalogSchema = readJson(join(SCHEMA_DIR, "catalog.schema.json"));
  const itemSchema = readJson(join(SCHEMA_DIR, "community-item.schema.json"));

  // catalog.schema.json 里是 `"$ref": "./scene.schema.json"`，
  // 相对它的 $id 会被解析成 https://lull.app/schemas/scene.schema.json，
  // 所以用这个 key 注册，才能让两个文件互相解析。
  const sceneKey = "https://lull.app/schemas/scene.schema.json";
  ajv.addSchema(sceneSchema, sceneKey);
  ajv.addSchema(catalogSchema);

  return {
    scene: ajv.getSchema(sceneKey),
    // catalog 用文件自己的 $id 取回，别猜路径
    catalog: ajv.getSchema(catalogSchema.$id),
    item: ajv.compile(itemSchema),
  };
}

/**
 * 校验一个场景包。返回问题列表，并顺带算出实际摘要。
 */
function checkScene(bundle, validators, report) {
  const at = "package/catalog.json";
  const catalogPath = join(bundle, "catalog.json");
  const problems = [];

  let catalog;
  try {
    catalog = readJson(catalogPath);
  } catch (error) {
    report.error(at, `不是合法 JSON：${error.message}`);
    return null;
  }

  const schemaProblems = ajvProblemList(validators.catalog, catalog);
  if (schemaProblems.length > 0) {
    for (const problem of schemaProblems) report.error(at, problem);
    return null;
  }

  if (catalog.scenes.length !== 1) {
    report.error(at, `内容包必须恰好包含一条 scene，当前 ${catalog.scenes.length} 条`);
    return null;
  }

  const scene = catalog.scenes[0];

  // 语义检查：schema 表达不了的联动关系
  if (scene.params !== undefined && !scene.capabilities.includes("wallpaper.params")) {
    report.error(at, "声明了 params 但没有申请 wallpaper.params 能力");
  }
  if (
    (scene.capabilities.includes("wallpaper.params") ||
      scene.capabilities.includes("wallpaper.sync")) &&
    !scene.capabilities.includes("wallpaper.script")
  ) {
    report.error(
      at,
      "wallpaper.params / wallpaper.sync 只能用于脚本场景，必须同时申请 wallpaper.script",
    );
  }

  // entry：schema 已校验格式，这里校验落盘位置与文件存在
  let packageDir;
  try {
    packageDir = packageDirFor(scene.entry, bundle);
  } catch (error) {
    report.error(at, error.message);
    return null;
  }
  const entryFile = join(bundle, ...scene.entry.split("/"));
  if (!existsSync(entryFile)) {
    report.error(at, `entry 指向的文件不存在：${scene.entry}`);
    return null;
  }

  // 静态包不允许出现脚本文件：宿主不会执行，作者容易误以为生效
  if (!scene.capabilities.includes("wallpaper.script")) {
    const scripts = listPackageFiles(packageDir).filter((file) =>
      /\.(?:js|mjs|ts)$/i.test(file.name),
    );
    if (scripts.length > 0) {
      report.warn(
        at,
        `静态场景里出现脚本文件（${scripts.map((file) => file.name).join(", ")}），` +
          "宿主的 sandbox 不会执行它们；要跑脚本请申请 wallpaper.script",
      );
    }
  }

  // 远程资源在 CSP 下会被拦截，属于内容问题而不是安装问题
  const remote = listPackageFiles(packageDir).filter((file) =>
    /\.(?:html|css)$/i.test(file.name),
  );
  for (const file of remote) {
    const text = readFileSync(file.absolute, "utf8");
    if (/https?:\/\/[^\s"'()]+/i.test(text)) {
      report.warn(
        `package/${scene.entry.replace(/[^/]+$/, file.name)}`,
        "引用了远程资源，运行时会被 CSP 拦截；内容包只应使用包内相对路径",
      );
    }
  }

  let digest;
  try {
    digest = sceneDigest({ id: scene.id, version: scene.version, dir: packageDir });
  } catch (error) {
    report.error(at, `无法计算摘要：${error.message}`);
    return null;
  }

  const declared = scene.integrity?.digest;
  if (!declared) {
    report.error(
      at,
      "缺少 integrity.digest；Lull 安装器要求场景包必须带整包摘要，请运行 pnpm content:hash",
    );
  } else if (declared !== digest && !report.fix) {
    report.error(
      at,
      `integrity 不匹配：声明 ${declared.slice(0, 16)}…，实际 ${digest.slice(0, 16)}…；` +
        "内容改动后运行 pnpm content:hash",
    );
  }

  return {
    kind: "scene",
    manifest: scene,
    catalog,
    digest,
    declared,
    packageDir,
    entryPath: entryFile,
    scenesRoot: bundle,
  };
}

/**
 * 校验一个 Widget 包。规则逐条镜像上游
 * `src-tauri/src/widget_package/manifest.rs` 的 `validate()`。
 */
function checkWidget(bundle, report) {
  const at = "package/widget.json";
  const manifestPath = join(bundle, "widget.json");

  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (error) {
    report.error(at, `不是合法 JSON：${error.message}`);
    return null;
  }
  if (!isObject(manifest)) {
    report.error(at, "清单必须是对象");
    return null;
  }

  const before = report.errors;
  if (manifest.schemaVersion !== 2) {
    report.error(at, `schemaVersion 必须是 2，当前为 ${String(manifest.schemaVersion)}`);
  }
  if (manifest.type !== "widget") {
    report.error(at, "type 必须是 widget");
  }
  if (typeof manifest.id !== "string" || !WIDGET_ID.test(manifest.id)) {
    report.error(at, `id 非法（需要 ^[a-z][a-z0-9-]{1,31}$）：${String(manifest.id)}`);
  }
  if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
    report.error(at, "name 必填");
  } else if ([...manifest.name].length > 64) {
    report.error(at, "name 不能超过 64 个字符");
  }
  if (typeof manifest.version !== "string" || !VERSION.test(manifest.version)) {
    report.error(at, `version 不是语义化版本：${String(manifest.version)}`);
  }
  if (manifest.builtin !== false) {
    report.error(at, "用户包必须显式声明 builtin: false");
  }
  if (manifest.hostApi !== 1) {
    report.error(at, `hostApi 目前只接受 1，当前为 ${String(manifest.hostApi)}`);
  }
  if (typeof manifest.license !== "string" || manifest.license.trim() === "") {
    report.error(at, "license 必填：安装器会拒绝未声明许可的包");
  }
  if (typeof manifest.entry !== "string" || !SAFE_ENTRY.test(manifest.entry)) {
    report.error(
      at,
      `entry 必须是包内的相对 .html 路径（禁止 ..、反斜杠、绝对路径）：${String(manifest.entry)}`,
    );
  }
  if (manifest.lifecycle !== undefined && !["background", "suspend"].includes(manifest.lifecycle)) {
    report.error(at, `lifecycle 只能是 background 或 suspend，当前为 ${manifest.lifecycle}`);
  }

  const win = manifest.window;
  if (!isObject(win)) {
    report.error(at, "window 必填");
  } else {
    const { width, height, minWidth, minHeight, resizable, chrome } = win;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 320 ||
      width > 1600 ||
      height < 240 ||
      height > 1200
    ) {
      report.error(at, `window 尺寸必须在 320x240 - 1600x1200 之间，当前 ${width}x${height}`);
    }
    if (resizable === true) {
      report.error(at, "首期窗口固定尺寸，不能声明 resizable: true");
    }
    if (minWidth !== undefined && minWidth > width) {
      report.error(at, "window.minWidth 不能大于 width");
    }
    if (minHeight !== undefined && minHeight > height) {
      report.error(at, "window.minHeight 不能大于 height");
    }
    if (chrome !== undefined && !["host", "custom"].includes(chrome)) {
      report.error(at, `window.chrome 只能是 host 或 custom，当前为 ${chrome}`);
    }
  }

  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : null;
  if (!capabilities) {
    report.error(at, "capabilities 必须是数组（可以为空）");
  } else {
    const seen = new Set();
    for (const capability of capabilities) {
      if (!WIDGET_CAPABILITIES.includes(capability)) {
        report.error(at, `插件不能申请能力：${capability}`);
      }
      if (seen.has(capability)) {
        report.error(at, `能力重复：${capability}`);
      }
      seen.add(capability);
    }
    if (win?.chrome === "custom" && !capabilities.includes("widget.chrome")) {
      report.error(at, "window.chrome=custom 必须同时申请 widget.chrome 能力");
    }
    const network = Array.isArray(manifest.network) ? manifest.network : [];
    if (capabilities.includes("widget.network") !== network.length > 0) {
      report.error(at, "widget.network 能力与 network 白名单必须同时出现");
    }
    for (const source of network) {
      if (typeof source !== "string" || !NETWORK_SOURCE.test(source)) {
        report.error(at, `network 只允许 https:// 或 http://localhost:<port>，当前 ${String(source)}`);
      }
    }
  }

  if (manifest.icon !== undefined && (typeof manifest.icon !== "string" || !IMAGE_FILE.test(manifest.icon))) {
    report.error(at, "icon 必须是包内 .png / .jpg / .jpeg / .webp 相对路径");
  }

  if (report.errors > before) return null;

  const entryFile = join(bundle, ...manifest.entry.split("/"));
  if (!existsSync(entryFile)) {
    report.error(at, `entry 指向的文件不存在：${manifest.entry}`);
    return null;
  }

  let digest;
  try {
    digest = widgetDigest({ id: manifest.id, version: manifest.version, dir: bundle });
  } catch (error) {
    report.error(at, `无法计算摘要：${error.message}`);
    return null;
  }

  const lockPath = join(bundle, ".lull-integrity.json");
  let declared = null;
  if (existsSync(lockPath)) {
    try {
      const lock = readJson(lockPath);
      declared = lock.digest;
      if (lock.schemaVersion !== 1 || lock.algorithm !== "sha256" || lock.scope !== "package") {
        report.error(
          ".lull-integrity.json",
          "字段必须是 schemaVersion:1 / algorithm:sha256 / scope:package",
        );
      }
      if (declared !== digest && !report.fix) {
        report.error(
          ".lull-integrity.json",
          `摘要不匹配：声明 ${String(declared).slice(0, 16)}…，实际 ${digest.slice(0, 16)}…；` +
            "包内容改动后运行 pnpm content:hash",
        );
      }
    } catch (error) {
      report.error(".lull-integrity.json", `不是合法 JSON：${error.message}`);
    }
  } else if (!report.fix) {
    report.error(
      ".lull-integrity.json",
      "缺少摘要锁；为了发布的 zip 可复现，请运行 pnpm content:hash 生成",
    );
  }

  return { kind: "widget", manifest, digest, declared, packageDir: bundle, entryPath: entryFile };
}

/** 包体积限制：与安装管线一致，避免合并进来却装不上。 */
function checkBudget(files, where, report) {
  if (files.length > LIMITS.files) {
    report.error(where, `文件数 ${files.length} 超过上限 ${LIMITS.files}`);
  }
  let total = 0;
  for (const file of files) {
    const size = readFileSync(file.absolute).length;
    total += size;
    if (size > LIMITS.fileBytes) {
      report.error(where, `${file.name} 超过单文件上限 8 MiB`);
    }
  }
  if (total > LIMITS.totalBytes) {
    report.error(where, `包体积 ${(total / 1048576).toFixed(1)} MiB 超过上限 64 MiB`);
  }
  return total;
}

/**
 * 扫描并校验全部内容。
 *
 * @param {{ root?: string, fix?: boolean, verifyDigest?: boolean }} [options]
 */
export function loadContent(options = {}) {
  const root = options.root ?? ROOT;
  const fix = options.fix ?? false;
  const contentDir = join(root, "content");
  const validators = loadValidators();

  let errors = 0;
  let warnings = 0;
  const problems = [];
  const report = {
    fix,
    get errors() {
      return errors;
    },
    error(where, message) {
      errors += 1;
      problems.push({ level: "error", where, message });
    },
    warn(where, message) {
      warnings += 1;
      problems.push({ level: "warn", where, message });
    },
  };

  // 摘要算法自检：拿官方「雾岚」包当基准，防止实现与 Rust 漂移
  if (options.verifyDigest !== false) {
    const mistDir = join(contentDir, "scenes", "mist", "package", "scenes", "mist");
    if (existsSync(mistDir)) {
      try {
        assertDigestAlgorithm(mistDir);
      } catch (error) {
        report.error("scripts/lib/digest.mjs", error.message);
      }
    }
  }

  const items = [];

  for (const group of KINDS) {
    const groupDir = join(contentDir, group);
    if (!existsSync(groupDir)) continue;
    const kind = group === "scenes" ? "scene" : "widget";

    const slugs = readdirSync(groupDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const slug of slugs) {
      const dir = join(groupDir, slug);
      const where = `content/${group}/${slug}`;

      if (!SLUG.test(slug)) {
        report.error(where, "目录名必须是 ^[a-z0-9][a-z0-9-]{1,31}$（同时作为 URL 段）");
        continue;
      }

      // 展示元数据
      const itemPath = join(dir, "item.json");
      if (!existsSync(itemPath)) {
        report.error(where, "缺少 item.json（网站展示元数据，不含作品本身的字段）");
        continue;
      }
      let item;
      try {
        item = readJson(itemPath);
      } catch (error) {
        report.error(`${where}/item.json`, `不是合法 JSON：${error.message}`);
        continue;
      }
      const itemProblems = ajvProblemList(validators.item, item);
      for (const problem of itemProblems) report.error(`${where}/item.json`, problem);
      if (itemProblems.length > 0) continue;
      if (item.slug !== slug) {
        report.error(`${where}/item.json`, `slug 必须与目录名一致（目录 ${slug}，声明 ${item.slug}）`);
      }

      // 预览图
      const previewName = item.preview ?? "preview.webp";
      const previewPath = join(dir, previewName);
      if (!existsSync(previewPath)) {
        report.error(`${where}/${previewName}`, "预览图不存在");
      } else if (readFileSync(previewPath).length > LIMITS.previewBytes) {
        report.error(`${where}/${previewName}`, "预览图超过 3 MiB，请压缩到 1600px 宽以内");
      }
      for (const shot of item.screenshots ?? []) {
        if (!existsSync(join(dir, shot))) {
          report.error(`${where}/${shot}`, "screenshots 里列出的文件不存在");
        }
      }

      // 内容包
      const bundle = join(dir, "package");
      if (!existsSync(bundle)) {
        report.error(`${where}/package`, "缺少 package/ 目录（要装进 Lull 的内容包）");
        continue;
      }

      const result = kind === "scene" ? checkScene(bundle, validators, report) : checkWidget(bundle, report);
      if (!result) continue;

      checkBudget(listPackageFiles(result.packageDir), `${where}/package`, report);

      // 作者是否提供了作品自身的许可文本
      if (!existsSync(join(dir, "LICENSE")) && !existsSync(join(bundle, "LICENSE"))) {
        report.warn(where, "没有 LICENSE 文件；建议在作品目录里附上许可原文");
      }
      if (!existsSync(join(dir, "README.md"))) {
        report.warn(where, "没有 README.md；详情页会缺少作品说明");
      }

      items.push({
        kind,
        slug,
        dir,
        where,
        item,
        previewName,
        readmePath: existsSync(join(dir, "README.md")) ? join(dir, "README.md") : null,
        licensePath: existsSync(join(dir, "LICENSE"))
          ? join(dir, "LICENSE")
          : existsSync(join(bundle, "LICENSE"))
            ? join(bundle, "LICENSE")
            : null,
        ...result,
      });
    }
  }

  // 跨作品：id 唯一、slug 唯一
  const idSeen = new Map();
  const slugSeen = new Map();
  for (const item of items) {
    const id = item.manifest.id;
    if (idSeen.has(id)) {
      report.error(item.where, `id 与 ${idSeen.get(id)} 冲突（${id}）；id 必须全局唯一`);
    } else {
      idSeen.set(id, item.where);
    }
    const key = `${item.kind}/${item.slug}`;
    if (slugSeen.has(key)) {
      report.error(item.where, `slug 冲突：${key}`);
    } else {
      slugSeen.set(key, item.where);
    }
    // 命名建议：场景 id 的末段应与目录名对齐（id 是「作者.场景」，目录是页面 URL）
    if (item.kind === "scene" && item.manifest.id.split(".").pop() !== item.slug) {
      report.warn(
        item.where,
        `id（${item.manifest.id}）的末段与目录名（${item.slug}）不一致，读者容易对应不上`,
      );
    }
  }

  // --fix：把实际摘要写回清单/锁文件
  if (fix) {
    for (const item of items) {
      if (item.kind === "scene") {
        if (item.manifest.integrity?.digest !== item.digest) {
          item.manifest.integrity = {
            algorithm: "sha256",
            scope: "package",
            digest: item.digest,
          };
          const catalogPath = join(item.dir, "package", "catalog.json");
          writeFileSync(catalogPath, `${JSON.stringify(item.catalog, null, 2)}\n`);
          problems.push({
            level: "fixed",
            where: `${item.where}/package/catalog.json`,
            message: `integrity → ${item.digest.slice(0, 16)}…`,
          });
        }
      } else {
        const lockPath = join(item.dir, "package", ".lull-integrity.json");
        const next = {
          schemaVersion: 1,
          algorithm: "sha256",
          scope: "package",
          digest: item.digest,
          source: "declared",
        };
        const text = `${JSON.stringify(next, null, 2)}\n`;
        const current = existsSync(lockPath) ? readFileSync(lockPath, "utf8") : "";
        if (current !== text) {
          writeFileSync(lockPath, text);
          problems.push({
            level: "fixed",
            where: `${item.where}/package/.lull-integrity.json`,
            message: `digest → ${item.digest.slice(0, 16)}…`,
          });
        }
      }
    }
  }

  return { root, contentDir, items, problems, errors, warnings, fix };
}

/** 简单的报告打印，CLI 与 CI 共用。 */
export function printReport(result) {
  const label = { error: "错误", warn: "警告", fixed: "已修正" };
  for (const problem of result.problems) {
    const line = `[${label[problem.level]}] ${problem.where}\n          ${problem.message}`;
    if (problem.level === "error") console.error(line);
    else console.log(line);
  }
  const counts = result.problems.reduce(
    (acc, problem) => ({ ...acc, [problem.level]: (acc[problem.level] ?? 0) + 1 }),
    {},
  );
  console.log(
    `\n内容统计：scene ${result.items.filter((item) => item.kind === "scene").length} 个，` +
      `widget ${result.items.filter((item) => item.kind === "widget").length} 个` +
      `｜错误 ${counts.error ?? 0}，警告 ${counts.warn ?? 0}` +
      (result.fix ? `，已修正 ${counts.fixed ?? 0}` : ""),
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const fix = process.argv.includes("--fix");
  const result = loadContent({ fix });
  printReport(result);
  if (result.errors > 0) {
    console.error("\n校验未通过：修掉错误再提交。");
    process.exit(1);
  }
  console.log("\n校验通过：所有作品都能被 Lull 安装。");
}
