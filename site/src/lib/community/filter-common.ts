import type { CatalogItem } from "@/lib/catalog";
import type {
  CommonFilters,
  PerformanceTier,
  QualityClass,
  RenderClass,
} from "@/types/community";

/** 「性能与画质」是用户视角的一组，映射回统一的性能等级。 */
const QUALITY_TIER: Record<QualityClass, PerformanceTier> = {
  light: "low",
  balanced: "medium",
  quality: "high",
  unverified: "unverified",
};

/** 「渲染技术」把渲染类型与渲染技术合并成一个选项。 */
function matchesRenderClass(meta: CatalogItem["meta"], renderClass: RenderClass): boolean {
  switch (renderClass) {
    case "css":
      return meta.renderTech.includes("css") || meta.renderTech.includes("svg");
    case "canvas2d":
      return meta.renderTech.includes("canvas2d");
    case "webgl":
      return meta.renderTech.includes("webgl") || meta.renderTech.includes("webgpu");
    case "video":
      return meta.renderTech.includes("video");
    case "hybrid":
      return meta.renderType === "hybrid";
  }
}

/**
 * 公共筛选：单选维度精确匹配，多选维度至少命中一项，组间 AND。
 *
 * `null`（未声明）不等于 `false`：窗口能力只按「已确认支持」匹配。
 */
export function matchesCommon(
  item: Pick<CatalogItem, "tags" | "author" | "meta">,
  filters: CommonFilters,
): boolean {
  const meta = item.meta;

  if (filters.qualityClass !== "all" && meta.performanceTier !== QUALITY_TIER[filters.qualityClass]) {
    return false;
  }

  if (filters.renderClass !== "all" && !matchesRenderClass(meta, filters.renderClass)) return false;

  if (filters.recommendedUse !== "all" && !meta.recommendedUse.includes(filters.recommendedUse)) {
    return false;
  }

  if (filters.platform !== "all" && !meta.platforms.includes(filters.platform)) return false;

  if (filters.tags.length > 0 && !item.tags.some((tag) => filters.tags.includes(tag))) return false;

  if (filters.author !== "all" && item.author !== filters.author) return false;

  if (filters.withoutSpecialPermissions && meta.requiredPermissions.length > 0) return false;

  return true;
}
