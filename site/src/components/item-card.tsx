import Link from "next/link";

import { asset, formatBytes, itemHref, kindLabel, type CatalogItem } from "@/lib/catalog";

/** 作品卡片：预览图占绝对主导，霓虹只在悬停时出现。 */
export function ItemCard({ item, priority = false }: { item: CatalogItem; priority?: boolean }) {
  return (
    <Link href={itemHref(item)} className="group card-glow glow-hover flex flex-col overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-void">
        <img
          src={asset(item.preview)}
          alt={`${item.name} 的预览图`}
          width={1280}
          height={800}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/15 to-transparent" />

        <span className="absolute right-3 top-3 rounded-md bg-void/70 px-2 py-0.5 font-mono text-[10.5px] text-ink-soft backdrop-blur-md ring-1 ring-white/10">
          {formatBytes(item.downloadBytes)}
        </span>

        {/* 徽标放底部：不少壁纸的预览图左上角自带标题文字，压上去会互相打架 */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="rounded-md bg-void/75 px-2 py-0.5 text-[10.5px] font-medium text-ink backdrop-blur-md ring-1 ring-white/12">
            {kindLabel(item.kind)}
          </span>
          {item.featured && (
            <span className="rounded-md bg-gradient-to-r from-violet/85 to-fuchsia/85 px-2 py-0.5 text-[10.5px] font-medium text-white">
              精选
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex max-w-[55%] translate-y-1 flex-wrap justify-end gap-1.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] text-white/90 backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-ink transition-colors group-hover:text-white">
            {item.name}
          </h3>
          <span className="shrink-0 font-mono text-[10.5px] text-muted">v{item.version}</span>
        </div>

        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted">{item.description}</p>

        <div className="mt-auto flex items-center gap-2 pt-1 text-[11px] text-muted">
          <span className="truncate">{item.author}</span>
          <span className="ml-auto shrink-0 font-mono">{item.license}</span>
        </div>
      </div>
    </Link>
  );
}
