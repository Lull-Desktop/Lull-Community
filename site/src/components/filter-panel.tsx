"use client";

import Link from "next/link";
import { useState } from "react";

import { FilterSelect, type SelectOption } from "@/components/filter-select";
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

const KINDS: ResourceType[] = ["all", "scene", "widget"];

/** 枚举文案表 → 下拉选项；`unknown` 不进筛选（未知只在详情页标注）。 */
function enumOptions(labels: Record<string, string>): SelectOption[] {
  return Object.keys(labels)
    .filter((value) => value !== "unknown")
    .map((value) => ({ value, label: labels[value] }));
}

function withAny(labels: Record<string, string>): SelectOption[] {
  return [{ value: "all", label: "不限" }, ...enumOptions(labels)];
}

/** 内容类型：全部资源时把壁纸与组件的分类合并（取值域不重叠，`其他` 去重）。 */
function contentOptions(type: ResourceType): SelectOption[] {
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
  return [{ value: "all", label: "不限" }, ...[...merged].map(([value, label]) => ({ value, label }))];
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
  if (common.tags.length > 0) count += 1;
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
 * 布局目标：筛选只占一行工具栏，资源列表才是页面主体。
 * - 资源类型用分段胶囊，其余常用条件各是一颗紧凑下拉胶囊；
 * - 标签与实现细节类条件收进「高级筛选」，展开后是带标题的下拉；
 * - 壁纸与组件的内容类型不同，切换资源类型时内容类型会重置。
 */
export function FilterPanel({
  type,
  onTypeChange,
  filters,
  onChange,
  tags,
}: {
  type: ResourceType;
  onTypeChange: (type: ResourceType) => void;
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  tags: readonly (readonly [string, number])[];
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

  const tagOptions: SelectOption[] = tags.map(([value, count]) => ({
    value,
    label: `${value} · ${count}`,
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="资源类型"
          className="flex items-center rounded-full border border-line p-0.5"
        >
          {KINDS.map((value) => {
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => changeType(value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
                  active
                    ? "bg-primary/20 font-medium text-ink"
                    : "text-muted hover:text-ink",
                )}
              >
                {FILTER_KIND_LABELS[value]}
              </button>
            );
          })}
        </div>

        <FilterSelect
          compact
          label="内容类型"
          options={contentOptions(type)}
          values={[filters.contentType]}
          onChange={(values) =>
            onChange({ ...filters, contentType: values[0] as ContentTypeFilter })
          }
        />

        <FilterSelect
          compact
          label="性能与画质"
          options={withAny(QUALITY_CLASS_LABELS)}
          values={[filters.common.qualityClass]}
          onChange={(values) => patchCommon({ qualityClass: values[0] as QualityClass | "all" })}
        />

        <FilterSelect
          compact
          label="使用场景"
          options={withAny(RECOMMENDED_USE_LABELS)}
          values={[filters.common.recommendedUse]}
          onChange={(values) =>
            patchCommon({ recommendedUse: values[0] as RecommendedUse | "all" })
          }
        />

        <FilterSelect
          compact
          label="运行平台"
          options={withAny(PLATFORM_LABELS)}
          values={[filters.common.platform]}
          onChange={(values) => patchCommon({ platform: values[0] as Platform | "all" })}
        />

        <FilterSelect
          compact
          label="权限"
          options={[
            { value: "all", label: "不限" },
            { value: "none", label: "无需特殊权限" },
          ]}
          values={[filters.common.withoutSpecialPermissions ? "none" : "all"]}
          onChange={(values) => patchCommon({ withoutSpecialPermissions: values[0] === "none" })}
        />

        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
          className={cn(
            "ml-auto flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors",
            showAdvanced || activeCount > 0
              ? "border-primary/45 bg-primary/[0.07] text-ink"
              : "border-line text-muted hover:border-line-2 hover:text-ink",
          )}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={cn("text-muted transition-transform", showAdvanced && "rotate-180")}
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
      </div>

      {showAdvanced && (
        <div className="grid gap-3 rounded-xl border border-line/70 bg-panel/30 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {tagOptions.length > 0 && (
            <FilterSelect
              label="标签"
              multiple
              options={tagOptions}
              values={filters.common.tags}
              onChange={(values) => patchCommon({ tags: values })}
            />
          )}

          <FilterSelect
            label="渲染技术"
            options={withAny(RENDER_CLASS_LABELS)}
            values={[filters.common.renderClass]}
            onChange={(values) => patchCommon({ renderClass: values[0] as RenderClass | "all" })}
          />

          {type !== "widget" && (
            <FilterSelect
              label="多屏模式"
              options={withAny(MULTI_MONITOR_MODE_LABELS)}
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
                options={withAny(INTERACTION_LEVEL_LABELS)}
                values={[filters.widget.interactionLevel]}
                onChange={(values) =>
                  patchWidget({ interactionLevel: values[0] as InteractionLevel | "all" })
                }
              />
              <FilterSelect
                label="更新策略"
                options={withAny(UPDATE_POLICY_LABELS)}
                values={[filters.widget.updatePolicy]}
                onChange={(values) => patchWidget({ updatePolicy: values[0] as UpdatePolicy | "all" })}
              />
              <FilterSelect
                label="后台行为"
                options={withAny(BACKGROUND_POLICY_LABELS)}
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

          <p className="mt-1 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-faint sm:col-span-2 lg:col-span-3">
            「未声明」表示作者没有给出这个字段，不等于「不支持」。
            <Link
              href="/submit#item-json"
              className="ml-1 text-accent transition-opacity hover:opacity-80"
            >
              字段说明 →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
