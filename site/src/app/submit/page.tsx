import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { panelVariants } from "@/components/ui/panel";
import { catalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "提交作品",
  description: "把壁纸场景或桌面工具提交到 Lull Community：一份清单、一张预览图、一张 issue 表单，无需 fork。",
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
  "item.json —— 必交的展示元数据：schemaVersion、slug（= 目录名）、tags、addedAt、preview；可选 meta 决定筛选标签",
];

const ITEM_JSON_EXAMPLE = `{
  "schemaVersion": 1,
  "slug": "aurora-night",
  "tags": ["极光", "极简"],
  "featured": false,
  "addedAt": "2026-10-28",
  "preview": "preview.webp"
}`;

type FieldSpec = { field: string; value: string; note: string };

/** item.json 本体字段：必填在前，维护侧覆盖与可选字段在后。 */
const ITEM_JSON_FIELDS: FieldSpec[] = [
  { field: "schemaVersion", value: "1", note: "固定值" },
  { field: "slug", value: "aurora-night", note: "必须与目录名一致；插件目录名就是 id" },
  { field: "tags", value: "字符串数组", note: "≤ 8 项，每项 ≤ 16 字" },
  { field: "addedAt", value: "YYYY-MM-DD", note: "合并时覆盖为首次收录日，照填即可" },
  { field: "preview", value: "preview.webp", note: "目录内的 16:9 图片文件名" },
  { field: "screenshots", value: "字符串数组（可选）", note: "≤ 6 张，列出的文件必须存在" },
  { field: "featured", value: "true / false（可选）", note: "合并时统一置 false，精选由维护者决定" },
  { field: "authorUrl / homepage", value: "https://…（可选）", note: "作者主页、作品主页" },
  { field: "note", value: "字符串（可选）", note: "维护者备注，不公开" },
];

