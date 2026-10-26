import type { Metadata } from "next";
import type { ReactNode } from "react";

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

const SDKS: {
  tag: string;
  name: string;
  role: string;
  points: { term: string; body: ReactNode }[];
  doc: { href: string; label: string };
}[] = [
  {
    tag: "scene · 壁纸场景",
    name: "@lull/scene-sdk",
    role: "壁纸场景的场景侧 SDK：在不透明源的 iframe 里收宿主下发的参数、几何与相位。只服务声明了 wallpaper.script 的包。",
    points: [
      {
        term: "核心能力",
        body: (
          <>
            一次 <InlineCode>connectLullScene()</InlineCode> 连上宿主，之后订阅帧：显示模式与绘制坐标系、
            视口与画布几何、<InlineCode>dpr</InlineCode>、清单声明的参数、同步相位、窗口显隐。
            参数改完热更，不用重启壁纸。
          </>
        ),
      },
      {
        term: "适用场景",
        body: (
          <>
            Canvas / WebGL 壁纸；多屏动画要按绝对时间对齐相位，用{" "}
            <InlineCode>syncedDelayMs</InlineCode> 算负延迟；要开放强度、颜色、速度这类可调参数。
          </>
        ),
      },
      {
        term: "前提",
        body: (
          <>
            清单里要同时声明 <InlineCode>wallpaper.script</InlineCode>；读参数再加{" "}
            <InlineCode>wallpaper.params</InlineCode>，对齐相位再加{" "}
            <InlineCode>wallpaper.sync</InlineCode>。只靠 CSS 就能画的场景不必引入它。
          </>
        ),
      },
    ],
    doc: { href: "https://lull-desktop.github.io/Lull/docs/scene-sdk/", label: "读 scene-sdk 文档" },
  },
  {
    tag: "widget · 桌面工具",
    name: "@lull/widget-sdk",
    role: "第三方工具窗口的插件侧 SDK。窗口、顶栏、主题令牌、状态持久化都由宿主负责，插件只管自己的 UI 与逻辑，不碰 Tauri IPC。",
    points: [
      {
        term: "核心能力",
        body: (
          <>
            一次 <InlineCode>connectLullWidget()</InlineCode> 打通桥：宿主 KV 存偏好、主题与视口下行、
            能力自检 <InlineCode>has()</InlineCode> 与授权申请、自绘顶栏时的拖动 / 最小化 / 关闭 / 透明切换。
            原生之外还有 <InlineCode>/react</InlineCode> 与 <InlineCode>/vue</InlineCode> 适配。
          </>
        ),
      },
      {
        term: "适用场景",
        body: "常驻小工具：番茄钟、白噪音、待办、快捷面板。关掉再打开要记得上次设置，或者要跟着宿主主题走。",
      },
      {
        term: "前提",
        body: (
          <>
            清单用 <InlineCode>schemaVersion: 2</InlineCode>、<InlineCode>builtin: false</InlineCode>，
            能力只能从白名单里挑；窗口尺寸由宿主决定，插件只能操作自己那一个。
          </>
        ),
      },
    ],
    doc: { href: "https://lull-desktop.github.io/Lull/docs/widget-sdk/", label: "读 widget-sdk 文档" },
  },
];

