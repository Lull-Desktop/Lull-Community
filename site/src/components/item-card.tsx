import Link from "next/link";
import type { CSSProperties } from "react";

import SpotlightCard from "@/components/react-bits/SpotlightCard";
import { asset, formatBytes, itemHref, kindLabel, type CatalogItem } from "@/lib/catalog";

/** SpotlightCard 的默认表面是纯色深灰；站点要的是「透明 + 自己的淡绿描边」，用 CSS 变量盖掉。 */
const SURFACE = {
  "--spotlight-card-surface": "transparent",
  "--spotlight-card-border": "var(--color-line)",
  "--spotlight-card-shadow": "none",
} as CSSProperties;

/**
 * 作品卡片：预览图占主导。
 *
 * 悬停光效改用 React Bits 的 SpotlightCard——跟随指针的一团柔光 + 描边高光，
 * 替掉了原来 `.card-glow` + `.glow-hover` 两个 CSS 类（含一段手写 box-shadow）。
 */
export function ItemCard({ item, priority = false }: { item: CatalogItem; priority?: boolean }) {
  return (
    <SpotlightCard
      className="h-full rounded-2xl! p-0!"
      style={SURFACE}
      spotlightColor="rgba(159, 191, 150, 0.75)"
      spotlightSize={300}
      intensity={0.18}
      borderGlow={0.75}
      proximity={90}
      softness={0.75}
    >
      <Link href={itemHref(item)} className="group flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden bg-void">
          <img
            src={asset(item.preview)}
            alt={`${item.name} 的预览图`}
            width={1280}
            height={720}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/15 to-transparent" />

          <span className="absolute top-3 right-3 rounded-md bg-void/70 px-2 py-0.5 font-mono text-[10.5px] text-ink-soft ring-1 ring-white/10 backdrop-blur-md">
            {formatBytes(item.downloadBytes)}
          </span>

          {/* 徽标放底部：不少壁纸的预览图左上角自带标题文字，压上去会互相打架 */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="rounded-md bg-void/75 px-2 py-0.5 text-[10.5px] font-medium text-ink ring-1 ring-white/12 backdrop-blur-md">
              {kindLabel(item.kind)}
            </span>
            {item.featured && (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-accent backdrop-blur-md">
                精选
              </span>
            )}
          </div>

          <div className="absolute right-3 bottom-3 flex max-w-[55%] translate-y-1 flex-wrap justify-end gap-1.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
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

        <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-[25px] font-semibold tracking-tight text-ink transition-colors group-hover:text-white">
              {item.name}
            </h3>
            <span className="shrink-0 rounded-md bg-primary/[0.1] px-1.5 py-0.5 font-mono text-[10px] text-faint ring-1 ring-white/10 transition-colors group-hover:text-ink-soft group-hover:ring-primary/30">
              v{item.version}
            </span>
          </div>

          <p className="line-clamp-2 text-[12px] leading-[1.7] text-muted">{item.description}</p>

          <div className="mt-auto flex items-center gap-2 pt-1 font-mono text-[10px] text-muted/85">
            <span className="truncate">{item.author}</span>
            <span className="ml-auto shrink-0">{item.license}</span>
            <span className="shrink-0 text-line-2" aria-hidden="true">
              ·
            </span>
            <span className="shrink-0">{formatBytes(item.downloadBytes)}</span>
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}