/** meta 分三组；每组第一列是字段名，第二列是可取值。 */
const META_GROUPS: { group: string; hint: string; fields: FieldSpec[] }[] = [
  {
    group: "公共字段",
    hint: "壁纸与组件共用；可由清单推导的通常不用手写。",
    fields: [
      {
        field: "renderType",
        value: "web / 2d / 3d / video / hybrid / unknown",
        note: "主要渲染形态，单选",
      },
      {
        field: "renderTech",
        value: "css / svg / canvas2d / webgl / webgpu / video",
        note: "实际用到的技术，多选",
      },
      {
        field: "recommendedUse",
        value: "office / laptop / multiMonitor / highQuality",
        note: "使用场景，多选",
      },
      {
        field: "platforms",
        value: "windows / macos / linux",
        note: "壁纸从清单继承；组件需自己声明",
      },
      {
        field: "performanceTier / performanceEvidence",
        value: "low / medium / high / unverified",
        note: "一般由清单推导并标注 manifest-declared",
      },
      {
        field: "hardwareLevel / powerProfile",
        value: "basic / accelerated / advanced；efficient / balanced / quality",
        note: "缺省 unknown",
      },
      {
        field: "networkPolicy",
        value: "none / optional / required / unknown",
        note: "required 只能由作者声明，不会因联网能力自动产生",
      },
      {
        field: "backgroundPolicy",
        value: "pause / throttle / continue / unknown",
        note: "资源支持/建议的后台策略；宿主实际策略另算",
      },
      {
        field: "requiredPermissions / optionalPermissions",
        value: "network / filesystem / media / notifications",
        note: "通常由 capability 推导",
      },
      {
        field: "supportsPause / supportsReducedMotion",
        value: "true / false（缺省 null）",
        note: "null 表示未声明",
      },
    ],
  },
  {
    group: "壁纸字段",
    hint: "只对 scene 生效；写在组件的 item.json 里会被忽略。",
    fields: [
      {
        field: "sceneType",
        value: "ambient / nature / abstract / scene / interactive / other / unknown",
        note: "内容分类，不是性能分类",
      },
      { field: "visualStyle", value: "minimal / cinematic / anime / realistic / generative", note: "多选" },
      { field: "animationMode", value: "static / loop / realtime / interactive / unknown", note: "单选" },
      { field: "qualityProfiles", value: "low / medium / high / ultra", note: "多选" },
      { field: "resolutionProfiles", value: "1080p / 1440p / 4k / custom", note: "多选" },
      { field: "multiMonitorModes", value: "mirror / independent / span", note: "多选" },
      { field: "supportsSync 等能力", value: "true / false（缺省 null）", note: "sync 可从 wallpaper.sync 推导" },
    ],
  },
  {
    group: "组件字段",
    hint: "只对 widget 生效；写在壁纸的 item.json 里会被忽略。",
    fields: [
      {
        field: "widgetType",
        value: "clock / music / monitor / utility / visual / other / unknown",
        note: "功能分类，单选",
      },
      { field: "subcategories", value: "字符串数组", note: "受控标签，多选" },
      { field: "interactionLevel", value: "static / interactive / continuous / unknown", note: "单选" },
      { field: "updatePolicy", value: "onDemand / interval / animation / unknown", note: "单选" },
      {
        field: "defaultSize / minSize / resizable",
        value: "{ width, height }；true / false",
        note: "通常从 widget.json 的 window 推导",
      },
      {
        field: "supportsTransparency",
        value: "true / false（缺省 null）",
        note: "可从 window.transparent 推导",
      },
      {
        field: "supportsDrag / multiInstance / alwaysOnTop / supportsClickThrough",
        value: "true / false（缺省 null）",
        note: "只能自己声明；null 不算「不支持」",
      },
    ],
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
    tag: "widget · 桌面组件",
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

const COMMIT_TYPES = [
  { type: "feat", use: "新增作品，或站点新增能力" },
  { type: "content", use: "更新已有作品：清单、参数、素材" },
  { type: "fix", use: "修内容或站点的错误" },
  { type: "docs", use: "文档、注释、README" },
  { type: "style", use: "只动样式，不改行为" },
  { type: "refactor", use: "重构，对外行为不变" },
  { type: "perf", use: "性能" },
  { type: "test", use: "测试与校验脚本" },
  { type: "build", use: "依赖、打包、产物" },
  { type: "ci", use: "工作流与钩子" },
  { type: "chore", use: "其他杂务" },
  { type: "revert", use: "回滚" },
];

const COMMIT_SCOPES = ["scene", "widget", "content", "site", "ci", "deps", "docs", "repo"];

const COMMIT_EXAMPLES = `feat(scene): 新增「雾岚」静态场景
content(widget): 呼吸节奏 1.1.0，呼气延长到 6 秒
fix(site): 详情页长标题在窄屏溢出
ci: PR 标题加提交信息校验
feat(scene)!: 参数 key 改名，旧配置不再兼容`;

const BRANCH_RULES = [
  {
    term: "分支命名",
    body: "feat/<slug>、fix/<slug>、content/<scene|widget>-<slug>、docs/<topic>、chore/<topic>。从最新 main 拉出，活不过三天。",
  },
  {
    term: "PR 粒度",
    body: "一个 PR 只做一件事：一个作品、一次修，或一组同源重构。顺手改了别的目录，review 会先让你拆。",
  },
  {
    term: "合并方式",
    body: "只允许 squash。merge commit 与 rebase 合并在设置里关掉，main 始终是一条直线，回滚就是 revert 一个提交。",
  },
  {
    term: "提交信息",
    body: "squash 用 PR 标题当提交信息，所以标题就是正文。分支里的中间提交不校验，写「wip」也行，反正会被压掉。",
  },
  {
    term: "清理与发布",
    body: "合并后自动删源分支。main 一动就触发部署，没有 release 分支，也没有手工发布这一步。",
  },
];

const CHECKS = [
  {
    term: "Validate content",
    body: "每个 PR 都跑：content:check → 单测 → 生成索引 → 验签 → 站点构建（含类型检查）。不按路径过滤，否则只改文档的 PR 会一直等这个不会触发的检查。通过后把 zip 传成 7 天有效的 lull-packages 产物，reviewer 直接下载试装。",
  },
  {
    term: "submission-check",
    body: "表单类 issue 建/改/重开时跑：解析字段 → 取回你仓库的提交 → 按 main 上的规则校验 → 回帖。作业无 secrets，只读你的仓库，不执行任何内容。",
  },
  {
    term: "表单即协议",
    body: "字段名就是校验依据，字段与清单交叉核对（许可证、能力说明、id、slug）。改字段等于改协议，会升版本号。",
  },
  {
    term: "合并（/merge）",
    body: "维护者审查后评论 `/merge <commit>`。合并只绑你指定的那个提交；之后改 tag 不影响已合并内容。",
  },
  {
    term: "发布签名",
    body: "发布批次由 community 用离线 Ed25519 私钥对 release.json 签名，公钥与签名都在站上。它只标注「这批文件由 community 发布」，不授予权限、不放宽限制、不改变安装与运行条件。",
  },
  {
    term: "Commit messages",
    body: "每个 PR 校验标题是否符合 type(scope): subject——type 与 scope 都在白名单里，subject 4–72 字、不以句号结尾。只校验标题，不管分支里的中间提交。",
  },
  {
    term: "Deploy site",
    body: "合并进 main 后重跑同一套校验，再构建并发布 Pages。发布不并发：正在部署时不会取消，避免站点停在半成品。",
  },
  {
    term: "本地钩子（可选）",
    body: "仓库里的 .githooks/commit-msg 调同一个脚本。git config core.hooksPath .githooks 挂上，提交时就能拦住；不装也不会漏，PR 那关照样拦。",
  },
];

const GATES_HARD: ReactNode[] = [
  <>
    两个必需检查都为绿：<InlineCode>Validate content / content + site</InlineCode> 与{" "}
    <InlineCode>Commit messages / 提交信息</InlineCode>。
  </>,
  "至少一位维护者 approve，且所有对话已标记解决。",
  "分支已与 main 同步（Require branches to be up to date）。",
  "更新已有作品：版本号递增、id 与 slug 不变，摘要已重算并出现在 diff 里。",
  "体积在限内：512 个文件、单文件 8 MiB、整包 64 MiB；preview.webp 不超过 3 MiB。",
  "能力最小化，每项在 PR 模板里写了理由；不加载远程脚本、不伪造能力声明。",
  "素材来源与许可写清楚，目录内 LICENSE 与清单 license 字段一致。",
];

const GATES_SOFT = [
  "README 太短、预览图偏糊——可以先合，之后单独开 PR 补。",
  "标签、精选位没填——只影响展示，不影响安装。",
  "提交粒度偏大——建议拆，但不拦；拆不动就在正文写清楚。",
];

const SPEC_HISTORY = [
  {
    version: "v1.1",
    date: "2026-10-28",
    change:
      "新增免 fork 提交：壁纸/插件的 issue 表单、submission-check 与登记表；新增 community 发布签名（只做来源标记，不改变准入）。",
    files:
      "scene-submission.yml · widget-submission.yml · submission-check.yml · submission-import.yml · sign-release.mjs · verify-release.mjs",
  },
  {
    version: "v1.0",
    date: "2026-10-26",
    change: "首次成文：提交信息、分支与合并、自动校验、合并门槛。",
    files: "validate.yml · commit.yml · deploy.yml",
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

/** 字段表：item.json 本体与 meta 共用。窄屏可横向滚动，不挤压正文。 */
function FieldTable({ rows }: { rows: FieldSpec[] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] border-collapse text-[12px]">
        <thead>
          <tr className="bg-white/[0.04] text-left text-[10.5px] uppercase tracking-[0.12em] text-muted">
            <th className="px-3.5 py-2 font-medium">字段</th>
            <th className="px-3.5 py-2 font-medium">取值</th>
            <th className="px-3.5 py-2 font-medium">说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-t border-line">
              <td className="px-3.5 py-2.5 font-mono text-[11px] text-accent">{row.field}</td>
              <td className="px-3.5 py-2.5 font-mono text-[11px] text-ink-soft">{row.value}</td>
              <td className="px-3.5 py-2.5 leading-relaxed text-muted">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 四个 issue 表单的模板文件名。改名前先看 `.github/ISSUE_TEMPLATE/` 里的实际文件。 */
const ISSUE_TEMPLATES = {
  sceneSubmit: "scene-submission.yml",
  widgetSubmit: "widget-submission.yml",
  sceneUpdate: "scene-update.yml",
  widgetUpdate: "widget-update.yml",
} as const;

/** 直接打开某个模板的新建 issue 页（GitHub 会按模板渲染表单）。 */
const issueUrl = (template: string) => `${catalog.repo.url}/issues/new?template=${template}`;

/** 页面目录：侧边大纲与移动端折叠导航共用。顺序与页面章节一致。 */
const OUTLINE: { id: string; label: string }[] = [
  { id: "checklist", label: "前期准备" },
  { id: "scene", label: "壁纸场景" },
  { id: "widget", label: "桌面组件" },
  { id: "sdk", label: "SDK 与官方示例" },
  { id: "item-json", label: "item.json文档" },
  { id: "issues", label: "免 fork 提交" },
  { id: "spec", label: "提交规范" },
  { id: "next", label: "提交作品" },
];

function SectionOutline({ className }: { className?: string }) {
  return (
    <nav aria-label="页面目录" className={className}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">outline</p>
      <ol className="mt-3 space-y-1.5 border-l border-line pl-3">
        {OUTLINE.map((entry, index) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="group flex items-baseline gap-2 text-[12px] leading-relaxed text-muted transition-colors hover:text-ink"
            >
              <span className="font-mono text-[10px] text-line-2 transition-colors group-hover:text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{entry.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function SubmitPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-14 sm:px-8 xl:px-12">
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-12">
        <div className="mx-auto w-full max-w-3xl xl:mx-0">
          <details className="mb-6 rounded-xl border border-line bg-panel/40 px-4 py-3 xl:hidden">
            <summary className="cursor-pointer text-[12.5px] text-ink">章节导航</summary>
            <SectionOutline className="mt-3" />
          </details>

          <header>
        <p className="eyebrow">contribute</p>
        <h1 className="mt-3 text-[clamp(1.8rem,3.6vw,2.4rem)] font-normal tracking-[-0.02em]">
          提交你的<span className="text-gradient">作品</span>
        </h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          点击下方提交按钮，根据 issue 表单操作提交（无需 fork），管理员会审核并合并更新。
        </p>
 
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={issueUrl(ISSUE_TEMPLATES.sceneSubmit)}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ size: "lg" })}
          >
            提交壁纸
            <span aria-hidden="true" className="text-[11px]">
              ↗
            </span>
          </a>
          <a
            href={issueUrl(ISSUE_TEMPLATES.widgetSubmit)}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ size: "lg" })}
          >
            提交插件
            <span aria-hidden="true" className="text-[11px]">
              ↗
            </span>
          </a>
                 <p>
          如何使用SDK开发组件？查看{" "}
          <a
            href="https://lull-desktop.github.io/Lull/docs/scene-sdk/"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold underline underline-offset-2 transition-colors hover:text-accent"
          >
            Scene SDK
          </a>和 
           <a
            href="https://lull-desktop.github.io/Lull/docs/widget-sdk/"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold underline underline-offset-2 transition-colors hover:text-accent"
          >
            Widget SDK
          </a>
          。
        </p>
        </div>
      </header>

      <section id="checklist" className={cn(panelVariants(), "mt-10 scroll-mt-24 p-6")}>
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">前期准备</h2>
        <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          {CHECKLIST.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[12px] leading-relaxed text-muted">
          <InlineCode>item.json</InlineCode> 不进包，但缺了它格式检查会直接报错。最小示例：
        </p>
        <CodeBlock>{ITEM_JSON_EXAMPLE}</CodeBlock>
        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          可选 <InlineCode>meta</InlineCode> 决定目录页能筛到它的哪些维度：壁纸写{' '}
          <InlineCode>sceneType</InlineCode> / <InlineCode>visualStyle</InlineCode> /{' '}
          <InlineCode>animationMode</InlineCode> / <InlineCode>multiMonitorModes</InlineCode>，组件写{' '}
          <InlineCode>widgetType</InlineCode> / <InlineCode>interactionLevel</InlineCode> /{' '}
          <InlineCode>updatePolicy</InlineCode> / 窗口能力，公共字段是{' '}
          <InlineCode>renderType</InlineCode> / <InlineCode>renderTech</InlineCode> /{' '}
          <InlineCode>recommendedUse</InlineCode> / <InlineCode>platforms</InlineCode>。能从清单推导的
          （性能等级、帧率、平台、窗口尺寸、是否透明）不用写；没写就是「未声明」，不会被当成「不支持」。
          枚举取值以 <InlineCode>schemas/community-item.schema.json</InlineCode> 为准。
          完整字段表见{" "}
          <a href="#item-json" className="text-accent transition-opacity hover:opacity-80">
            item.json 字段
          </a>
          。
        </p>
      </section>

      <section id="scene" className="mt-10 scroll-mt-24">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">壁纸场景</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          纯静态包只允许 HTML 与 CSS；需要 JavaScript 时申请 <InlineCode>wallpaper.script</InlineCode>
          ，通过 <InlineCode>@lull/scene-sdk</InlineCode> 读取参数与视口，不要试图访问宿主。
        </p>
        <CodeBlock>{SCENE_STEPS}</CodeBlock>
      </section>

      <section id="widget" className="mt-10 scroll-mt-24">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">桌面组件</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          静态 Web 包 + 一份 widget.json。能力只能从宿主白名单里选，申请得越少越容易过审：
          不需要联网就别写 <InlineCode>widget.network</InlineCode>。
        </p>
        <CodeBlock>{WIDGET_STEPS}</CodeBlock>
      </section>

      <section id="sdk" className="mt-10 scroll-mt-24">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">SDK 与官方示例</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          宿主把能给的能力收进两个包里：壁纸场景走{" "}
          <InlineCode>@lull/scene-sdk</InlineCode>，桌面工具走{" "}
          <InlineCode>@lull/widget-sdk</InlineCode>。两者都只做一件事——在沙箱 iframe
          里替你收发 postMessage，所以别去读宿主 DOM，也别直接调 Tauri。
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SDKS.map((sdk) => (
            <article key={sdk.name} className={cn(panelVariants(), "flex flex-col p-5")}>
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

      <section id="item-json" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[14.5px] font-medium tracking-tight text-ink">item.json 文档</h2>
          <p className="font-mono text-[10px] tracking-[0.18em] text-faint">website only</p>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          只在站点展示用：不进包、不影响摘要与签名，Lull 也不会读取。缺了它
          <InlineCode>pnpm content:check</InlineCode> 直接报错；<InlineCode>meta</InlineCode>
          全部可选，没写就是「未声明」。
        </p>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">① 本体字段</h3>
        <FieldTable rows={ITEM_JSON_FIELDS} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
          <InlineCode>addedAt</InlineCode> 与 <InlineCode>featured</InlineCode> 由合并流程覆盖，
          其余字段保持作者写的样子。
        </p>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">② meta（可选）</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          决定作品在目录页能被哪些筛选命中。两条规则：能从包内清单确认的（性能等级、目标帧率、
          平台、窗口尺寸、是否透明、<InlineCode>wallpaper.sync</InlineCode>）不用写；只能由作者判断的
          （渲染类型/技术、内容分类、交互与更新策略、窗口能力、<InlineCode>networkPolicy</InlineCode>）
          必须手写。
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          未声明的能力是 <InlineCode>null</InlineCode>：筛选「不支持」时不会命中它，
          「未声明」不等于「不支持」。
        </p>

        <div className="mt-4 space-y-5">
          {META_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-[12.5px] font-medium text-ink">{group.group}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{group.hint}</p>
              <FieldTable rows={group.fields} />
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
          以上是站点侧扩展，不属于 Lull 内容包格式；枚举的单一事实来源是
          <InlineCode>schemas/community-item.schema.json</InlineCode>。
        </p>
      </section>

      <section id="issues" className="mt-10 scroll-mt-24 rounded-2xl border border-line bg-panel/50 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[14.5px] font-medium tracking-tight text-ink">免 fork 提交</h2>
          <p className="font-mono text-[10px] tracking-[0.18em] text-faint">issue form</p>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          内容放在你自己的公开仓库里，用一张表单告诉我们「仓库 + tag + 目录」。
          CI 会把那个提交取回来检查格式，维护者审查后合并，站点与下载包随之更新。
        </p>

        <ol className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-line-2">01</span>
            <span>
              在自己的仓库里放一个作品目录，<span className="text-ink-soft">路径与结构都和本站一致</span>：{" "}
              <InlineCode>content/&lt;scenes|widgets&gt;/&lt;slug&gt;/</InlineCode>，里面放{" "}
              <InlineCode>package/</InlineCode>、<InlineCode>item.json</InlineCode>、
              <InlineCode>preview.webp</InlineCode>、<InlineCode>README.md</InlineCode>、<InlineCode>LICENSE</InlineCode>。
              打一个 tag。
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-line-2">02</span>
            <span>
              开「壁纸提交」或「插件提交」issue，填表（「作品目录」一栏照抄上面那个路径），
              并把一张运行截图拖进截图框（外链不算，截图只留在 issue 里，不会进仓库）。
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-line-2">03</span>
            <span>
              CI 回帖告诉你差什么。改完直接<span className="text-ink-soft">编辑原 issue</span>，会自动重新检查；同一个作品只保留一条提交 issue。
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-line-2">04</span>
            <span>
              审查通过后维护者合并。以后发新版本用「壁纸更新 / 插件更新」，仓库地址与目录以首次收录为准。
            </span>
          </li>
        </ol>

        <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
          摘要（<InlineCode>integrity</InlineCode> / <InlineCode>.lull-integrity.json</InlineCode>）不用你算，
          合并时由 CI 重算。格式检查失败且 14 天没有回应的 issue 会被自动关闭。
        </p>

        <div className="mt-4 rounded-xl border border-line bg-void/40 p-4">
          <p className="text-[12px] font-medium text-ink">关于「发布签名」</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            收录后的版本会由 compound 用离线密钥签一份发布清单，站点上显示「已签署发布」。
            它只说明<span className="text-ink-soft">这批文件由 compound 发布</span>，不证明作者身份，
            也不授予任何权限：验签不改变安装与运行的条件。细则见{" "}
            <a
              href={`${catalog.repo.url}/blob/${catalog.repo.branch}/SECURITY.md`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              SECURITY.md
            </a>
            。
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-faint">更新已收录的作品：</span>
          {[
            { label: "壁纸更新", template: ISSUE_TEMPLATES.sceneUpdate },
            { label: "插件更新", template: ISSUE_TEMPLATES.widgetUpdate },
          ].map((entry) => (
            <a
              key={entry.template}
              href={issueUrl(entry.template)}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {entry.label}
            </a>
          ))}
        </div>
      </section>

      <section id="spec" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[14.5px] font-medium tracking-tight text-ink">提交规范</h2>
          <p className="font-mono text-[10px] tracking-[0.18em] text-faint">v1.1 · 2026-10-28</p>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          从写第一行提交信息到按下合并，四层：提交信息 → 分支与合并 → 自动校验 → 合并门槛。
          前三层有 Actions 与钩子兜底，最后一层是人的判断。规则改了要升版本号，旧 PR 不追溯。
        </p>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">① 提交信息</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          格式 <InlineCode>type(scope): subject</InlineCode>，冒号后一个半角空格；subject
          4–72 字，不以句号结尾，细节放正文。scope 可省略，省略时连括号一起省。破坏性变更在
          type 后加 <InlineCode>!</InlineCode>，或在正文单起一段写{" "}
          <InlineCode>BREAKING CHANGE</InlineCode>。        </p>
        <CodeBlock>{COMMIT_EXAMPLES}</CodeBlock>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
          {COMMIT_TYPES.map((row) => (
            <div key={row.type} className="grid grid-cols-[4.5rem_1fr] gap-2">
              <dt className="font-mono text-[11px] leading-relaxed text-accent">{row.type}</dt>
              <dd className="leading-relaxed text-muted">{row.use}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
          scope 只写模块：<span className="font-mono">{COMMIT_SCOPES.join(" / ")}</span>
          。白名单外的一律报错——多一个自造 scope，就等于多一种没人认识的分类。
        </p>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">② 分支与合并</h3>
        <dl className="mt-2 space-y-2.5 text-[12.5px]">
          {BRANCH_RULES.map((row) => (
            <div key={row.term} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
              <dt className="font-medium text-ink">{row.term}</dt>
              <dd className="leading-relaxed text-muted">{row.body}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">③ 自动校验</h3>
        <dl className="mt-2 space-y-2.5 text-[12.5px]">
          {CHECKS.map((row) => (
            <div key={row.term} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="font-mono text-[11.5px] leading-relaxed text-accent">{row.term}</dt>
              <dd className="leading-relaxed text-muted">{row.body}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">④ 合并门槛</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          左边缺一不可，右边只记账不拦。硬性里的 approve、同步与「只允许 squash」是仓库
          Settings → Branches 的开关，代码里看不到，所以写在这一页；改设置时记得同步改这里。
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_1fr]">
          <div className="rounded-xl border border-line-2 bg-panel/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              hard · 缺一不可
            </p>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
              {GATES_HARD.map((item, index) => (
                <li key={index} className="flex gap-2.5">
                  <span className="mt-[0.62em] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              soft · 只记账
            </p>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
              {GATES_SOFT.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-[0.62em] h-1 w-1 shrink-0 rounded-full bg-faint" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <h3 className="mt-6 text-[13px] font-medium tracking-tight text-ink">规范版本</h3>
        <dl className="mt-2 space-y-2 text-[12px]">
          {SPEC_HISTORY.map((row) => (
            <div key={row.version} className="grid gap-1 sm:grid-cols-[6rem_6.5rem_1fr] sm:gap-4">
              <dt className="font-mono text-[11.5px] leading-relaxed text-accent">{row.version}</dt>
              <dd className="font-mono text-[11px] leading-relaxed text-faint">{row.date}</dd>
              <dd className="leading-relaxed text-muted">
                {row.change}
                <span className="mt-0.5 block font-mono text-[10.5px] text-faint">{row.files}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
          改规范：先改工作流与本页，再在「规范版本」里加一行。凡是写成硬性条件的，都要能在工作流或仓库设置里落地——落不了地的，就不该写进规范。
        </p>
      </section>

      <section id="next" className="mt-10 scroll-mt-24">
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">提交作品</h2>
        <ol className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <li>
            1. 填 issue 表单（无需 fork）。提交后 CI 会跑一遍{" "}
            <InlineCode>submission-check</InlineCode>，失败原因会直接回在 issue 里。
          </li>
          <li>2. 维护者审内容与许可。需要改的直接编辑原 issue，改完自动重跑。</li>
          <li>3. 合并进 main。部署工作流重新生成索引、构建静态站、发布 Pages。</li>
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
         
          <a
            href={`${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ size: "md" })}
          >
            完整贡献指南
          </a>
        </div>
      </section>
        </div>

        <aside className="hidden xl:block">
          <SectionOutline className="sticky top-24" />
        </aside>
      </div>
    </div>
  );
}
