import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog-browser";
import { scenes } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "壁纸场景",
  description:
    "Lull 的动态壁纸场景：纯 CSS 或沙箱脚本，包小、可离线、安装即生效。",
};

export default function ScenesPage() {
  const items = scenes();

  return (
    <div className="shell py-12">
      <header className="max-w-2xl">
        <p className="eyebrow">scenes</p>
        <h1 className="mt-3 flex items-baseline gap-3 text-[clamp(1.7rem,3.4vw,2.3rem)] font-normal tracking-[-0.01em]">
          壁纸场景
          <span className="font-mono text-[0.9rem] text-line-2">
            {String(items.length).padStart(2, "0")}
          </span>
        </h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          运行在空 sandbox 的 iframe 里：默认只有 HTML 与 CSS，声明脚本能力才执行 JavaScript。
          所有素材都用相对路径，内容包不会联网。
        </p>
      </header>

      <div className="mt-9">
        <CatalogBrowser items={items} />
      </div>
    </div>
  );
}
