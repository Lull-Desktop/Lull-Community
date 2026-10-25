import type { Metadata } from "next";

import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "提交作品",
  description: "把壁纸场景或桌面工具提交到 Lull Community：一份清单、一张预览图、一次 Pull Request。",
};

const SCENE_STEPS = `# 1. 生成骨架（slug 用小写字母和连字符）
pnpm new scene aurora-night

# 2. 写内容：包内清单 + 入口 HTML，只用 HTML/CSS
content/scenes/aurora-night/package/catalog.json
content/scenes/aurora-night/package/scenes/aurora-night/index.html

# 3. 放预览图与说明（不会进包）
content/scenes/aurora-night/preview.webp
content/scenes/aurora-night/README.md

# 4. 重算摘要并自检
pnpm content:hash
pnpm content:check
pnpm content:pack        # 产物在 artifacts/，可以直接拖进 Lull 试装`;

const WIDGET_STEPS = `# 1. 生成骨架
pnpm new widget my-tool

# 2. 写界面与清单
content/widgets/my-tool/package/widget.json
content/widgets/my-tool/package/index.html

# 3. 摘要写在旁路锁文件里（widget 与 scene 的算法不同，别手算）
pnpm content:hash
pnpm content:check`;

const CHECKLIST = [
  "package/ —— 能直接装进 Lull 的内容包（结构与官方内容同构）",
  "catalog.json 或 widget.json —— 名称、版本、作者、许可、所需能力",
  "preview.webp —— 16:9 预览图，宽度 1280–1600px，用来做卡片",
  "README.md —— 一段说明：它是什么、怎么实现的、素材从哪来",
  "LICENSE —— 作品自身的许可原文（可以比仓库的 CC BY 4.0 更严格）",
  "item.json —— 标签与收录信息，只影响网站展示",
];

const RULES = [
  {
    term: "能装进 Lull",
    body: "清单通过 Lull 自己的 JSON Schema 与 Rust 侧规则，摘要与安装器一致，zip 不含越界路径。",
  },
  {
    term: "素材有权分发",
    body: "图片、字体、音频的来源写清楚；不接受与社区再分发冲突的条款。",
  },
  {
    term: "不打擦边球",
    body: "不加载远程脚本、不尝试读取宿主数据、不伪造能力声明。",
  },
  {
    term: "说得清用途",
    body: "README 解释实现与参数；工具要写明申请每项能力的理由。",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-void/70 p-4 font-mono text-[11.5px] leading-[1.75] text-[#cfd6f5]">
      {children}
    </pre>
  );
}

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <header>
        <p className="eyebrow">contribute</p>
        <h1 className="mt-3 text-[clamp(1.8rem,3.6vw,2.4rem)] font-semibold tracking-[-0.03em]">
          提交你的<span className="text-aurora">作品</span>
        </h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          没有上传入口，也没有账号系统：作品就是仓库里的一个目录，通过 Pull Request 提交。
          合并之后，网站会在一两分钟内自动更新。
        </p>
      </header>

      <section className="card-glow mt-10 p-6">
        <h2 className="text-[14.5px] font-semibold tracking-tight text-ink">一次提交需要包含</h2>
        <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          {CHECKLIST.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-violet" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[14.5px] font-semibold tracking-tight text-ink">壁纸场景</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          纯静态包只允许 HTML 与 CSS；需要 JavaScript 时申请{" "}
          <code className="rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[11px] text-[#ddd6fe]">
            wallpaper.script
          </code>
          ，通过{" "}
          <code className="rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[11px] text-[#ddd6fe]">
            @lull/scene-sdk
          </code>{" "}
          读取参数与视口，不要试图访问宿主。
        </p>
        <CodeBlock>{SCENE_STEPS}</CodeBlock>
      </section>

      <section className="mt-10">
        <h2 className="text-[14.5px] font-semibold tracking-tight text-ink">桌面工具</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          静态 Web 包 + 一份 widget.json。能力只能从宿主白名单里选，申请得越少越容易过审：
          不需要联网就别写{" "}
          <code className="rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[11px] text-[#ddd6fe]">
            widget.network
          </code>
          。
        </p>
        <CodeBlock>{WIDGET_STEPS}</CodeBlock>
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-panel/50 p-6">
        <h2 className="text-[14.5px] font-semibold tracking-tight text-ink">合并标准</h2>
        <dl className="mt-4 space-y-3 text-[12.5px]">
          {RULES.map((row) => (
            <div key={row.term} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
              <dt className="font-medium text-ink">{row.term}</dt>
              <dd className="leading-relaxed text-muted">{row.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-[14.5px] font-semibold tracking-tight text-ink">然后呢</h2>
        <ol className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <li>1. 开 Pull Request。校验工作流会跑一遍 content:check，失败会直接标红。</li>
          <li>2. 维护者审内容与许可。需要改的会在 PR 里指出，改完自动重跑。</li>
          <li>3. 合并进 main。部署工作流重新生成索引、构建静态站、发布 Pages。</li>
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`${catalog.repo.url}/compare`}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-primary"
          >
            在 GitHub 上开 PR
          </a>
          <a
            href={`${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-ghost"
          >
            完整贡献指南
          </a>
        </div>
      </section>
    </div>
  );
}
