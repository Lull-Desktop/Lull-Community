# 贡献指南

两种贡献：**投稿作品**与**改网站**。前者走内容目录，后者走 `site/` 与 `scripts/`。

## 一、投稿作品

### 方式 A：Pull Request（能改文件、一次带多个作品）

### 1. 生成骨架

```bash
pnpm install
pnpm new scene aurora-night     # 壁纸：content/scenes/aurora-night/
pnpm new widget my-tool         # 工具：content/widgets/my-tool/
```

`slug` 用小写字母、数字与连字符，2–32 位。它是 URL 段，合并后不要改。

### 2. 目录里必须有什么

```text
content/scenes/aurora-night/
├── package/                        ★ 装进 Lull 的包，结构与官方内容同构
│   ├── catalog.json
│   └── scenes/aurora-night/index.html
├── item.json                       展示元数据（标签、精选、预览图文件名）
├── preview.webp                    16:9，宽 1280–1600px，< 3 MiB
├── README.md                       作品说明
└── LICENSE                         作品自身许可原文
```

`widgets/` 同构，只是 `package/` 里换成 `widget.json` + 入口页面。

**`package/` 是硬边界**：里面的东西会被算摘要、打 zip、装到用户机器上；
外面的 `preview.webp` / `README.md` / `item.json` 只影响网站展示，永远不会进包。
不要把截图和文档塞进 `package/`。

### 3. 写清单

**壁纸场景**（`package/catalog.json`，`schemaVersion: 1`）：

```json
{
  "schemaVersion": 1,
  "scenes": [
    {
      "schemaVersion": 1,
      "type": "scene",
      "id": "yourname.aurora-night",
      "name": "极光帷幕",
      "version": "1.0.0",
      "description": "一句话说清画面与做法。",
      "author": "your-name",
      "license": "CC-BY-4.0",
      "capabilities": ["wallpaper.viewport", "wallpaper.canvas"],
      "entry": "scenes/aurora-night/index.html",
      "theme": { "background": "#04060e", "accent": "#48d6b2" },
      "performance": { "tier": "low", "targetFps": 30 },
      "compatibility": { "hostApi": 1, "platforms": ["windows"] }
    }
  ]
}
```

- `id` 建议 `作者.场景`，全局唯一，发布后不要改名（改名等于新作品）。
- `capabilities` 至少一项，只能从 `wallpaper.viewport / canvas / sync / params / script` 里选。
- 静态包**只允许 HTML 与 CSS**。要有 JavaScript 就申请 `wallpaper.script`，
  并通过 `@lull/scene-sdk` 读参数与视口，不要碰宿主 DOM。
- 声明 `params` 必须同时申请 `wallpaper.params`，且 `params` / `sync` 只能用于脚本场景。

**桌面工具**（`package/widget.json`，`schemaVersion: 2`）：

```json
{
  "schemaVersion": 2,
  "type": "widget",
  "id": "my-tool",
  "name": "我的工具",
  "version": "1.0.0",
  "description": "一句话说清它做什么。",
  "author": "your-name",
  "license": "MIT",
  "builtin": false,
  "hostApi": 1,
  "entry": "index.html",
  "lifecycle": "background",
  "capabilities": ["widget.ui"],
  "window": {
    "width": 480,
    "height": 320,
    "resizable": false,
    "transparent": true,
    "chrome": "host"
  },
  "network": []
}
```

- `builtin` 必须 `false`，`hostApi` 目前只接受 `1`。
- 窗口尺寸在 320×240 – 1600×1200 之间，首期固定尺寸（`resizable: false`）。
- `chrome: "custom"` 必须同时申请 `widget.chrome`。
- `network` 只允许 `https://` 与 `http://localhost:<port>`，且必须与 `widget.network` 成对出现。
- **能力宁少勿多**：不需要联网就别申请，审查时这一项会被重点看。

### 4. 预览图与说明

- `preview.webp`：列表卡片与详情页头图共用，16:9。直接从 Lull 里截屏也行，
  但不要截到其他窗口的内容。
- `README.md`：写清「它是什么 / 怎么实现 / 素材从哪来」。详情页会原样渲染。
- `LICENSE`：作品本身的许可原文。可以和仓库的 CC BY 4.0 不同。

### 5. 本地自检

```bash
pnpm content:hash     # 重算摘要并写回（scene 写清单，widget 写 .lull-integrity.json）
pnpm content:check    # 校验清单、路径、体积、摘要
pnpm content:pack     # 产物在 artifacts/，拖进 Lull 真装一次
```

摘要不要手算。scene 与 widget 的算法不同（域分隔符、覆盖范围都不一样），
`pnpm content:hash` 是唯一正确的写法。

### 6. 开 PR

PR 模板里有清单，逐项勾选。`validate.yml` 会跑校验、试构建，并把打好的 zip
上传成构建产物——reviewer 可以直接下载试装。

标题按 `type(scope): subject` 写，例如 `feat(scene): 新增「雾岚」静态场景`。
本仓库只做 squash 合并，**标题就是 main 上的那条提交信息**，`commit.yml` 会校验它；
类型与 scope 的白名单见站点投稿页的《提交规范》v1.0
（<https://lull-desktop.github.io/Lull-Community/submit#spec>）。
分支名用 `feat/<slug>`、`fix/<slug>`、`content/<kind>-<slug>`、`docs/<topic>`，
合并后自动删除。想让本地就先拦住，可挂上仓库里的钩子：

