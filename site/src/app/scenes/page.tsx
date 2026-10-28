import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog-browser";
import { scenes } from "@/lib/catalog";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "壁纸场景",
  description:
    "Lull 的动态壁纸场景：纯 CSS 或沙箱脚本，包小、可离线、安装即生效。",
};

export default function ScenesPage() {
  const items = scenes();
  const filters = [
    { href: "/scenes", label: "下载壁纸", },
    { href: "/widgets", label: "下载工具", },
  ];
  return (
    <div className="shell ">
        <div className="mt-8 flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className={buttonVariants({ size: "lg" })}
              >
                {filter.label}
              </Link>
            ))}
        </div>
      <header className="max-w-2xl">
        <p className="eyebrow">scenes</p>
        <h1 className="mt-3 flex items-baseline gap-3 text-[clamp(1.7rem,3.4vw,2.3rem)] font-normal tracking-[-0.01em]">
          壁纸场景
        
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
