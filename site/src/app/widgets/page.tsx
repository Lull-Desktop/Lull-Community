import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog-browser";
import { widgets } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "桌面工具",
  description:
    "Lull 的第三方 Widget：静态 Web 包 + 逐项能力授权，安装不等于启用，启用不等于自动开窗。",
};

export default function WidgetsPage() {
  const items = widgets();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <header className="max-w-2xl">
        <p className="eyebrow">widgets</p>
        <h1 className="mt-3 flex items-baseline gap-3 text-[clamp(1.7rem,3.4vw,2.3rem)] font-semibold tracking-[-0.02em]">
          桌面工具
          <span className="font-mono text-[0.9rem] text-line-2">
            {String(items.length).padStart(2, "0")}
          </span>
        </h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          装进 Lull 后在独立窗口里运行。每个工具都要在清单里写明申请的能力，启用时逐项确认；
          窗口运行在不透明源的 iframe 里，拿不到宿主 DOM。
        </p>
      </header>

      <div className="mt-9">
        <CatalogBrowser items={items} />
      </div>
    </div>
  );
}
