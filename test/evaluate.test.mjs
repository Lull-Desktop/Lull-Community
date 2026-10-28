/**
 * 端到端的「取作者仓库 → 落地 → 校验」测试。
 *
 * 用一个本地 git 仓库扮演作者的仓库（`allowLocal`），走的是生产同一条路径：
 * ref 解析 → 浅取 → stage 成 content/<group>/<slug>/ → 用仓库自己的 validate-content 复核。
 *
 * 这里不联网、不执行作者内容，所以可以在 CI 里跑。
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateIssue } from "../scripts/ci/lib/evaluate.mjs";
import { FORM_FIELDS, FORM_TEMPLATE_FIELDS } from "../scripts/ci/lib/submission.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const git = (cwd, args) =>
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const SCENE_CATALOG = (id, version = "1.0.0") => ({
  schemaVersion: 1,
  scenes: [
    {
      schemaVersion: 1,
      type: "scene",
      id,
      name: "极光帷幕",
      version,
      description: "测试用的极光场景。",
      author: "alice",
      license: "CC-BY-4.0",
      capabilities: ["wallpaper.viewport", "wallpaper.canvas"],
      entry: "scenes/aurora/index.html",
      theme: { background: "#04060e", accent: "#48d6b2" },
      performance: { tier: "low", targetFps: 30 },
      compatibility: { hostApi: 1, platforms: ["windows"] },
    },
  ],
});

/** 造一个「作者仓库」：按推荐结构放在 content/scenes/aurora/，打上 v1.0.0。 */
const makeAuthorRepo = ({ id = "alice.aurora", version = "1.0.0" } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "lull-author-"));
  const item = join(dir, "content", "scenes", "aurora");
  mkdirSync(join(item, "package", "scenes", "aurora"), { recursive: true });

  writeFileSync(join(item, "package", "catalog.json"), `${JSON.stringify(SCENE_CATALOG(id, version), null, 2)}\n`);
  writeFileSync(join(item, "package", "scenes", "aurora", "index.html"), "<!doctype html><title>aurora</title>\n");
  writeFileSync(
    join(item, "item.json"),
    `${JSON.stringify({ schemaVersion: 1, slug: "aurora", tags: ["极光"], featured: false, addedAt: "2026-11-01", preview: "preview.webp" }, null, 2)}\n`,
  );
  writeFileSync(join(item, "preview.webp"), Buffer.from("RIFF0000WEBPVP8 fake-but-small"));
  writeFileSync(join(item, "README.md"), "# 极光帷幕\n\n测试。\n");
  writeFileSync(join(item, "LICENSE"), "CC BY 4.0\n");

  git(dir, ["init", "-q"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "add aurora"]);
  git(dir, ["tag", "v1.0.0"]);
  return dir;
};

const bodyOf = (key, overrides = {}) => {
  const values = {
    itemId: "alice.aurora",
    slug: "aurora",
    repository: "https://github.com/alice/lull-wallpapers",
    ref: "v1.0.0",
    path: "content/scenes/aurora",
    description: "一张安静的极光壁纸。",
    capabilities: "wallpaper.viewport：铺满屏；wallpaper.canvas：Canvas 绘制",
    license: "CC-BY-4.0",
    screenshot: "![shot](https://github.com/user-attachments/assets/abc)",
    changes: "修了多屏下的相位偏移",
    confirmations: "- [x] 作者\n- [x] 无远程\n- [x] 素材\n- [x] 重审",
    ...overrides,
  };
  return FORM_TEMPLATE_FIELDS[key]
    .filter((field) => values[field] !== undefined)
    .map((field) => `### ${FORM_FIELDS[field]}\n\n${values[field]}`)
    .join("\n\n");
};

const issueOf = (key, overrides = {}) => ({
  number: 42,
  state: "open",
  title: "[壁纸提交] 极光帷幕",
  labels: [{ name: key }],
  body: bodyOf(key, overrides),
  user: { login: "alice", id: 1 },
});

