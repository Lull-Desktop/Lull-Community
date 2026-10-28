import Link from "next/link";

import AnimatedContent from "@/components/react-bits/AnimatedContent";
import ShinyText from "@/components/react-bits/ShinyText";
import SplitText from "@/components/react-bits/SplitText";
import { buttonVariants } from "@/components/ui/button";
import { panelVariants } from "@/components/ui/panel";
import {
  asset,
  catalog,
  type CatalogItem,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import GlareHover from "./react-bits/GlareHover";


function kindFullLabel(item: CatalogItem): string {
  return item.kind === "scene" ? "壁纸场景" : "桌面工具";
}


export function Hero({ hero }: { hero: CatalogItem; items: CatalogItem[] }) {
    const filters = [
    { href: "/scenes", label: "下载壁纸", count: catalog.counts.scenes },
    { href: "/widgets", label: "下载工具", count: catalog.counts.widgets },
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

      <div className="shell grid items-stretch gap-7 pt-14 pb-20 lg:grid-cols-2">
        {/* 左：文案 + 筛选入口；与右侧卡片各占一半 */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-muted uppercase">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(159,191,150,0.7)]" />
            更新日期
            <span className="font-mono text-[10px] tracking-normal">
              {catalog.generatedAt.slice(5, 10).replace("-", " / ")}
            </span>
          </div>

          <h1 className="mt-6 text-[clamp(2.1rem,3.4vw,3.1rem)] leading-[1.22] font-normal tracking-[-0.02em]">
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

          <p className="mt-5 max-w-[40ch] text-[14.5px] leading-[1.85] text-ink-soft">
            Lull 的第三方壁纸场景与桌面工具。每个作品都是一个可以直接安装的 zip，
            清单、许可与所需能力都写在包里。
          </p>

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
        </div>

        {/* 右：贡献引导卡片，撑满半栏高度 */}
        <GlareHover
          className="h-full"
          width="100%"
          height="100%"
          borderRadius="24px"
          borderColor="var(--color-line-2)"
          background="radial-gradient(90% 120% at 12% 0%, rgba(159,191,150,0.14), transparent 60%), radial-gradient(70% 120% at 95% 100%, rgba(224,168,120,0.12), transparent 60%), var(--color-void-2)"
          glareColor="#c8e0b6"
          glareOpacity={0.18}
          variant="sheen"
          mode="hover"
          transitionDuration={700}
        >
          <div className="flex w-full flex-col justify-center gap-7 px-6 py-10 sm:px-8 lg:px-9 lg:py-12">
            <div>
              <p className="eyebrow">contribute</p>
              <h2 className="mt-3 text-[clamp(1.5rem,2.4vw,1.9rem)] leading-[1.3] font-normal tracking-[-0.01em]">
                做了一张壁纸，或者一个小工具？
              </h2>
              <p className="mt-3 max-w-[44ch] text-[13px] leading-[1.85] text-muted">
                按规范放进一个目录，开一个 PR。合并之后，它会自动出现在这里，
                并且可以被任何人下载安装。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/submit" className={buttonVariants()}>
                开始提交
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href={`${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: "ghost" })}
              >
                贡献指南
              </a>
            </div>
          </div>
        </GlareHover>
      </div>
    </section>
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