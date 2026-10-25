import Link from "next/link";

import { catalog } from "@/lib/catalog";

export function SiteFooter() {
  const tags = [...new Set(catalog.items.flatMap((item) => item.tags))].slice(0, 14);

  return (
    <footer className="mt-24 border-t border-line bg-void-2/60">
      {/* 标签条：和视觉社区的"氛围标签"一致，但每个标签都来自真实作品 */}
      {tags.length > 0 && (
        <div className="border-b border-line/70">
          <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-4 sm:px-8">
            {tags.map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-ink">Lull Community</p>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
            第三方壁纸与桌面工具的展示层。内容放在 GitHub 仓库里，合并后自动校验、构建、发布，
            没有数据库，也没有后台。
          </p>
          <p className="mt-4 font-mono text-[11px] text-muted/80">
            索引生成于 {catalog.generatedAt.slice(0, 10)} · {catalog.counts.scenes} 壁纸 ·{" "}
            {catalog.counts.widgets} 工具
          </p>
        </div>

        <div>
          <p className="eyebrow">浏览</p>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {[
              { href: "/scenes", label: "壁纸场景" },
              { href: "/widgets", label: "桌面工具" },
              { href: "/submit", label: "提交作品" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-soft transition-colors hover:text-fuchsia">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">仓库</p>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {[
              { href: catalog.repo.url, label: "GitHub 源码" },
              { href: `${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`, label: "贡献指南" },
              { href: `${catalog.repo.url}/issues/new/choose`, label: "报告问题" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ink-soft transition-colors hover:text-fuchsia"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[11.5px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>内容以 CC BY 4.0 提供，网站代码以 MIT 提供。各作品的授权见作品页。</p>
          <p className="font-mono tracking-[0.18em]">LULL · 云栖</p>
        </div>
      </div>
    </footer>
  );
}
