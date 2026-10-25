import Link from "next/link";

import {
  asset,
  formatBytes,
  itemHref,
  kindLabel,
  type CatalogItem,
} from "@/lib/catalog";

/** 作品卡片：预览图占绝对主导，文字只留识别信息。 */
export function ItemCard({ item, priority = false }: { item: CatalogItem; priority?: boolean }) {
  return (
    <Link
      href={itemHref(item)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_18px_40px_-24px_rgba(16,26,24,0.35)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-night">
        {/* 静态导出不能走 next/image 优化，直接给 img；固定 16:10 避免布局跳动 */}
        <img
          src={asset(item.preview)}
          alt={`${item.name} 的预览图`}
          width={1280}
          height={800}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11.5px] text-white/90 backdrop-blur-sm">
            {formatBytes(item.downloadBytes)} · ZIP
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15.5px] font-semibold tracking-tight text-ink">{item.name}</h3>
          <span className="shrink-0 font-mono text-[11px] text-muted">v{item.version}</span>
        </div>

        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{item.description}</p>

        <div className="mt-auto flex items-center gap-2 pt-1 text-[11.5px] text-muted">
          <span className="rounded-full border border-line px-2 py-0.5">
            {kindLabel(item.kind)}
          </span>
          <span className="truncate">{item.author}</span>
          <span className="ml-auto shrink-0">{item.license}</span>
        </div>
      </div>
    </Link>
  );
}
