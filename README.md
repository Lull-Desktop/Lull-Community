# Lull Community

Lull 的第三方社区站：浏览、下载、提交**壁纸场景**与**桌面工具**。

- 社区站点：<https://lull-desktop.github.io/Lull-Community/>
- Lull-App下载：<https://github.com/Lull-Desktop/Lull>

开发者可以提交 PR，维护者审核合并，GitHub Actions
自动校验、打包、构建、发布到 GitHub Pages——没有数据库，没有后端 API，没有账号系统（后期考虑完善）。

不想 fork 也行：在自己的仓库里放好作品，填一张 issue 表单（壁纸 / 插件的提交与更新各一份），
CI 取回那个提交做格式检查，维护者 `/merge <commit>` 后由机器人写入 `content/`。

```text
content/scenes|widgets/<slug>/     ← 内容的唯一来源（GitHub 仓库）
        │
        ├─ pnpm content:check      ← 校验：Lull 的 Schema + Rust 侧规则 + 整包摘要
        ├─ pnpm build:catalog      ← 扫目录 → 生成索引、复制预览图、打可安装 zip
        ├─ pnpm verify:release     ← 验签：签名坏了/已签字节被改就停（清单过期只警告）
        └─ next build (export)     ← 生成纯静态站点
                    │
                    └─ GitHub Pages   ← 公开网站
```

> 发布签名（Ed25519，离线）包含两层：批次清单 `release.json` 的签名，以及
> `release/signatures/` 下每个包的 detached 签名。它只标注「这批文件由 community 发布」，
> 不授予权限、不放宽限制、不参与「能不能装/能不能跑」。见 [SECURITY.md](SECURITY.md)。

## 目录

```text
Lull-Community/
├── content/                     社区作品（唯一来源）
│   ├── scenes/<slug>/
│   │   ├── package/             ★ 原样装进 Lull 的内容包
│   │   ├── item.json            网站展示元数据（标签/精选/预览图名）
│   │   ├── preview.webp         16:9 预览图
│   │   ├── README.md            作品说明，渲染进详情页
│   │   └── LICENSE              作品自身许可
│   └── widgets/<slug>/          同构，package/ 内是 widget.json + 页面
├── community.json               投稿登记表：谁提的、来自哪个仓库、审查到哪个 commit
├── keys/publisher-keys.json     发布签名的公钥（私钥不在这里，也永远不该在这里）
├── release/                     发布清单、批次签名与逐包签名（每次发布更新一次）
│   ├── release.json             批次清单（v2：每项带 signature 指针）
│   ├── release.json.sig         对清单原始字节的 Ed25519 签名
│   └── signatures/              每个包的 detached 签名（envelope，v2 起）
├── schemas/                     Lull 的 JSON Schema + 本仓库发布契约
├── scripts/
│   ├── validate-content.mjs     校验 + 摘要写回（--fix）
│   ├── check-commit.mjs         提交信息校验（钩子与 PR 工作流共用）
│   ├── build-catalog.mjs        索引 / 预览图 / zip
│   ├── package-content.mjs      只打包到 artifacts/，供手工试装
│   ├── new-item.mjs             生成作品骨架
│   ├── keygen.mjs               离线生成发布密钥对
│   ├── sign-release.mjs         离线签一批发布（CI 上会被拒绝）
│   ├── verify-release.mjs       清单验签 + 逐包验签 + 覆盖度 + 防回滚（CI 与本地同一份）
│   ├── release.mjs              一条命令：校验 → 打包 → 签名 → 验签
│   ├── ci/                      issue 表单检查与合并（check-issue / import-submission）
│   └── lib/{digest,zip,registry,signing,package-signature}.mjs
├── site/                        Next.js 16 静态站（Tailwind v4）
│   └── src/app/{page,scenes,widgets,submit}
├── test/                        node:test：表单契约、投稿规则、签名、端到端取回
├── .githooks/commit-msg         可选的本地提交信息钩子
└── .github/workflows/
    ├── validate.yml             PR：校验 + 单测 + 验签 + 试构建，只读权限
    ├── commit.yml               PR：标题即提交信息，校验格式
    ├── submission-check.yml     投稿 issue：取回作者仓库 → 校验 → 回帖
    ├── submission-import.yml    `/merge <commit>`：写入 content/ 与登记表
    ├── close-stale.yml          每天：清理无回应的失败投稿
    └── deploy.yml               main：校验 → 构建 → 验签 → 部署 Pages
```

