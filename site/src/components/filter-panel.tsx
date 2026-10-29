"use client";

import { useState } from "react";

import { FilterChips, type ChipOption } from "@/components/filter-chips";
import { FilterSelect } from "@/components/filter-select";
import {
  BACKGROUND_POLICY_LABELS,
  FILTER_KIND_LABELS,
  INTERACTION_LEVEL_LABELS,
  MULTI_MONITOR_MODE_LABELS,
  PLATFORM_LABELS,
  QUALITY_CLASS_LABELS,
  RECOMMENDED_USE_LABELS,
  RENDER_CLASS_LABELS,
  SCENE_TYPE_LABELS,
  UPDATE_POLICY_LABELS,
  WIDGET_TYPE_LABELS,
  WINDOW_ABILITY_LABELS,
} from "@/lib/community/labels";
import { cn } from "@/lib/utils";
import type {
  BackgroundPolicy,
  CatalogFilters,
  CommonFilters,
  ContentTypeFilter,
  InteractionLevel,
  MultiMonitorMode,
  Platform,
  QualityClass,
  RecommendedUse,
  RenderClass,
  SceneType,
  UpdatePolicy,
  WidgetType,
  WindowAbility,
} from "@/types/community";

export type ResourceType = "all" | "scene" | "widget";

const ALL_OPTION: ChipOption = { value: "all", label: "全部" };
const ANY_OPTION: ChipOption = { value: "all", label: "不限" };

/** 枚举文案表 → 胶囊选项；`unknown` 不进筛选（未知只在详情页标注）。 */
function chipOptions(
  labels: Record<string, string>,
  first: ChipOption,
): ChipOption[] {
  return [
    first,
    ...Object.keys(labels)
      .filter((value) => value !== "unknown")
      .map((value) => ({ value, label: labels[value] })),
  ];
}

function selectOptions(labels: Record<string, string>) {
  return [
    { value: "all", label: "不限" },
    ...Object.keys(labels)
      .filter((value) => value !== "unknown")
      .map((value) => ({ value, label: labels[value] })),
  ];
}

/** 内容类型：全部资源时把壁纸与组件的分类合并成一组（取值域不重叠，`其他` 去重）。 */
function contentOptions(type: ResourceType): ChipOption[] {
  const merged = new Map<string, string>();
  if (type !== "widget") {
    for (const value of Object.keys(SCENE_TYPE_LABELS) as SceneType[]) {
      if (value !== "unknown") merged.set(value, SCENE_TYPE_LABELS[value]);
    }
  }
  if (type !== "scene") {
    for (const value of Object.keys(WIDGET_TYPE_LABELS) as WidgetType[]) {
      if (value !== "unknown" && !merged.has(value)) merged.set(value, WIDGET_TYPE_LABELS[value]);
    }
  }
  return [ALL_OPTION, ...[...merged].map(([value, label]) => ({ value, label }))];
}

/** 面板收起时按钮上要能看出当前生效了几项。 */
export function countActiveFilters(filters: CatalogFilters, type: ResourceType): number {
  const common = filters.common;
  let count = 0;
  if (common.qualityClass !== "all") count += 1;
  if (common.renderClass !== "all") count += 1;
  if (common.recommendedUse !== "all") count += 1;
  if (common.platform !== "all") count += 1;
  if (common.withoutSpecialPermissions) count += 1;
  if (filters.contentType !== "all") count += 1;

  if (type !== "widget" && filters.scene.multiMonitorMode !== "all") count += 1;

  if (type !== "scene") {
    const widget = filters.widget;
    if (widget.interactionLevel !== "all") count += 1;
    if (widget.updatePolicy !== "all") count += 1;
    if (widget.backgroundPolicy !== "all") count += 1;
    if (widget.windowAbilities.length > 0) count += 1;
  }

  return count;
}

/**
 * 目录页筛选。
 *
 * 首屏只放 6 组常用条件（资源类型、内容类型、性能与画质、使用场景、运行平台、权限要求）；
 * 渲染技术、多屏模式、交互程度、更新策略、后台行为、窗口能力收进「高级筛选」下拉。
 * 壁纸与组件的内容类型不同，切换资源类型时内容类型会重置，避免出现空结果。
 */
