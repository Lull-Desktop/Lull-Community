import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog-browser";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "组件市场",
  description: "浏览 Lull 社区的全部场景与组件，按类型、标签或关键词筛选。",
};


export default function CatalogPage() {

  return (
    <div className="shell">
      <header className="relative overflow-hidden border-b border-line pb-8 pt-12 sm:pb-10 sm:pt-16">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">Lull Community / 作品画廊</p>
          <span className="font-mono text-[11px] tracking-[0.08em] text-muted">
            更新于 {catalog.generatedAt.slice(0, 10).split("-").join("/")}
          </span>
        </div>
        <h1 className="mt-5 font-serif text-[clamp(2.4rem,5vw,3.75rem)] font-normal tracking-[-0.035em]">
          组件市场
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-[1.85] text-ink-soft sm:text-base">
          发现由社区分享的动态壁纸与桌面组件，为你的桌面寻找下一片风景。
        </p>
      </header>

      <div className="mt-7 sm:mt-8">
        <CatalogBrowser items={catalog.items} />
      </div>
    </div>
  );
}