```bash
git config core.hooksPath .githooks
```

### 方式 B：issue 表单（不 fork、不装 Node）

作品放在**你自己的公开仓库**里，路径与本站**完全一致**——本站怎么放，你就怎么放：

```text
<your-repo>/
└── content/
    ├── scenes/<slug>/        ← 壁纸：目录名 = slug
    │   ├── package/          ★ 与本仓库同构的包（会被装进 Lull）
    │   ├── item.json         站点展示元数据（不进包）
    │   ├── preview.webp      16:9 预览图（不进包）
    │   ├── README.md         作品说明（不进包）
    │   └── LICENSE           作品许可原文（不进包）
    └── widgets/<id>/         ← 插件：目录名 = 插件 id
        └── …同构
```

这样组织的好处是「作品目录」一栏**照抄就能用**：壁纸填 `content/scenes/<slug>`，
插件填 `content/widgets/<id>`；合并时运维把整个目录原样落到本站的同一路径，
来源与目标同名同构，对不上时一眼能看出来。

如果你不想在仓库里建 `content/`，也可以把作品目录放在任意子目录（表单里填那个路径即可）；
作品目录本身就是仓库根时，「作品目录」留空。

1. 打一个 tag（推荐），或记下完整 commit；
2. 开「壁纸提交」或「插件提交」issue，填表：作品 id、slug、仓库地址、版本、目录、能力说明、许可证，
   并把一张**运行截图**拖进截图框（外链不算）；
3. `submission-check` 会取回那个提交检查格式，回帖告诉你差什么。改完**编辑原 issue** 即自动重查；
4. 维护者审查后评论 `/merge <commit>`，机器人把目录写进 `content/` 并登记到 `community.json`。

#### 各目录的用途与归属

| 路径 | 谁写 | 进不进包 | 用途 |
| --- | --- | --- | --- |
| `content/<scenes\|widgets>/<slug>/package/` | 作者 | **进** | Lull 真正安装的内容；改这里必须重算摘要 |
| `…/<slug>/item.json` | 作者 | 不进 | 站点展示：标签、预览图文件名；`addedAt`/`featured` 由导入覆盖 |
| `…/<slug>/preview.webp`、`screenshots` | 作者 | 不进 | 卡片与详情页头图 |
| `…/<slug>/README.md`、`LICENSE` | 作者 | 不进 | 详情页正文、许可原文 |
| `community.json` | 机器人 | 不进 | 登记表：提交人、来源仓库、审查 commit、版本 |
| `release/`、`keys/` | compound | 不进 | 发布清单、批次签名、逐包签名、公钥；与作品目录无关 |
| `site/public/{downloads,content-assets,release}/` | 构建生成 | — | 站点产物，从不入库 |

**`package/` 是唯一会被安装的边界**：外面的东西（预览图、说明、许可）永远不会进包，
所以别把截图塞进 `package/`，也别指望 `package/` 里的文件被网站展示。

几个必须知道的点：

- **摘要不用你算**：`integrity` / `.lull-integrity.json` 在合并时由 CI 重算，作者不需要跑 `content:hash`；
- **同一个作品只留一条提交 issue**：重复开的会被自动关闭并指回第一条；更新用「壁纸更新 / 插件更新」；
- **仓库地址与目录以首次收录为准**，要换请在 issue 里说明，由维护者改登记表；
- 格式检查失败且 14 天没回应的 issue 会被自动关闭。

## 二、审查标准

维护者合并前会看四件事：

| 维度 | 会卡住的 | 只会提一句的 |
| --- | --- | --- |
| 能装 | 清单非法、摘要不符、路径越界、体积超限、zip 含反斜杠 | 文件偏多、包偏大 |
| 授权 | 素材来源不明、许可与清单不一致、条款禁止再分发 | 没写素材出处 |
| 安全 | 加载远程脚本、尝试读宿主数据、伪造能力声明 | 申请了不必要的能力 |
| 表达 | 与已有作品完全重复 | README 太短、预览图偏糊 |
| 来源 | 仓库与目录说不清、commit 对不上、表单里的 id/slug 与清单不一致 | 只有一个 tag 没有源码 |

作品完全重复、或与 Lull 官方内置内容高度重合的，会建议改成衍生或拒绝。

## 三、改网站

- 技术栈：Next.js 16（静态导出）+ TypeScript + Tailwind CSS v4。
- 页面数据只从 `site/src/generated/catalog.json` 读，**不要在页面里解析 `content/`**：
  内容解析、许可判断、包验证属于 `scripts/`，页面只负责展示。
- 新增字段：先改 `scripts/build-catalog.mjs` 的输出，再改 `site/src/lib/catalog.ts` 的类型。
- 改了 `scripts/lib/digest.mjs` 或 `zip.mjs`，务必先跑 `pnpm content:check`，
  里面的已知值自检会告诉你算法是否还和 Lull 一致。

### 提交前

```bash
pnpm content:check
pnpm build            # 校验 + 索引 + 静态构建，等价于 CI 里的两步
```

## 四、撤稿与下架

作者可以在 PR 里删除自己的作品目录。被删除的作品会在下次部署时从站内消失，
对应的 zip 也不再产出——静态站的构建产物每次重建，不会留下指向旧文件的死链。

如果作品涉及侵权或安全问题，维护者可以直接 revert 对应的提交，并在 issue 里说明。