export function FilterPanel({
  type,
  onTypeChange,
  filters,
  onChange,
}: {
  type: ResourceType;
  onTypeChange: (type: ResourceType) => void;
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeCount = countActiveFilters(filters, type);

  const patchCommon = (patch: Partial<CommonFilters>) =>
    onChange({ ...filters, common: { ...filters.common, ...patch } });
  const patchScene = (patch: Partial<CatalogFilters["scene"]>) =>
    onChange({ ...filters, scene: { ...filters.scene, ...patch } });
  const patchWidget = (patch: Partial<CatalogFilters["widget"]>) =>
    onChange({ ...filters, widget: { ...filters.widget, ...patch } });

  const changeType = (next: ResourceType) => {
    onTypeChange(next);
    // 内容类型取值域随资源类型变化：切换后清空，避免选着「时钟时间」却只剩壁纸
    if (filters.contentType !== "all") onChange({ ...filters, contentType: "all" });
  };

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        label="资源类型"
        options={Object.keys(FILTER_KIND_LABELS).map((value) => ({
          value,
          label: FILTER_KIND_LABELS[value as ResourceType],
        }))}
        selected={[type]}
        onSelect={(value) => changeType(value as ResourceType)}
      />

      <FilterChips
        label="内容类型"
        options={contentOptions(type)}
        selected={[filters.contentType]}
        onSelect={(value) => onChange({ ...filters, contentType: value as ContentTypeFilter })}
      />

      <FilterChips
        label="性能与画质"
        options={chipOptions(QUALITY_CLASS_LABELS, ALL_OPTION)}
        selected={[filters.common.qualityClass]}
        onSelect={(value) => patchCommon({ qualityClass: value as QualityClass | "all" })}
      />

      <FilterChips
        label="使用场景"
        options={chipOptions(RECOMMENDED_USE_LABELS, ALL_OPTION)}
        selected={[filters.common.recommendedUse]}
        onSelect={(value) => patchCommon({ recommendedUse: value as RecommendedUse | "all" })}
      />

      <div className="flex flex-wrap gap-x-10 gap-y-5">
        <div className="min-w-[14rem]">
          <FilterChips
            label="运行平台"
            options={chipOptions(PLATFORM_LABELS, ALL_OPTION)}
            selected={[filters.common.platform]}
            onSelect={(value) => patchCommon({ platform: value as Platform | "all" })}
          />
        </div>
        <div className="min-w-[14rem]">
          <FilterChips
            label="权限要求"
            options={[ANY_OPTION, { value: "none", label: "无需特殊权限" }]}
            selected={[filters.common.withoutSpecialPermissions ? "none" : "all"]}
            onSelect={(value) => patchCommon({ withoutSpecialPermissions: value === "none" })}
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[12.5px] transition-colors",
            showAdvanced || activeCount > 0
              ? "border-primary/45 bg-primary/[0.07] text-ink"
              : "border-line text-muted hover:border-line-2 hover:text-ink",
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6h16M7 12h10M10 18h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          高级筛选
          {activeCount > 0 && (
            <span className="font-mono text-[10px] text-primary">{activeCount}</span>
          )}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={cn("ml-auto text-muted transition-transform", showAdvanced && "rotate-180")}
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-2 grid gap-4 rounded-xl border border-line/70 bg-panel/30 p-4 sm:grid-cols-2">
            <FilterSelect
              label="渲染技术"
              options={selectOptions(RENDER_CLASS_LABELS)}
              values={[filters.common.renderClass]}
              onChange={(values) => patchCommon({ renderClass: values[0] as RenderClass | "all" })}
            />

            {type !== "widget" && (
              <FilterSelect
                label="多屏模式"
                options={selectOptions(MULTI_MONITOR_MODE_LABELS)}
                values={[filters.scene.multiMonitorMode]}
                onChange={(values) =>
                  patchScene({ multiMonitorMode: values[0] as MultiMonitorMode | "all" })
                }
              />
            )}

            {type !== "scene" && (
              <>
                <FilterSelect
                  label="交互程度"
                  options={selectOptions(INTERACTION_LEVEL_LABELS)}
                  values={[filters.widget.interactionLevel]}
                  onChange={(values) =>
                    patchWidget({ interactionLevel: values[0] as InteractionLevel | "all" })
                  }
                />
                <FilterSelect
                  label="更新策略"
                  options={selectOptions(UPDATE_POLICY_LABELS)}
                  values={[filters.widget.updatePolicy]}
                  onChange={(values) => patchWidget({ updatePolicy: values[0] as UpdatePolicy | "all" })}
                />
                <FilterSelect
                  label="后台行为"
                  options={selectOptions(BACKGROUND_POLICY_LABELS)}
                  values={[filters.widget.backgroundPolicy]}
                  onChange={(values) =>
                    patchWidget({ backgroundPolicy: values[0] as BackgroundPolicy | "all" })
                  }
                />
                <FilterSelect
                  label="窗口能力"
                  multiple
                  options={Object.keys(WINDOW_ABILITY_LABELS).map((value) => ({
                    value,
                    label: WINDOW_ABILITY_LABELS[value as WindowAbility],
                  }))}
                  values={filters.widget.windowAbilities}
                  onChange={(values) => patchWidget({ windowAbilities: values as WindowAbility[] })}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