const localRepo = (dir) => () => dir;

test("作者仓库的作品能被取回、落地并校验通过", async () => {
  const dir = makeAuthorRepo();
  try {
    const result = await evaluateIssue(null, {
      issue: issueOf("scene-submission"),
      baseDir: ROOT,
      fetchUrlFor: localRepo(dir),
      allowLocal: true,
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.kind, "scene");
    assert.equal(result.slug, "aurora");
    assert.equal(result.manifest.id, "alice.aurora");
    assert.match(result.digest, /^[0-9a-f]{64}$/);
    assert.equal(result.source.commit.length, 40);
    assert.ok(result.files.includes("package/catalog.json"), result.files.join(","));
    assert.ok(result.files.includes("item.json"));
    // 作者没写摘要也能通过：摘要在合并时重算
    assert.ok(!result.files.includes("package/.lull-integrity.json"));
    result.cleanup();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("id 已被收录时拒绝新提交", async () => {
  const dir = makeAuthorRepo({ id: "community.mist" });
  try {
    const result = await evaluateIssue(null, {
      issue: issueOf("scene-submission", { itemId: "community.mist" }),
      baseDir: ROOT,
      fetchUrlFor: localRepo(dir),
      allowLocal: true,
    });
    assert.match(result.errors.join("\n"), /已被收录/);
    result.cleanup();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("许可证与清单不一致时拒绝", async () => {
  const dir = makeAuthorRepo();
  try {
    const result = await evaluateIssue(null, {
      issue: issueOf("scene-submission", { license: "MIT" }),
      baseDir: ROOT,
      fetchUrlFor: localRepo(dir),
      allowLocal: true,
    });
    assert.match(result.errors.join("\n"), /与清单里的 license（CC-BY-4\.0）不一致/);
    result.cleanup();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("能力说明没覆盖到清单里的能力时拒绝", async () => {
  const dir = makeAuthorRepo();
  try {
    const result = await evaluateIssue(null, {
      issue: issueOf("scene-submission", { capabilities: "wallpaper.viewport：铺满屏幕，没有别的要求需要说明吧" }),
      baseDir: ROOT,
      fetchUrlFor: localRepo(dir),
      allowLocal: true,
    });
    assert.match(result.errors.join("\n"), /没有解释 `wallpaper\.canvas`/);
    result.cleanup();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("找不到 tag 时报可读的错误", async () => {
  const dir = makeAuthorRepo();
  try {
    const result = await evaluateIssue(null, {
      issue: issueOf("scene-submission", { ref: "v9.9.9" }),
      baseDir: ROOT,
      fetchUrlFor: localRepo(dir),
      allowLocal: true,
    });
    assert.match(result.errors.join("\n"), /找不到 tag 或分支/);
    result.cleanup();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("更新未登记的作品时提示去用提交表单", async () => {
  const result = await evaluateIssue(null, {
    issue: {
      ...issueOf("scene-update", { itemId: "alice.nothing", ref: "v1.0.0" }),
      title: "[壁纸更新] 不存在",
    },
    baseDir: ROOT,
  });
  assert.match(result.errors.join("\n"), /不是已收录的壁纸/);
  result.cleanup();
});

test("按推荐结构放好但「作品目录」留空时，直接告诉作者该填什么", async () => {
  const dir = makeAuthorRepo();
  try {
    const result = await evaluateIssue(null, {
      issue: issueOf("scene-submission", { path: "" }),
      baseDir: ROOT,
      fetchUrlFor: localRepo(dir),
      allowLocal: true,
    });
    const text = result.errors.join("\n");
    assert.match(text, /仓库根目录没有 `package\/`/);
    assert.match(text, /content\/scenes\/aurora/);
    assert.match(text, /「作品目录 \/ Item directory」填成/);
    result.cleanup();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
