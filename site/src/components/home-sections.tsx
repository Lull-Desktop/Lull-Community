import Link from "next/link";

import AnimatedContent from "@/components/react-bits/AnimatedContent";
import ShinyText from "@/components/react-bits/ShinyText";
import SplitText from "@/components/react-bits/SplitText";
import { buttonVariants } from "@/components/ui/button";
import { panelVariants } from "@/components/ui/panel";
import {
  asset,
  catalog,
  formatBytes,
  itemHref,
  kindLabel,
  type CatalogItem,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

/* ── 英雄区 ───────────────────────────────────────────── */

const FEATURES = [
  {
    title: "ZIP 直装",
    body: "下载即安装，清单写明版本、许可与所需能力",
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
    title: "内容即仓库",
    body: "PR 合并后自动校验、打包、发布",
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

function kindFullLabel(item: CatalogItem): string {
  return item.kind === "scene" ? "壁纸场景" : "桌面工具";
}

/**
 * 三栏英雄区：左文案 / 中主预览（含作品缩略图条） / 右侧信息栏。
 * 参考稿是"舞台 + 侧栏实时信息"的视觉社区结构，这里把原来压在
 * 网格右侧的「最近收录」面板提上来，右侧信息栏与主图等高。
 *
 * 标题交给 React Bits 的 SplitText：按词/字拆开后逐段上升淡入，
 * 加载即播放（首屏不该等滚动）。
 */
export function Hero({ hero, items }: { hero: CatalogItem; items: CatalogItem[] }) {
  const filmstrip = items.slice(0, 4);
  const stats = [
    { label: "壁纸场景", value: catalog.counts.scenes },
    { label: "桌面工具", value: catalog.counts.widgets },
    { label: "数据库", value: 0 },
  ];

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-10">
        <img
          src={asset(hero.preview)}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[center_55%] opacity-[0.16]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_14%_-8%,rgba(159,191,150,0.34),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(52%_48%_at_88%_2%,rgba(224,168,120,0.18),transparent_66%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-void via-void/85 to-transparent" />
        <div className="grid-lines absolute inset-0 opacity-40" />
      </div>

      <div className="shell grid items-stretch gap-7 pt-14 pb-20 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[396px_minmax(0,1fr)_340px]">
        {/* 左：文案 + 能力点 + 统计（统计贴到栏底，和右侧信息栏齐平） */}
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line-2/80 bg-panel/70 py-1.5 pr-3 pl-2.5 text-[11.5px] text-ink-soft">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(159,191,150,0.7)]" />
            社区作品持续收录中
            <span className="font-mono text-[10px] text-muted">
              {catalog.generatedAt.slice(5, 10).replace("-", " / ")}
            </span>
          </span>

          <h1 className="text-[clamp(2.1rem,3.4vw,3.1rem)] leading-[1.22] font-normal tracking-[-0.02em]">
            <span className="block">
              <SplitText
                text="为安静的桌面，"
                tag="span"
                splitType="words"
                effect="rise"
                textAlign="left"
                delay={0.1}
                duration={0.75}
                trigger="load"
              />
            </span>
            <span className="block">
              添一点
              {/* 重点短语用 ShinyText：底色苔绿、一道极光蓝反光缓慢扫过。
                  这里不能给 SplitText 套 `text-gradient`——拆字后的每个 char
                  都有自己的层，父级的 background-clip:text 剪不到它们。 */}
              <ShinyText
                text="会动的东西"
                color="#c8e0b6"
                shineColor="#8fc0d2"
                speed={4}
                shineWidth={45}
                trigger="view"
                yoyo
              />
            </span>
          </h1>

          <p className="max-w-[372px] text-[14.5px] leading-[1.85] text-ink-soft">
            Lull 的第三方壁纸场景与桌面工具。每个作品都是一个可以直接安装的 zip，
            清单、许可与所需能力都写在包里。
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="https://lull-desktop.github.io/Lull/download/"
              className={buttonVariants({ size: "lg" })}
            >
              下载Lull-App
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/submit"
              className="text-[12.5px] text-primary transition-colors hover:text-accent"
            >
              分享作品
            </Link>
          </div>

          <ul className="mt-1 flex flex-col gap-2.5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-center gap-3">
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-line ring-inset">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {feature.icon}
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-ink">{feature.title}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                    {feature.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-auto flex items-stretch border-t border-line pt-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn("flex-1", index > 0 && "border-l border-line pl-5")}
              >
                <dd className="font-mono text-[22px] leading-none text-ink">
                  {String(stat.value).padStart(2, "0")}
                </dd>
                <dt className="mt-1.5 text-[10.5px] text-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* 中：主预览 + 缩略图条 */}
        <div className="flex flex-col gap-3.5">
          <Link
            href={itemHref(hero)}
            className={cn(panelVariants({ variant: "stage" }), "group relative block")}
          >
            <img
              src={asset(hero.preview)}
              alt={`${hero.name} 的预览图`}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void/95 via-void/20 to-transparent" />

            <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between">
              <span className="rounded-full bg-void/70 px-2.5 py-1 text-[11px] text-ink ring-1 ring-white/15 backdrop-blur-md">
                {kindFullLabel(hero)}
              </span>
              <span className="rounded-full bg-void/70 px-2.5 py-1 font-mono text-[10px] text-ink ring-1 ring-white/15 backdrop-blur-md">
                v{hero.version}
              </span>
            </div>

            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[19px] font-medium tracking-tight text-white">{hero.name}</p>
                <p className="mt-1 truncate font-mono text-[10.5px] text-ink-soft">
                  {hero.author} · {hero.license} · {formatBytes(hero.downloadBytes)}
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          <div>
            <div className="flex items-center justify-between pb-2 text-[11px] text-muted">
              <span>同一桌面上的其它作品</span>
              <span className="font-mono text-[9.5px]">
                {String(items.length).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {filmstrip.map((item, index) => (
                <Link
                  key={`${item.kind}-${item.slug}`}
                  href={itemHref(item)}
                  aria-label={item.name}
                  className={cn(
                    "overflow-hidden rounded-lg ring-1 transition-colors",
                    index === 0 ? "ring-primary/80" : "ring-line hover:ring-primary/60",
                  )}
                >
                  <img
                    src={asset(item.preview)}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* 贴到栏底，和左侧统计、右侧信息栏形成同一条基线 */}
          <p className="mt-auto pt-1 font-mono text-[10px] leading-relaxed text-muted/75">
            下载 zip · 设置 → 扩展 → 从文件安装
          </p>
        </div>

        {/* 右：信息栏 */}
        <aside className="flex flex-col gap-3.5 lg:col-span-2 xl:col-span-1">
          <LatestFeed items={items.slice(0, 4)} />
          <PackageSpecCard />
        </aside>
      </div>
    </section>
  );
}

/* ── 右栏：最近收录 ────────────────────────────────────── */

export function LatestFeed({ items }: { items: CatalogItem[] }) {
  return (
    <div className={cn(panelVariants({ variant: "rail" }), "overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[12.5px] font-medium text-ink">最近收录</p>
        <Link href="/scenes" className="text-[11px] text-primary transition-colors hover:text-accent">
          全部 →
        </Link>
      </div>
      <ul>
        {items.map((item) => (
          <li key={`${item.kind}-${item.slug}`}>
            <Link
              href={itemHref(item)}
              className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
            >
              <img
                src={asset(item.preview)}
                alt=""
                width={46}
                height={32}
                className="h-8 w-[46px] shrink-0 rounded-md object-cover ring-1 ring-white/10"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-ink">{item.name}</span>
                <span className="mt-0.5 block truncate text-[10.5px] text-muted">
                  {item.author} · {item.tags[0] ?? kindLabel(item.kind)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[9.5px] text-muted">
                {item.addedAt.slice(5).replace("-", ".")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 右栏：打包规范（数值与 scripts/validate-content.mjs 的 LIMITS 一致）─ */

const SPECS = [
  { label: "整包上限", value: "64 MiB" },
  { label: "单文件上限", value: "8 MiB" },
  { label: "文件数", value: "512" },
  { label: "预览图", value: "≤ 3 MiB" },
];

function PackageSpecCard() {
  return (
    <div className={cn(panelVariants({ variant: "rail" }), "px-4 py-4")}>
      <p className="text-[12.5px] font-medium text-ink">打包规范</p>
      <dl className="mt-3 flex flex-col gap-2.5">
        {SPECS.map((spec, index) => (
          <div key={spec.label} className="flex items-center justify-between">
            <dt className="text-[11px] text-muted">{spec.label}</dt>
            <dd
              className={cn(
                "font-mono text-[10px]",
                index === SPECS.length - 1 ? "text-primary" : "text-ink-soft",
              )}
            >
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
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
    <section className="shell">
      <div className="grid gap-12 lg:grid-cols-[392px_minmax(0,1fr)]">
        <div>
          <p className="eyebrow">how it works</p>
          <div className="mt-3">
            <SplitText
              text="自动化社区作品管理"
              tag="h2"
              className="text-[clamp(1.6rem,2.4vw,2rem)] leading-[1.3] font-normal tracking-[-0.01em]"
              splitType="chars"
              effect="rise"
              textAlign="left"
              duration={0.6}
            />
          </div>
          <p className="mt-4 max-w-sm text-[12.5px] leading-[1.85] text-muted">
            完全开发式管理，开发者提交作品，维护者审合并。
          </p>
          <Link
            href="/submit"
            className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline"
          >
            看提交要求
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ol className="flex flex-col gap-2.5">
          {STEPS.map((step, index) => (
            // 滚动到视口时依次上浮；React Bits 的 AnimatedContent 负责这一层
            <li key={step.index}>
              <AnimatedContent
                distance={40}
                duration={0.6}
                delay={index * 0.08}
                threshold={0.15}
                className="group flex gap-4 rounded-2xl border border-line bg-white/[0.02] px-5 py-4 transition-colors hover:border-line-2"
              >
                <span className="font-mono text-[11px] leading-5 text-primary/80 transition-colors group-hover:text-primary">
                  {step.index}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium tracking-tight text-ink">{step.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
                  <code className="mt-2.5 inline-block rounded-md border border-line bg-primary/10 px-2 py-1 font-mono text-[10.5px] text-accent">
                    {step.code}
                  </code>
                </div>
              </AnimatedContent>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── 分区入口（紧凑双列条）────────────────────────────── */

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
    <section className="shell">
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Link
            key={group.href}
            href={group.href}
            className={cn(
              panelVariants({ variant: "rail" }),
              "group flex items-center justify-between gap-6 px-5 py-4 transition-colors hover:border-line-2",
            )}
          >
            <div className="min-w-0">
              <p className="text-[14px] font-medium tracking-tight text-ink">{group.label}</p>
              <p className="mt-1 truncate text-[11.5px] text-muted">
                {group.hint} · {group.items.map((item) => item.name).join(" / ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[20px] leading-none text-faint transition-colors group-hover:text-primary">
                {String(group.items.length).padStart(2, "0")}
              </span>
              <span className="text-[11.5px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                进入 →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
