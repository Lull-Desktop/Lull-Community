import type { SceneMeta } from "./scene";
import type { WidgetMeta } from "./widget";

export type ResourceMeta = SceneMeta | WidgetMeta;

export function isSceneMeta(meta: ResourceMeta): meta is SceneMeta {
  return meta.resourceType === "scene";
}

export function isWidgetMeta(meta: ResourceMeta): meta is WidgetMeta {
  return meta.resourceType === "widget";
}

export * from "./common";
export * from "./scene";
export * from "./widget";
export * from "./filters";
