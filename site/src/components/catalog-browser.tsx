"use client";

import { useMemo, useState } from "react";

import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "name" | "size";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "最新" },
  { key: "name", label: "名称" },
  { key: "size", label: "体积" },
];

/**
 * 目录页的搜索与筛选。
 *
 * 数据在构建时已经内联进页面（catalog.json），所以筛选是纯前端的：
 * 没有接口、没有索引服务，也不需要为「搜索」引入任何后端。
 */
export function CatalogBrowser({ items }: { items: CatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("latest");

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
      if (tag && !item.tags.includes(tag)) return false;
      if (!keyword) return true;
      return [item.name, item.description, item.author, item.id, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });

    return [...filtered].sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name, "zh-Hans-CN");
      if (sort === "size") return left.downloadBytes - right.downloadBytes;
      if (left.addedAt !== right.addedAt) return right.addedAt.localeCompare(left.addedAt);
      return left.name.localeCompare(right.name, "zh-Hans-CN");
    });
  }, [items, query, tag, sort]);

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-line pb-5">
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

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
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
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="py-4 text-[12px] text-muted">
        共 <span className="font-mono text-ink">{visible.length}</span> 个作品
        {tag && <span> · 标签「{tag}」</span>}
        {query.trim() && <span> · 关键词「{query.trim()}」</span>}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-panel/40 px-6 py-16 text-center">
          <p className="text-[13.5px] text-ink">没有匹配的作品</p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            换个关键词，或者清掉筛选条件看看全部。
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setTag(null);
            }}
            className="mt-5 text-ink-soft"
          >
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
