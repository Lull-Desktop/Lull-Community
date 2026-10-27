import Link from "next/link";

import ShinyText from "@/components/react-bits/ShinyText";
import { catalog } from "@/lib/catalog";

const COLUMNS = [
  {
    title: "浏览",
    links: [
      { href: "/scenes", label: "壁纸场景", external: false },
      { href: "/widgets", label: "桌面工具", external: false },
      { href: "/submit", label: "提交作品", external: false },
    ],
  },
  {
    title: "参与",
    links: [
      {
        href: `${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`,
        label: "贡献指南",
        external: true,
      },
      { href: `${catalog.repo.url}/issues/new/choose`, label: "报告问题", external: true },
      {
        href: `${catalog.repo.url}/blob/${catalog.repo.branch}/schemas/README.md`,
        label: "格式约定",
        external: true,
      },
    ],
  },
  {
    title: "仓库",
    links: [
      { href: catalog.repo.url, label: "GitHub 源码", external: true },
      { href: `${catalog.repo.url}/actions`, label: "部署流水线", external: true },
      {
        href: `${catalog.repo.url}/blob/${catalog.repo.branch}/LICENSE`,
        label: "网站许可",
        external: true,
      },
    ],
  },
];

export function SiteFooter() {
  const tags = [...new Set(catalog.items.flatMap((item) => item.tags))].slice(0, 14);

  return (
    <footer className="mt-[clamp(40px,6vw,80px)] border-t border-line text-[.86rem] text-faint">
      <div className="shell">
        {tags.length > 0 && (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-line py-3.5">
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              tags
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-8 pb-10 pt-12 md:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))]">
          <div>
            {/* 衬线字标：滚动进视口后反光缓慢循环 */}
            <p>
              <ShinyText
                text="Lull Community"
                color="#e6eee4"
                shineColor="#c8e0b6"
                speed={6}
                shineWidth={40}
                glow={0}
                trigger="view"
                yoyo
                className="font-serif text-[13px] tracking-[0.36em] uppercase"
              />
            </p>
            <p className="mt-3 max-w-[340px] text-[12.5px] leading-[1.75] text-muted">
              为安静的桌面，添一点会动的东西。壁纸场景与桌面工具全部来自社区，
              内容放在 GitHub 仓库里，合并后自动校验、构建、发布。
            </p>
            <p className="mt-4 font-mono text-[11px] text-faint/80">
              {catalog.counts.scenes} 壁纸 · {catalog.counts.widgets} 工具 · 无数据库
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-[10.5px] uppercase tracking-[0.14em] text-muted">
                {column.title}
              </h4>
              <ul className="grid gap-2">
                {column.links.map((link) =>
                  link.external ? (
                    <li key={link.href + link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[12.5px] text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-[12.5px] text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-5 font-mono text-[11px] text-faint">
          <p>
            © {catalog.generatedAt.slice(0, 4)} Lull Community · 代码 MIT · 内容 CC BY 4.0
          </p>
          <p>索引 {catalog.generatedAt.slice(0, 10)}</p>
        </div>
      </div>
    </footer>
  );
}
