/**
 * 表单 = 协议。这些测试守住那份协议的两端：
 *
 * - `.github/ISSUE_TEMPLATE/*.yml` 里每个字段的 `label:` 文本；
 * - `scripts/ci/lib/submission.mjs` 里的 `FORM_FIELDS`。
 *
 * 改了一边不改另一边，解析器就会读不到字段、CI 只会回一句「请填写」，
 * 而作者明明填了。这种错误在运行时不报错、只在 GitHub 上表现为一片空白，所以用测试拦。
 *
 * 期望值在这里**硬编码**（不 import FORM_TEMPLATE_FIELDS 来自己证自己）：
 * 这份清单是规格，代码是它的实现。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { FORM_FIELDS, LABELS, TITLE_PREFIXES } from "../scripts/ci/lib/submission.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(ROOT, ".github", "ISSUE_TEMPLATE");

/** 规格：每份模板里应当出现的字段（按 label 写，逐字）。 */
const EXPECTED = {
  "scene-submission": [
    "作品 id / Item id",
    "目录名 slug / Slug",
    "源码仓库 / Source repository",
    "版本 / Version (tag or commit)",
    "作品目录 / Item directory",
    "作品说明 / Description",
    "能力说明 / Capabilities",
    "许可证 / License",
    "运行截图 / Screenshot",
    "确认 / Confirmations",
  ],
  "scene-update": ["作品 id / Item id", "版本 / Version (tag or commit)", "更新说明 / What changed", "确认 / Confirmations"],
  "widget-submission": [
    "作品 id / Item id",
    "源码仓库 / Source repository",
    "版本 / Version (tag or commit)",
    "作品目录 / Item directory",
    "作品说明 / Description",
    "能力说明 / Capabilities",
    "许可证 / License",
    "运行截图 / Screenshot",
    "确认 / Confirmations",
  ],
  "widget-update": ["作品 id / Item id", "版本 / Version (tag or commit)", "更新说明 / What changed", "确认 / Confirmations"],
};

const read = (name) => readFileSync(join(TEMPLATE_DIR, `${name}.yml`), "utf8");

/** 只取字段级 `label:`；checkboxes 的分项是 `- label:`，不算字段。 */
const fieldLabels = (text) =>
  text
    .split(/\r?\n/)
    .filter((line) => /^\s+label:\s*\S/.test(line) && !/^\s*-\s*label:/.test(line))
    .map((line) => line.replace(/^\s+label:\s*/, "").trim());

const scalar = (text, key) => {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(text);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

test("每个模板的字段 label 与规格逐字一致", () => {
  for (const [name, labels] of Object.entries(EXPECTED)) {
    assert.deepEqual(fieldLabels(read(name)), labels, `${name}.yml 的字段 label 与规格不一致`);
  }
});

test("模板里的 label 都在 FORM_FIELDS 里，且没有未使用的字段", () => {
  const known = new Set(Object.values(FORM_FIELDS));
  const used = new Set();
  for (const name of Object.keys(EXPECTED)) {
    for (const label of fieldLabels(read(name))) {
      assert.ok(known.has(label), `${name}.yml 的 label「${label}」不在 FORM_FIELDS 里`);
      used.add(label);
    }
  }
  for (const [key, label] of Object.entries(FORM_FIELDS)) {
    assert.ok(used.has(label), `FORM_FIELDS.${key}（${label}）没有任何模板在用，解析器在读一个不存在的字段`);
  }
});

test("模板的 name / title 前缀 / labels 与 LABELS、TITLE_PREFIXES 对得上", () => {
  for (const name of Object.keys(EXPECTED)) {
    const text = read(name);
    const labels = JSON.parse(scalar(text, "labels").replaceAll("'", '"'));
    assert.deepEqual(labels, [name], `${name}.yml 的 labels 应当只有它自己`);
    assert.ok(LABELS[name], `${name} 没有在 LABELS 里登记`);
    assert.equal(scalar(text, "title"), `${TITLE_PREFIXES[name]} `, `${name}.yml 的 title 前缀不对`);
    assert.ok(scalar(text, "description"), `${name}.yml 缺 description`);
  }
});

test("四份模板都在，且没有遗漏的 kind×form 组合", () => {
  for (const key of Object.keys(LABELS)) {
    assert.ok(EXPECTED[key], `LABELS 里的 ${key} 没有对应模板`);
    assert.doesNotThrow(() => read(key), `${key}.yml 不存在`);
  }
  assert.equal(Object.keys(EXPECTED).length, 4);
});

/**
 * 结构自检：不引 YAML 依赖，只按缩进切块验证「每一块该有的东西都在」。
 * GitHub 自己也会校验 issue form，但那要等到用户点开表单才发现——太晚。
 */
test("模板结构完整：每块有 type，输入类有 id 与 label，id 不重复", () => {
  for (const name of Object.keys(EXPECTED)) {
    const text = read(name);
    const blocks = text.split(/^ {2}- type: /m).slice(1);
    assert.ok(blocks.length >= EXPECTED[name].length, `${name}.yml 的块数少于字段数`);

    const ids = new Set();
    for (const block of blocks) {
      const type = block.split("\n")[0].trim();
      assert.ok(
        ["markdown", "input", "textarea", "dropdown", "checkboxes"].includes(type),
        `${name}.yml 有不认识的控件类型：${type}`,
      );
      if (type === "markdown") {
        assert.match(block, /value:\s*\|/, `${name}.yml 的 markdown 块缺 value`);
        continue;
      }
      const id = /^\s{4}id:\s*(\S+)$/m.exec(block)?.[1];
      assert.ok(id, `${name}.yml 的 ${type} 块缺 id`);
      assert.ok(!ids.has(id), `${name}.yml 的 id \`${id}\` 重复`);
      ids.add(id);
      assert.match(block, /^\s{6}label:\s*\S/m, `${name}.yml 的 \`${id}\` 缺 label`);
      if (type === "checkboxes") {
        // 勾选项用 `- label: … / required: true` 表达，没有顶层 validations
        assert.match(block, /^\s{6}options:\s*$/m, `${name}.yml 的 \`${id}\` 缺 options`);
        assert.match(block, /^\s{8}- label:\s*\S/m, `${name}.yml 的 \`${id}\` 没有勾选项`);
        assert.match(block, /^\s{10}required:\s*true$/m, `${name}.yml 的 \`${id}\` 勾选项没有 required: true`);
      } else {
        assert.match(block, /^\s{6}required:\s*(true|false)$/m, `${name}.yml 的 \`${id}\` 缺 required`);
      }
    }

    // 必填字段数与「label 数量 - 可选字段数」对不上时，说明有人漏写 required
    assert.equal(ids.size, EXPECTED[name].length, `${name}.yml 的字段数与规格不一致`);
  }
});
