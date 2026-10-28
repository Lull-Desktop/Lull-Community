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
      <header className="max-w-2xl pt-10 sm:pt-12">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted">Last Updated</p>
          <span className="font-mono text-[10.5px] tracking-[0.12em] text-muted">
             {catalog.generatedAt.slice(0, 10).split("-").join("/")}
          </span>
        </div>
        <h1 className="mt-3 flex items-baseline gap-3 text-[clamp(2.1rem,4.2vw,3rem)] font-semibold tracking-[-0.02em]">
          组件市场
        </h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted ">
          Lull 的官方拓展组件与社区模组市场，由社区审核认证后并分享在市场中。
        </p>
      </header>

      <div className="mt-2">
        <CatalogBrowser items={catalog.items} />
      </div>
    </div>
  );
}
