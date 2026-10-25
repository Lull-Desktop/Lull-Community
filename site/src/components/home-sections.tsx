import Link from "next/link";

import { formatBytes, itemHref, kindLabel, scenes, widgets } from "@/lib/catalog";

const STEPS = [
  {
    index: "01",
    title: "提交作品",
    body: "在 content/ 下加一个目录：包内清单、预览图、说明与许可。开 Pull Request。",
    code: "content/scenes/<slug>/",
  },
  {
    index: "02",
    title: "自动校验",
    body: "Actions 用 Lull 自己的规范校验清单、路径安全、体积上限与整包摘要，并试着打包。",
    code: "pnpm content:check",
  },
  {
    index: "03",
    title: "合并即发布",
    body: "合并到 main 后重新生成索引、构建静态站、部署 GitHub Pages。没有后台，也没有数据库。",
    code: "deploy.yml → Pages",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-10 border-t border-line pt-14 md:grid-cols-[1fr_1.5fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            how it works
          </p>
          <h2 className="mt-4 text-[1.6rem] font-semibold leading-tight tracking-tight">
            仓库是内容的唯一来源
          </h2>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-muted">
            网站不再维护第二份作品清单。开发者提交作品，维护者审合并，剩下的由流水线完成——所以这里
            不会出现「网页上有、仓库里没有」的作品。
          </p>
          <Link
            href="/submit"
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
          >
            看提交要求
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step) => (
            <li
              key={step.index}
              className="group flex gap-5 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong"
            >
              <span className="font-mono text-[12px] text-line-strong transition-colors group-hover:text-accent">
                {step.index}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold tracking-tight">{step.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
                <code className="mt-2.5 inline-block rounded-md bg-paper-deep px-2 py-1 font-mono text-[11px] text-ink-soft">
                  {step.code}
                </code>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CatalogTeaser() {
  const sceneList = scenes();
  const widgetList = widgets();
  const newest = [...sceneList.slice(0, 1), ...widgetList.slice(0, 1)];

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-5 md:grid-cols-2">
        {(
          [
            { href: "/scenes", label: "壁纸场景", items: sceneList, hint: "纯 CSS 或沙箱脚本" },
            { href: "/widgets", label: "桌面工具", items: widgetList, hint: "静态 Web 包 + 能力申请" },
          ] as const
        ).map((group) => (
          <Link
            key={group.href}
            href={group.href}
            className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[1.05rem] font-semibold tracking-tight">{group.label}</p>
                <p className="mt-1.5 text-[12.5px] text-muted">{group.hint}</p>
              </div>
              <span className="font-mono text-[1.6rem] leading-none text-line-strong transition-colors group-hover:text-accent">
                {String(group.items.length).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-soft">
              {group.items.slice(0, 4).map((item) => (
                <span key={item.slug} className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-line-strong" />
                  {item.name}
                </span>
              ))}
            </div>

            <p className="mt-5 text-[12.5px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
              浏览全部 →
            </p>
          </Link>
        ))}
      </div>

      {newest.length > 0 && (
        <p className="mt-4 text-[12px] text-muted">
          最近更新：
          {newest.map((item, index) => (
            <span key={item.slug}>
              {index > 0 && " · "}
              <Link href={itemHref(item)} className="hover:text-accent">
                {item.name}
              </Link>
              {` （${kindLabel(item.kind)}，${formatBytes(item.downloadBytes)}）`}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