## 关键约束：格式以 Lull 为准

这个仓库**不定义内容格式**。清单字段、id 规则、能力白名单、摘要算法全部来自
Lull 主仓库：

| 主题 | 上游位置 |
| --- | --- |
| 场景包格式与摘要 | `docs/content-format.md`、`content/schema/*.json` |
| Widget 包格式 | `docs/widget-sdk.md`、`src-tauri/src/widget_package/manifest.rs` |
| 扩展中心 / 安装管线 | `docs/extension-center.md` |

`schemas/scene.schema.json` 与 `catalog.schema.json` 是上游逐字副本；`release.schema.json` 与
`package-signature.schema.json` 是本仓库的发布契约（见 `schemas/README.md`）。上游改格式，这里跟着改；
`scripts/lib/digest.mjs` 里带一个**已知值自检**：官方「雾岚」包的摘要必须算出
`f6b86e63…a608ecb`，算不出来就说明算法漂移了，此时打出的所有 zip 都会被安装器拒绝。

## 本地开发

```bash
pnpm install          # 需要 Node 22+、pnpm 11
pnpm dev              # 先生成索引，再起 Next dev server
pnpm content:check    # 只校验内容
pnpm build            # 完整构建：校验 → 索引 → 静态站（输出 site/out）
```

`site/src/generated/`、`site/public/content-assets/`、`site/public/downloads/` 都是
构建产物，不入库。所以不要直接 `pnpm --dir site build`，先跑 `pnpm build:catalog`。

## 新增作品

```bash
pnpm new scene aurora-night     # 或 pnpm new widget my-tool
# 填清单、写页面、放 preview.webp 与 README.md
pnpm content:hash               # 重算摘要并写回
pnpm content:check
pnpm content:pack               # artifacts/ 里直接拖进 Lull 试装
```

> `artifacts/` 里的包只用于本地试装，没有逐包签名；正式发布的逐包签名由
> `pnpm release` 在离线机器上生成到 `release/signatures/`。

细节与审查标准见 [CONTRIBUTING.md](CONTRIBUTING.md)；从收到投稿到签名的完整操作顺序见
[docs/review-runbook.md](docs/review-runbook.md)。

## 部署

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
2. 推到 `main`，`deploy.yml` 会构建并发布。

项目站点的地址是 `https://<org>.github.io/<repo>/`，因此 `site/next.config.ts`
在 CI 里自动把仓库名作为 `basePath`。换成自定义域名或组织根主页仓库时，
把环境变量 `NEXT_PUBLIC_BASE_PATH` 显式设为空串。

## 几个刻意的取舍

**不做数据库和上传接口。** 作品的元数据在清单里，索引在构建时生成。
搜索与筛选是纯前端的：几万个作品以内，静态索引完全够用。等到需要账号、收藏、
在线审核时再引入服务端，那时也知道真实需求是什么。

**`package/` 与展示文件分开。** 预览图、README 不进包：包会被算摘要、打 zip、
装到用户机器上，多一张 1 MiB 的截图只是浪费带宽。分界线清楚，贡献者也不会
把「网站需要的东西」误当成「Lull 需要的东西」。

**JSON 页面在构建时生成。** 静态导出不能在访问时临时生成详情页，所以每次合并都会
重新构建。代价是新增作品必须重新部署，收益是零运维、零冷启动、CDN 直接扛。

**zip 自己写。** Windows 的 `Compress-Archive` 会把条目路径写成反斜杠，Lull 安装器
会以 `package.unsafe-entry` 拒绝。`scripts/lib/zip.mjs` 统一写正斜杠与 UTF-8，
并固定时间戳，让同一份内容在不同机器上打出相同字节。

**校验只判断「能不能装」，不判断「好不好看」。** 缺预览图、缺 README 是警告，
清单非法、摘要不符、路径越界是错误。前者可以在 review 里说，后者不能合。

## 许可

- 网站代码与脚本：MIT（[LICENSE](LICENSE)）
- `content/`、`schemas/` 下的清单与说明：CC BY 4.0（[CONTENT-LICENSE.md](CONTENT-LICENSE.md)）
- 每个作品自身的许可以其目录内 `LICENSE` 与清单 `license` 字段为准