const EXAMPLES = [
  {
    path: "content/param-demo",
    body: "参数热更的最小样板：glow / tint / pulse 一改就动，适合先跑通「清单 + SDK + 参数」这条链。",
  },
  {
    path: "content/three-scene",
    body: "Three.js / WebGL 场景，速度、粒子数、色调都写在清单里，看脚本场景怎么组织渲染循环。",
  },
  {
    path: "content/demo-fireflies",
    body: "纯静态 HTML/CSS 包，用来对照「不需要 SDK」的写法。",
  },
  {
    path: "widgets/pomodoro-*",
    body: "同一个番茄钟写了 js / react / vue 三版，看适配层与宿主 KV 怎么接。",
  },
];

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-line bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-white/[0.03] p-4 font-mono text-[11.5px] leading-[1.75] text-ink-soft">
      {children}
    </pre>
  );
}

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <header>
        <p className="eyebrow">contribute</p>
        <h1 className="mt-3 text-[clamp(1.8rem,3.6vw,2.4rem)] font-normal tracking-[-0.02em]">
          提交你的<span className="text-aurora">作品</span>
        </h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          作品就是仓库里的一个目录，通过 Pull Request 提交。
          合并之后，网站会在一两分钟内自动更新。
        </p>
      </header>

      <section className="card-glow mt-10 p-6">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">一次提交需要包含</h2>
        <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          {CHECKLIST.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">壁纸场景</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          纯静态包只允许 HTML 与 CSS；需要 JavaScript 时申请{" "}
          <code className="rounded border border-line bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
            wallpaper.script
          </code>
          ，通过{" "}
          <code className="rounded border border-line bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
            @lull/scene-sdk
          </code>{" "}
          读取参数与视口，不要试图访问宿主。
        </p>
        <CodeBlock>{SCENE_STEPS}</CodeBlock>
      </section>

      <section className="mt-10">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">桌面工具</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          静态 Web 包 + 一份 widget.json。能力只能从宿主白名单里选，申请得越少越容易过审：
          不需要联网就别写{" "}
          <code className="rounded border border-line bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
            widget.network
          </code>
          。
        </p>
        <CodeBlock>{WIDGET_STEPS}</CodeBlock>
      </section>

      <section className="mt-10">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">两个 SDK 与官方示例</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          宿主把能给的能力收进两个包里：壁纸场景走{" "}
          <InlineCode>@lull/scene-sdk</InlineCode>，桌面工具走{" "}
          <InlineCode>@lull/widget-sdk</InlineCode>。两者都只做一件事——在沙箱 iframe
          里替你收发 postMessage，所以别去读宿主 DOM，也别直接调 Tauri。
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SDKS.map((sdk) => (
            <article key={sdk.name} className="card-glow flex flex-col p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary">
                {sdk.tag}
              </p>
              <h3 className="mt-2 font-mono text-[13px] leading-snug text-ink">{sdk.name}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{sdk.role}</p>
              <dl className="mt-4 space-y-2.5 text-[12px]">
                {sdk.points.map((row) => (
                  <div key={row.term}>
                    <dt className="font-medium text-ink-soft">{row.term}</dt>
                    <dd className="mt-0.5 leading-relaxed text-muted">{row.body}</dd>
                  </div>
                ))}
              </dl>
              <a
                href={sdk.doc.href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-[12px] font-medium text-accent hover:underline"
              >
                {sdk.doc.label}
                <span aria-hidden="true" className="text-[11px]">
                  ↗
                </span>
              </a>
            </article>
          ))}
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          两个包目前随仓库分发，还没发布到 npm：先跑 <InlineCode>pnpm scenes:sdk</InlineCode> 或{" "}
          <InlineCode>pnpm widgets:sdk</InlineCode> 出 dist，再用路径别名引用。
          清单字段、参数类型、错误码都在上面两份文档里，值得完整读一遍。
        </p>

        <div className="mt-4 rounded-2xl border border-line bg-panel/50 p-6">
          <h3 className="text-[13.5px] font-medium tracking-tight text-ink">先看能跑起来的例子</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            官方仓库的 <InlineCode>examples/</InlineCode> 里放着能直接打包安装的最小工程。
            想改哪个字段，先去示例里改一遍——清单、桥调用、参数声明都是真在跑的写法，
            比对着文档从空白起步快得多。
          </p>
          <dl className="mt-4 space-y-3 text-[12.5px]">
            {EXAMPLES.map((row) => (
              <div key={row.path} className="grid gap-1 sm:grid-cols-[10.5rem_1fr] sm:gap-4">
                <dt className="font-mono text-[11.5px] leading-relaxed text-accent">{row.path}</dt>
                <dd className="leading-relaxed text-muted">{row.body}</dd>
              </div>
            ))}
          </dl>
          <a
            href="https://github.com/Lull-Desktop/Lull/tree/master/examples"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
          >
            在 GitHub 上浏览 examples
            <span aria-hidden="true" className="text-[11px]">
              ↗
            </span>
          </a>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-panel/50 p-6">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">合并标准</h2>
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
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">然后呢</h2>
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
