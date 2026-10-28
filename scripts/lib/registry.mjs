/**
 * `community.json`：社区作品的登记表。
 *
 * 记的是「谁提交的、来自哪个仓库、审查的是哪个 commit」，以及已收录版本。
 * 它**必须放在 content/ 之外**：内容目录里的一切都会被打进 zip 下发到用户机器，
 * 登记信息不该跟着走。
 *
 * 结构（按 kind 分两层，key 是清单里的 id，不是目录名）：
 *
 *   {
 *     "schemaVersion": 1,
 *     "scenes":  { "community.mist": { slug, owners, submission, source, path, commit, version, addedAt, updatedAt, lastIssue? } },
 *     "widgets": { "breathing": { … } }
 *   }
 *
 * 用 id 而不是 slug 作 key：id 参与摘要，是包的真实身份；slug 只是路径。
 * 分两层：scene 的 id 与 widget 的 id 是两套命名空间，合一会有理论碰撞。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const REGISTRY_FILE = "community.json";
export const REGISTRY_SCHEMA_VERSION = 1;

/** kind → community.json 里的分组名。 */
export const KIND_KEY = { scene: "scenes", widget: "widgets" };

const emptyRegistry = () => ({
  exists: false,
  schemaVersion: REGISTRY_SCHEMA_VERSION,
  scenes: {},
  widgets: {},
});

/**
 * 读登记表。文件不存在时返回空表（`exists: false`），调用方据此决定要不要做交叉校验。
 * 结构不认识时抛错——登记表坏了比没登记更危险，不能静默当空表。
 */
export function readRegistry(root) {
  const file = join(root, REGISTRY_FILE);
  if (!existsSync(file)) return emptyRegistry();

  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${REGISTRY_FILE} 必须是对象`);
  }
  if (parsed.schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    throw new Error(`${REGISTRY_FILE} 的 schemaVersion 必须是 ${REGISTRY_SCHEMA_VERSION}，当前为 ${String(parsed.schemaVersion)}`);
  }
  for (const key of ["scenes", "widgets"]) {
    if (parsed[key] === undefined) continue;
    if (parsed[key] === null || typeof parsed[key] !== "object" || Array.isArray(parsed[key])) {
      throw new Error(`${REGISTRY_FILE} 的 ${key} 必须是对象`);
    }
  }
  return {
    exists: true,
    schemaVersion: parsed.schemaVersion,
    scenes: parsed.scenes ?? {},
    widgets: parsed.widgets ?? {},
  };
}

/** 写回登记表：分组内按 id 排序，输出稳定（便于 diff）。 */
export function writeRegistry(registry, root) {
  const sortGroup = (group) =>
    Object.fromEntries(
      Object.keys(group ?? {})
        .sort()
        .map((id) => [id, group[id]]),
    );
  const next = {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    scenes: sortGroup(registry.scenes),
    widgets: sortGroup(registry.widgets),
  };
  const file = join(root, REGISTRY_FILE);
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  return file;
}

/** 某个 kind 下某个 id 的登记条目，没有则 null。 */
export function getEntry(registry, kind, id) {
  const key = KIND_KEY[kind];
  if (!key) return null;
  return registry?.[key]?.[id] ?? null;
}

/** 写入/更新条目。`patch` 为 undefined 的字段不会覆盖已有值。 */
export function setEntry(registry, kind, id, patch) {
  const key = KIND_KEY[kind];
  if (!key) throw new Error(`未知 kind：${String(kind)}`);
  const previous = registry[key]?.[id] ?? {};
  const next = { ...previous };
  for (const [field, value] of Object.entries(patch)) {
    if (value !== undefined) next[field] = value;
  }
  registry[key] = { ...(registry[key] ?? {}), [id]: next };
  return next;
}

/**
 * 登记表与已校验内容交叉校验。
 *
 * - 有登记就必须对得上（slug、version），对不上是错误——否则详情页会指向错的目录；
 * - 没登记不算问题：PR 投稿本来就不写登记表；
 * - 登记了但内容里没有，是错误——多半是删作品时忘了删登记。
 *
 * @param {{ scenes: Record<string, any>, widgets: Record<string, any> }} registry
 * @param {{ kind: string, slug: string, manifest: { id: string, version: string }, where: string }[]} items
 */
export function checkRegistry(registry, items) {
  const errors = [];
  const warnings = [];
  const byKey = new Map(items.map((item) => [`${item.kind}:${item.manifest.id}`, item]));

  for (const kind of ["scene", "widget"]) {
    const group = registry?.[KIND_KEY[kind]] ?? {};
    for (const [id, entry] of Object.entries(group)) {
      const item = byKey.get(`${kind}:${id}`);
      if (!item) {
        errors.push({
          where: REGISTRY_FILE,
          message: `登记了 ${kind} \`${id}\`，但 content/ 里没有对应作品；删作品时请一并删掉这条登记`,
        });
        continue;
      }
      if (entry.slug !== item.slug) {
        errors.push({
          where: REGISTRY_FILE,
          message: `${kind} \`${id}\` 登记的 slug 是 \`${entry.slug}\`，目录是 \`${item.slug}\`；slug 一经收录不可改，请核对`,
        });
      }
      if (entry.version !== item.manifest.version) {
        errors.push({
          where: REGISTRY_FILE,
          message: `${kind} \`${id}\` 登记版本 ${String(entry.version)}，清单版本 ${item.manifest.version}；内容更新后要一并更新登记`,
        });
      }
      if (!Array.isArray(entry.owners) || entry.owners.length === 0) {
        warnings.push({
          where: REGISTRY_FILE,
          message: `${kind} \`${id}\` 没有登记 owners，之后没人能提交更新`,
        });
      }
    }
  }
  return { errors, warnings };
}
