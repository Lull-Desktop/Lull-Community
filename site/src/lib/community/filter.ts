import type { CatalogItem } from "@/lib/catalog";
import type { CatalogFilters, SceneMeta, WidgetMeta, WindowAbility } from "@/types/community";

import { matchesCommon } from "./filter-common";

/** 勾选的能力必须「已确认支持」；`null`（未声明）不满足条件。 */
const WINDOW_ABILITY_GUARD: Record<WindowAbility, (meta: WidgetMeta) => boolean> = {
  drag: (meta) => meta.supportsDrag === true,
  resize: (meta) => meta.resizable === true,
  multiInstance: (meta) => meta.multiInstance === true,
  alwaysOnTop: (meta) => meta.alwaysOnTop === true,
  transparent: (meta) => meta.supportsTransparency === true,
};

export function matchesScene(meta: SceneMeta, filters: CatalogFilters): boolean {
  return (
    filters.scene.multiMonitorMode === "all" ||
    meta.multiMonitorModes.includes(filters.scene.multiMonitorMode)
  );
}

export function matchesWidget(meta: WidgetMeta, filters: CatalogFilters): boolean {
  const widget = filters.widget;
  if (widget.interactionLevel !== "all" && meta.interactionLevel !== widget.interactionLevel) {
    return false;
  }
  if (widget.updatePolicy !== "all" && meta.updatePolicy !== widget.updatePolicy) return false;
  if (widget.backgroundPolicy !== "all" && meta.backgroundPolicy !== widget.backgroundPolicy) {
    return false;
  }
  return widget.windowAbilities.every((ability) => WINDOW_ABILITY_GUARD[ability](meta));
}

/**
 * 内容类型按资源各自比对：壁纸看 `sceneType`，组件看 `widgetType`，
 * 两类取值域不重叠，所以一组控件就能表达。
 */
function matchesContentType(item: CatalogItem, filters: CatalogFilters): boolean {
  if (filters.contentType === "all") return true;
  const expected = item.meta.resourceType === "scene" ? item.meta.sceneType : item.meta.widgetType;
  return expected === filters.contentType;
}

export function filterCatalog(items: CatalogItem[], filters: CatalogFilters): CatalogItem[] {
  return items.filter((item) => {
    if (!matchesContentType(item, filters)) return false;
    if (!matchesCommon(item, filters.common)) return false;
    return item.meta.resourceType === "scene"
      ? matchesScene(item.meta, filters)
      : matchesWidget(item.meta, filters);
  });
}
