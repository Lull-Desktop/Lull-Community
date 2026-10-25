import Link from "next/link";

import { catalog } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-[15px] font-semibold tracking-tight">Lull Community</p>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-muted">
            第三方壁纸与桌面工具的展示层。内容放在 GitHub 仓库里，合并后自动校验、构建、发布，
            没有数据库，也没有后台。
          </p>
          <p className="mt-4 font-mono text-[11.5px] text-muted/80">
            索引生成于 {catalog.generatedAt.slice(0, 10)} · {catalog.counts.scenes} 壁纸 ·{" "}
            {catalog.counts.widgets} 工具
          </p>
        </div>

        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted">浏览</p>
          <ul className="mt-4 space-y-2.5 text-[13.5px]">
            <li>
              <Link href="/scenes" className="text-ink-soft hover:text-accent">
                壁纸场景
              </Link>
            </li>
            <li>
              <Link href="/widgets" className="text-ink-soft hover:text-accent">
                桌面工具
              </Link>
            </li>
            <li>
              <Link href="/submit" className="text-ink-soft hover:text-accent">
                提交作品
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted">仓库</p>
          <ul className="mt-4 space-y-2.5 text-[13.5px]">
            <li>
              <a
                href={catalog.repo.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink-soft hover:text-accent"
              >
                GitHub 源码
              </a>
            </li>
            <li>
              <a
                href={`${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink-soft hover:text-accent"
              >
                贡献指南
              </a>
            </li>
            <li>
              <a
                href={`${catalog.repo.url}/issues/new/choose`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink-soft hover:text-accent"
              >
                报告问题
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>内容以 CC BY 4.0 提供，网站代码以 MIT 提供。各作品的授权见作品页。</p>
          <p className="font-mono">Lull · 云栖</p>
        </div>
      </div>
    </footer>
  );
}
