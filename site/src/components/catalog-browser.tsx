"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { FilterPanel, countActiveFilters, type ResourceType } from "@/components/filter-panel";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { type CatalogItem } from "@/lib/catalog";
import { filterCatalog } from "@/lib/community/filter";
import { FILTER_KIND_LABELS } from "@/lib/community/labels";
import { cn } from "@/lib/utils";
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from "@/types/community";

type SortKey = "latest" | "name" | "size";
type TypeFilter = ResourceType;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "按日期" },
  { key: "name", label: "按名称" },
  { key: "size", label: "按体积" },
];

/** 类型只认 `?type=scene` / `?type=widget`；其他值一律回到全部。 */
function typeFromParam(value: string | null): TypeFilter {
  return value === "scene" || value === "widget" ? value : "all";
}

/**
 * 把类型写回地址栏，让 `/?type=scene` 这样的链接可以分享、刷新后仍然有效。
 *
 * 这里用 `replaceState` 而不是 `router.replace`：类型切换不该触发一次导航，
 * 也不该重置页面里的标签、关键词和筛选状态。`popstate` / 站内 Link 带来的
 * 查询串变化由下面的 `TypeParamSync` 负责接收。
 */
function writeTypeParam(type: TypeFilter) {
  const url = new URL(window.location.href);
  if (type === "all") url.searchParams.delete("type");
  else url.searchParams.set("type", type);
  window.history.replaceState(window.history.state, "", url);
}

function TypeParamSync({ onChange }: { onChange: (type: TypeFilter) => void }) {
  const searchParams = useSearchParams();
  const param = searchParams.get("type");

  useEffect(() => {
    onChange(typeFromParam(param));
  }, [param, onChange]);

  return null;
}

/**
 * 目录页的搜索与筛选。
 *
 * 数据在构建时已经内联进页面（catalog.json），所以筛选是纯前端的：
 * 没有接口、没有索引服务，也不需要为「搜索」引入任何后端。
 *
 * 筛选规则集中在 `lib/community/filter.ts`；面板结构在 `FilterPanel`：
 * 首屏只放常用条件，实现细节类条件收进「高级筛选」下拉。
 */
export function CatalogBrowser({ items }: { items: CatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("latest");
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const value of item.tags) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 12);
  }, [items]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      // 类型与标签是 AND 关系，但各自保留自己的选择。
      if (type !== "all" && item.kind !== type) return false;
      if (tag && !item.tags.includes(tag)) return false;
      if (!keyword) return true;
      return [item.name, item.description, item.author, item.id, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });

    return [...filterCatalog(filtered, filters)].sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name, "zh-Hans-CN");
      if (sort === "size") return left.downloadBytes - right.downloadBytes;
      if (left.addedAt !== right.addedAt) return right.addedAt.localeCompare(left.addedAt);
      return left.name.localeCompare(right.name, "zh-Hans-CN");
    });
  }, [items, query, tag, type, sort, filters]);

  const activeCount = countActiveFilters(filters, type);
  const hasFilters = type !== "all" || tag !== null || query.trim().length > 0 || activeCount > 0;

  const clearFilters = () => {
    setQuery("");
    setTag(null);
    setType("all");
    setFilters(DEFAULT_CATALOG_FILTERS);
    writeTypeParam("all");
  };

  return (
    <div>
      <Suspense fallback={null}>
        <TypeParamSync onChange={setType} />
      </Suspense>

      <div className="flex flex-col gap-5 border-b border-line pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">搜索作品</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜作品名、作者或标签…"
              className="h-10 w-full rounded-full border border-line bg-white/[0.02] pl-10 pr-4 text-[13px] text-ink placeholder:text-faint transition-colors focus:border-primary/60 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-1 rounded-lg border border-line p-1">
            {SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSort(option.key)}
                aria-pressed={sort === option.key}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] transition-colors",
                  sort === option.key ? "bg-primary/12 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <FilterPanel
          type={type}
          onTypeChange={(next) => {
            setType(next);
            writeTypeParam(next);
          }}
          filters={filters}
          onChange={setFilters}
        />

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              标签
            </span>
            <div role="group" aria-label="按标签筛选" className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTag(null)}
                aria-pressed={tag === null}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11.5px] transition-colors",
                  tag === null
                    ? "border-primary/50 bg-primary/10 text-ink"
                    : "border-line text-muted hover:border-line-2 hover:text-ink",
                )}
              >
                全部
              </button>
              {tags.map(([value, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTag(tag === value ? null : value)}
                  aria-pressed={tag === value}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11.5px] transition-colors",
                    tag === value
                      ? "border-primary/50 bg-primary/10 text-ink"
                      : "border-line text-muted hover:border-line-2 hover:text-ink",
                  )}
                >
                  {value}
                  <span className="ml-1.5 font-mono text-[10px] opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="py-4 text-[12px] text-muted">
        共 <span className="font-mono text-ink">{visible.length}</span> 个作品
        {type !== "all" && <span> · {FILTER_KIND_LABELS[type]}</span>}
        {tag && <span> · 标签「{tag}」</span>}
        {query.trim() && <span> · 关键词「{query.trim()}」</span>}
        {activeCount > 0 && <span> · 筛选 {activeCount} 项</span>}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-accent transition-colors hover:underline"
          >
            清除筛选
          </button>
        )}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-panel/40 px-6 py-16 text-center">
          <p className="text-[13.5px] text-ink">没有匹配的作品</p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            换个资源类型、内容类型或关键词，或者清掉筛选条件看看全部。
          </p>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-5 text-ink-soft">
            清除筛选
          </Button>
        </div>
      ) : (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ItemCard key={`${item.kind}-${item.slug}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
