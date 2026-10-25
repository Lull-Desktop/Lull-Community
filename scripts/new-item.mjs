#!/usr/bin/env node
/**
 * 生成一个符合规范的作品骨架，省掉记格式的力气。
 *
 *   node scripts/new-item.mjs scene  aurora-night
 *   node scripts/new-item.mjs widget my-tool
 *
 * 只创建目录与占位清单，不写摘要——填完内容后跑 pnpm content:hash。
 * 模板结构与 Lull 的包格式一致，别在这里加自定义字段：Lull 只认清单。
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = /^[a-z0-9][a-z0-9-]{1,31}$/;

const [kind, slug] = process.argv.slice(2);

if (!["scene", "widget"].includes(kind) || !slug || !SLUG.test(slug)) {
  console.error(
    "用法：node scripts/new-item.mjs <scene|widget> <slug>\n" +
      "  slug 允许小写字母、数字、连字符，2-32 位，例如 aurora-night",
  );
  process.exit(1);
}

const group = kind === "scene" ? "scenes" : "widgets";
const itemDir = join(ROOT, "content", group, slug);
const packageDir = join(itemDir, "package");

if (existsSync(itemDir)) {
  console.error(`目录已存在：content/${group}/${slug}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const author = process.env.LULL_AUTHOR ?? "your-name";
const id = kind === "scene" ? `${author}.${slug}` : slug;

mkdirSync(kind === "scene" ? join(packageDir, "scenes", slug) : packageDir, { recursive: true });

if (kind === "scene") {
  writeFileSync(
    join(packageDir, "catalog.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        scenes: [
          {
            schemaVersion: 1,
            type: "scene",
            id,
            name: slug,
            version: "1.0.0",
            description: "",
            author,
            license: "CC-BY-4.0",
            capabilities: ["wallpaper.viewport", "wallpaper.canvas"],
            entry: `scenes/${slug}/index.html`,
            theme: { background: "#0a1416", accent: "#9fc7c2" },
            performance: { tier: "low", targetFps: 30 },
            compatibility: { hostApi: 1, platforms: ["windows"] },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(packageDir, "scenes", slug, "index.html"),
    `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${slug}</title>
    <style>
      /* 静态场景：只有 HTML / CSS，不执行脚本。所有资源用包内相对路径。 */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; }
      body {
        background: radial-gradient(120% 80% at 50% 0%, #16302c 0%, #07110f 70%);
      }
    </style>
  </head>
  <body></body>
</html>
`,
  );
} else {
  writeFileSync(
    join(packageDir, "widget.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        type: "widget",
        id,
        name: slug,
        version: "1.0.0",
        description: "",
        author,
        license: "MIT",
        builtin: false,
        hostApi: 1,
        entry: "index.html",
        lifecycle: "background",
        capabilities: ["widget.ui"],
        window: {
          width: 480,
          height: 320,
          minWidth: 480,
          minHeight: 320,
          resizable: false,
          transparent: true,
          chrome: "host",
        },
        network: [],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(packageDir, "index.html"),
    `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${slug}</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main class="app">在这里写你的工具界面</main>
    <script src="./main.js" type="module"></script>
  </body>
</html>
`,
  );
  writeFileSync(join(packageDir, "style.css"), "html, body { margin: 0; height: 100%; background: transparent; }\n.app { padding: 20px; }\n");
  writeFileSync(join(packageDir, "main.js"), "// 需要宿主能力时再接 @lull/widget-sdk；不需要就别加依赖。\n");
}

writeFileSync(
  join(itemDir, "item.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      slug,
      tags: [],
      featured: false,
      addedAt: today,
      preview: "preview.webp",
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(itemDir, "README.md"),
  `# ${slug}\n\n一句话说清它是什么、适合什么时候用。\n\n## 特点\n\n- \n\n## 安装\n\n下载 \`.zip\` → Lull **设置 → 扩展 → 从文件安装**。\n\n## 许可\n\n${kind === "scene" ? "CC BY 4.0" : "MIT"}，作者 ${author}。\n`,
);

console.log(`已创建 content/${group}/${slug}`);
console.log("接下来：");
console.log(`  1. 填 content/${group}/${slug}/package/${kind === "scene" ? "catalog.json 与 scenes/" + slug + "/index.html" : "widget.json 与页面"}`);
console.log(`  2. 放一张 16:9 预览图到 content/${group}/${slug}/preview.webp`);
console.log("  3. pnpm content:hash && pnpm content:check");
