import type { BackgroundPolicy, Platform, RecommendedUse } from "./common";
import type { MultiMonitorMode, SceneType } from "./scene";
import type { InteractionLevel, UpdatePolicy, WidgetType } from "./widget";

/**
 * 面向用户的筛选分类（不是元数据字段的镜像）。
 *
 * - `qualityClass`：把性能等级、硬件要求、功耗取向收进一组「性能与画质」；
 * - `renderClass`：把渲染类型与渲染技术合并成一个「渲染技术」下拉；
 * - `contentType`：内容类型，壁纸与组件共用一组控件，取值域互不重叠。
 */
export type QualityClass = "light" | "balanced" | "quality" | "unverified";
export type RenderClass = "css" | "canvas2d" | "webgl" | "video" | "hybrid";
export type ContentTypeFilter = SceneType | WidgetType | "all";

/** 窗口能力：勾选即要求「已确认支持」，未声明（null）不算支持。 */
export type WindowAbility = "drag" | "resize" | "multiInstance" | "alwaysOnTop" | "transparent";

export interface CommonFilters {
  qualityClass: QualityClass | "all";
  /** 高级筛选：渲染技术。 */
  renderClass: RenderClass | "all";

  recommendedUse: RecommendedUse | "all";
  platform: Platform | "all";
  withoutSpecialPermissions: boolean;

  /** 预留给外部调用方的组合筛选；站点 UI 的标签筛选单独处理。 */
  tags: string[];
  author: string | "all";
}

export interface SceneOnlyFilters {
  /** 高级筛选：多屏模式。 */
  multiMonitorMode: MultiMonitorMode | "all";
}

export interface WidgetOnlyFilters {
  /** 高级筛选。 */
  interactionLevel: InteractionLevel | "all";
  updatePolicy: UpdatePolicy | "all";
  backgroundPolicy: BackgroundPolicy | "all";
  windowAbilities: WindowAbility[];
}

export interface CatalogFilters {
  /** 首屏「资源类型」由路由参数 `?type=` 承载，不在这里重复。 */
  common: CommonFilters;
  contentType: ContentTypeFilter;
  scene: SceneOnlyFilters;
  widget: WidgetOnlyFilters;
}

export const DEFAULT_COMMON_FILTERS: CommonFilters = {
  qualityClass: "all",
  renderClass: "all",
  recommendedUse: "all",
  platform: "all",
  withoutSpecialPermissions: false,
  tags: [],
  author: "all",
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  common: DEFAULT_COMMON_FILTERS,
  contentType: "all",
  scene: { multiMonitorMode: "all" },
  widget: {
    interactionLevel: "all",
    updatePolicy: "all",
    backgroundPolicy: "all",
    windowAbilities: [],
  },
};
