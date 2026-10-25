"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { asset, catalog, formatBytes, itemHref, kindLabel, type CatalogItem } from "@/lib/catalog";

/**
 * 全站快速搜索。
 *
 * 索引在构建时已经进了 bundle，所以这里是纯前端匹配：没有接口、没有防抖请求，
 * 也没有"搜索服务不可用"这种状态。Cmd/Ctrl + K 唤起，回车打开第一个结果。
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const pool = catalog.items;
    if (!keyword) return pool.slice(0, 6);
    return pool
      .filter((item) =>
        [item.name, item.description, item.author, item.id, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 8);
  }, [query]);

  const open = (item: CatalogItem) => {
    onClose();
    router.push(itemHref(item));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="搜索作品"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
    >
      <button
        type="button"
        aria-label="关闭搜索"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-void/80 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line-2 bg-void-2/95 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) open(results[0]);
            }}
            placeholder="搜作品名、作者或标签…"
            className="h-8 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="rounded border border-line-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            ESC
          </kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-[13px] text-muted">
              没有匹配的作品，换个关键词试试。
            </li>
          )}
          {results.map((item) => (
            <li key={`${item.kind}-${item.slug}`}>
              <button
                type="button"
                onClick={() => open(item)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5"
              >
                <img
                  src={asset(item.preview)}
                  alt=""
                  width={56}
                  height={36}
                  className="h-9 w-14 shrink-0 rounded-md object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[13.5px] text-ink">{item.name}</span>
                    <span className="shrink-0 font-mono text-[10.5px] text-muted">
                      {kindLabel(item.kind)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                    {item.description}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-muted">
                  {formatBytes(item.downloadBytes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
