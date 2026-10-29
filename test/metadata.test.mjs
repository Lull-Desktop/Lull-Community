/**
 * 站点元数据归一化的语义约束。
 *
 * 这里锁的是「不会乱猜」：清单没写的、作者没声明的，都不能在归一化时被伪造成
 * `web` / `false` / `required`。schema 仍是枚举与取值的单一事实来源。
 */
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readEnums } from "../scripts/lib/community-enums.mjs";
import { deriveMeta } from "../scripts/lib/metadata.mjs";
import {
  SCENE_ONLY_META_KEYS,
  WIDGET_ONLY_META_KEYS,
  loadContent,
} from "../scripts/validate-content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const enums = readEnums(ROOT);
const content = loadContent({ root: ROOT, digestPolicy: "skip" });

const items = content.items.map((entry) => ({
  kind: entry.kind,
  slug: entry.slug,
  tags: entry.item.tags,
  meta: deriveMeta({ kind: entry.kind, manifest: entry.manifest, item: entry.item }),
}));

function metaOf(slug) {
  const item = items.find((entry) => entry.slug === slug);
  assert.ok(item, `找不到作品 ${slug}`);
  return item.meta;
}

test("schema 里的枚举是唯一来源", () => {
  assert.ok(Object.keys(enums).length >= 15, "枚举定义过少，schema 可能没被正确解析");
  for (const [name, values] of Object.entries(enums)) {
    assert.ok(Array.isArray(values) && values.length > 0, `${name} 不是非空枚举`);
  }
  assert.ok(enums.performanceEvidence.includes("manifest-declared"));
  assert.ok(enums.renderType.includes("unknown"));
});

test("未声明的字段不会被猜测", () => {
  for (const item of items) {
    // 所有作品都没声明「支持暂停」：必须是未确认，而不是 false
    assert.equal(item.meta.supportsPause, null, `${item.slug} 的 supportsPause 被猜测了`);
    assert.notEqual(item.meta.renderType, undefined);
  }

  // 没有申请 wallpaper.sync 的壁纸，多屏同步是未确认
  assert.equal(metaOf("mist").supportsSync, null);
  assert.equal(metaOf("aurora-veil").supportsSync, null);

  // 窗口清单里没写的窗口能力同样保持未确认
  assert.equal(metaOf("minimal-clock").alwaysOnTop, null);
  assert.equal(metaOf("minimal-clock").supportsClickThrough, null);
});

test("从清单继承的性能等级会标注来源", () => {
  const aurora = metaOf("aurora-veil");
  assert.equal(aurora.performanceTier, "low");
  assert.equal(aurora.performanceEvidence, "manifest-declared");
  assert.equal(aurora.targetFps, 30);
  assert.deepEqual(aurora.platforms, ["windows"]);

  const three = metaOf("three-scene");
  assert.equal(three.performanceTier, "medium");
  assert.equal(three.performanceEvidence, "manifest-declared");
  assert.equal(three.targetFps, 60);
});

test("widget 的清单事实与作者声明各自独立", () => {
  const clock = metaOf("minimal-clock");
  assert.deepEqual(clock.defaultSize, { width: 480, height: 300 });
  assert.deepEqual(clock.minSize, { width: 480, height: 300 });
  // 清单明确写了 resizable:false / transparent:true，属于确认值
  assert.equal(clock.resizable, false);
  assert.equal(clock.supportsTransparency, true);
  // 以下两个来自 item.json 的声明，而不是从 lifecycle 推断
  assert.equal(clock.backgroundPolicy, "continue");
  assert.equal(clock.networkPolicy, "none");
});

test("跨类型字段不会进入归一化结果", () => {
  for (const item of items) {
    const foreign = item.kind === "scene" ? WIDGET_ONLY_META_KEYS : SCENE_ONLY_META_KEYS;
    for (const key of foreign) {
      assert.equal(Object.hasOwn(item.meta, key), false, `${item.slug} 混入了 ${key}`);
    }
  }
});

test("网络能力与联网策略是两件事", () => {
  // 只有 widget.network 能力 + 网络白名单，没有作者声明：仍是未声明
  const meta = deriveMeta({
    kind: "widget",
    manifest: {
      capabilities: ["widget.network"],
      network: ["https://example.test"],
      lifecycle: "background",
      window: { width: 400, height: 300, resizable: false, transparent: true },
    },
    item: {},
  });

  assert.equal(meta.networkPolicy, "unknown");
  assert.equal(meta.backgroundPolicy, "unknown");
  assert.equal(meta.alwaysOnTop, null);
  // 能力到权限的映射是确认的：widget.network 就是申请联网权限
  assert.deepEqual(meta.requiredPermissions, ["network"]);

  for (const item of items) {
    assert.notEqual(item.meta.networkPolicy, "required", `${item.slug} 自动获得了 required`);
  }
});

test("没有清单性能字段时等级不可信", () => {
  const meta = deriveMeta({
    kind: "scene",
    manifest: { capabilities: ["wallpaper.viewport"], entry: "scenes/x/index.html" },
    item: {},
  });
  assert.equal(meta.performanceTier, "unverified");
  assert.equal(meta.performanceEvidence, "unverified");
  assert.equal(meta.targetFps, null);
  assert.deepEqual(meta.platforms, []);
});
