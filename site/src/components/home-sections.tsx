import Link from "next/link";

import {
  asset,
  catalog,
  formatBytes,
  itemHref,
  kindLabel,
  type CatalogItem,
} from "@/lib/catalog";

/* ── 英雄区 ───────────────────────────────────────────── */

const FEATURES = [
  {
    title: "ZIP 直装",
    body: "下载即安装，包内清单写明版本、许可与所需能力。",
    icon: (
      <path
        d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "装前可知",
    body: "能力逐项列出：联网、持久化、自绘顶栏，一眼看清它碰什么。",
    icon: (
      <path
        d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 8.5 4.1-.9 7-4.3 7-8.5V6l-7-3Zm-2.6 8.6 2 2 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "内容即仓库",
    body: "PR 合并后自动校验、打包、发布，没有第二份作品清单。",
    icon: (
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    ),
  },
];

function Hero({ hero, sideA }: { hero: CatalogItem; sideA?: CatalogItem }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-10">
        <img
          src={asset(hero.preview)}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[center_60%] opacity-[0.22] blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/85 to-void" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_18%_10%,rgba(139,92,246,0.28),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_88%_18%,rgba(217,70,239,0.2),transparent_65%)]" />
        <div className="grid-lines absolute inset-0 opacity-60" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-white/[0.03] px-3 py-1 text-[11.5px] text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_2px_rgba(61,220,191,0.7)]" />
            社区作品持续收录中
          </span>

          <h1 className="mt-6 text-[clamp(2.1rem,4.6vw,3.4rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
            为安静的桌面，
            <br />
            添一点
            <span className="text-aurora">会动的东西</span>
          </h1>

          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted">
            Lull 的第三方壁纸场景与桌面工具。每个作品都是一个可以直接安装的 zip，
            清单、许可与所需能力都写在包里。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/scenes" className="btn-primary">
              浏览壁纸
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/widgets" className="btn-ghost">
              桌面工具
            </Link>
            <Link
              href="/submit"
              className="text-[13px] text-muted underline decoration-line-2 underline-offset-4 transition-colors hover:text-ink"
            >
              提交作品
            </Link>
          </div>

          <ul className="mt-9 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet/30 to-fuchsia/20 text-violet ring-1 ring-inset ring-violet/30">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {feature.icon}
                  </svg>
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium text-ink">{feature.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                    {feature.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-9 flex items-stretch gap-6 border-t border-line pt-6">
            {[
              { label: "壁纸场景", value: catalog.counts.scenes },
              { label: "桌面工具", value: catalog.counts.widgets },
              { label: "数据库", value: 0 },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={`flex-1 ${index > 0 ? "border-l border-line pl-6" : ""}`}
              >
                <dd className="font-mono text-[1.45rem] leading-none text-ink">
                  {String(stat.value).padStart(2, "0")}
                </dd>
                <dt className="mt-1.5 text-[11px] tracking-wide text-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* 预览拼贴：一张主图 + 两张偏移小图 + 一张浮动信息卡 */}
        <div className="relative hidden aspect-[4/3] lg:block">
          <div className="absolute inset-x-8 bottom-16 top-10 rounded-[2rem] bg-[radial-gradient(55%_55%_at_62%_38%,rgba(139,92,246,0.42),transparent_72%)] blur-2xl" />

          <Link
            href={itemHref(hero)}
            className="group absolute right-0 top-0 z-0 w-[82%] overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-[0_30px_90px_-40px_rgba(139,92,246,0.9)] transition-transform duration-500 hover:-translate-y-1"
          >
            <img
              src={asset(hero.preview)}
              alt={`${hero.name} 预览`}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void/60 via-transparent to-transparent" />
            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
              <span className="rounded-md bg-void/70 px-2 py-0.5 text-[10px] text-white/85 backdrop-blur-md ring-1 ring-white/10">
                {kindLabel(hero.kind)}
              </span>
              <span className="rounded-md bg-void/70 px-2 py-0.5 font-mono text-[10px] text-white/70 backdrop-blur-md ring-1 ring-white/10">
                v{hero.version}
              </span>
            </div>
          </Link>

          {sideA && (
            <Link
              href={itemHref(sideA)}
              className="absolute bottom-0 left-0 z-10 w-[36%] -rotate-6 overflow-hidden rounded-xl ring-1 ring-white/12 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0"
            >
              <img
                src={asset(sideA.preview)}
                alt={`${sideA.name} 预览`}
                className="aspect-[16/10] w-full object-cover"
              />
            </Link>
          )}


          <Link
            href={itemHref(hero)}
            className="absolute bottom-[6%] right-0 z-20 w-[54%] rounded-xl border border-line-2 bg-panel/92 p-3 backdrop-blur-md transition-colors hover:border-violet/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink">{hero.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted">
                {formatBytes(hero.downloadBytes)}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-muted">
              {hero.author} · {hero.license}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-fuchsia">
              查看详情
              <span aria-hidden="true">→</span>
            </p>
          </Link>

          <div className="absolute -left-5 top-4 z-20 flex items-center gap-2 rounded-full border border-line-2 bg-panel/90 px-3 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia shadow-[0_0_8px_2px_rgba(217,70,239,0.8)]" />
            <span className="text-[11px] text-ink-soft">最新收录</span>
            <span className="font-mono text-[10px] text-muted">
              {catalog.generatedAt.slice(5, 10).replace("-", "/")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 最近收录（feed 面板）──────────────────────────────── */

function LatestFeed({ items }: { items: CatalogItem[] }) {
  return (
    <div className="card-glow overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[12.5px] font-medium text-ink">最近收录</p>
        <Link href="/scenes" className="text-[11.5px] text-muted hover:text-fuchsia">
          全部
        </Link>
      </div>
      <ul className="divide-y divide-line/70">
        {items.map((item) => (
          <li key={`${item.kind}-${item.slug}`}>
            <Link
              href={itemHref(item)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <img
                src={asset(item.preview)}
                alt=""
                width={52}
                height={36}
                className="h-9 w-[52px] shrink-0 rounded-md object-cover ring-1 ring-white/10"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-ink">{item.name}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {item.author} · {item.tags[0] ?? kindLabel(item.kind)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-muted">
                {item.addedAt.slice(5).replace("-", "/")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 流程 ─────────────────────────────────────────────── */

const STEPS = [
  {
    index: "01",
    title: "提交作品",
    body: "在 content/ 下加一个目录：包内清单、预览图、说明与许可，然后开 Pull Request。",
    code: "content/scenes/<slug>/",
  },
  {
    index: "02",
    title: "自动校验",
    body: "Actions 用 Lull 自己的规范检查清单、路径安全、体积上限与整包摘要，并试着打包。",
    code: "pnpm content:check",
  },
  {
    index: "03",
    title: "合并即发布",
    body: "合并到 main 后重建索引与静态站，发布到 GitHub Pages。没有后台，也没有数据库。",
    code: "deploy.yml → Pages",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr]">
        <div>
          <p className="eyebrow">how it works</p>
          <h2 className="mt-3 text-[1.55rem] font-semibold leading-tight tracking-[-0.02em]">
            仓库是内容的唯一来源
          </h2>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
            网站不再维护第二份作品清单。开发者提交作品，维护者审合并，剩下的由流水线完成——
            所以这里不会出现「网页上有、仓库里没有」的作品。
          </p>
          <Link
            href="/submit"
            className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-fuchsia hover:underline"
          >
            看提交要求
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step) => (
            <li
              key={step.index}
              className="group flex gap-4 rounded-2xl border border-line bg-panel/60 px-5 py-4 transition-colors hover:border-violet/40"
            >
              <span className="font-mono text-[12px] text-line-2 transition-colors group-hover:text-violet">
                {step.index}
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold tracking-tight text-ink">{step.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
                <code className="mt-2.5 inline-block rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10.5px] text-ink-soft ring-1 ring-inset ring-line">
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

/* ── 分区入口 ─────────────────────────────────────────── */

export function CatalogTeaser({
  scenes,
  widgets,
}: {
  scenes: CatalogItem[];
  widgets: CatalogItem[];
}) {
  const groups = [
    { href: "/scenes", label: "壁纸场景", hint: "纯 CSS 或沙箱脚本", items: scenes },
    { href: "/widgets", label: "桌面工具", hint: "静态 Web 包 + 逐项授权", items: widgets },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Link
            key={group.href}
            href={group.href}
            className="group card-glow glow-hover relative overflow-hidden p-6"
          >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet/15 blur-3xl transition-opacity group-hover:opacity-100" />
            {group.items[0] && (
              <img
                src={asset(group.items[0].preview)}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-12 -right-8 h-32 w-52 rotate-6 rounded-xl object-cover opacity-[0.14] blur-[1px] [mask-image:linear-gradient(to_left,black,transparent_72%)] transition-opacity group-hover:opacity-25"
              />
            )}

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[1rem] font-semibold tracking-tight text-ink">{group.label}</p>
                  <p className="mt-1 text-[12px] text-muted">{group.hint}</p>
                </div>
                <span className="font-mono text-[1.7rem] leading-none text-line-2 transition-colors group-hover:text-violet">
                  {String(group.items.length).padStart(2, "0")}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
                {group.items.slice(0, 4).map((item) => (
                  <span key={item.slug} className="inline-flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-violet/60" />
                    {item.name}
                  </span>
                ))}
              </div>

              <p className="mt-5 text-[12px] font-medium text-fuchsia opacity-0 transition-opacity group-hover:opacity-100">
                浏览全部 →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export { Hero, LatestFeed };
