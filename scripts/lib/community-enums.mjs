/**
 * 社区元数据枚举的单一事实来源。
 *
 * 枚举只写在 `schemas/community-item.schema.json` 的 `$defs` 里：
 * - 构建脚本（`scripts/lib/metadata.mjs`）按它做归一化与取值校验；
 * - 站点类型（`site/src/types/community/*`）从生成的
 *   `site/src/generated/community-enums.ts` 推导联合类型。
 *
 * 两边都不手写枚举表，避免 schema / TypeScript / 归一化三者各自漂移。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = ["schemas", "community-item.schema.json"];

/** `renderType` → `RENDER_TYPE`。 */
function constNameOf(defName) {
  return defName.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase();
}

/**
 * 读出 schema 里所有「字符串枚举」定义。
 *
 * `capabilitySupport`（boolean | null）与 `size`（对象）不是枚举，会被跳过。
 *
 * @param {string} root 仓库根目录
 * @returns {Record<string, string[]>}
 */
export function readEnums(root) {
  const schema = JSON.parse(readFileSync(join(root, ...SCHEMA_PATH), "utf8"));
  const enums = {};
  for (const [name, definition] of Object.entries(schema.$defs ?? {})) {
    if (Array.isArray(definition?.enum)) enums[name] = definition.enum;
  }
  return enums;
}

/**
 * 渲染成 TypeScript 常量文件。类型侧用
 * `(typeof RENDER_TYPE)[number]` 取联合，所以这里只导出 `as const` 数组。
 *
 * @param {Record<string, string[]>} enums
 */
export function renderEnumsTs(enums) {
  const header = [
    "// 由 scripts/build-catalog.mjs 从 schemas/community-item.schema.json 生成，请勿手改。",
    "// 枚举的单一事实来源是 JSON Schema；改枚举请改 schema 后重跑 pnpm build:catalog。",
    "",
  ].join("\n");

  const body = Object.entries(enums)
    .map(([name, values]) => {
      const items = values.map((value) => JSON.stringify(value)).join(", ");
      return `export const ${constNameOf(name)} = [${items}] as const;\n`;
    })
    .join("\n");

  return `${header}${body}`;
}
