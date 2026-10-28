# content

社区作品的唯一来源。网站不维护第二份作品清单：`scripts/build-catalog.mjs`
扫这里的目录，生成 `site/src/generated/catalog.json`。

## 目录结构

```text
content/
  scenes/<slug>/
    item.json            # 网站展示元数据（本仓库自有）
    preview.webp         # 预览图，可选 png/jpg
    README.md            # 作品说明，进详情页
    LICENSE              # 作品自身的许可文本，建议提供
    package/             # ★ 原样装进 Lull 的内容包，结构与 public/content 一致
      catalog.json
      scenes/<id>/index.html
      scenes/<id>/assets/…

  widgets/<slug>/
    item.json
    preview.webp
    README.md
    package/             # ★ 结构与 Lull 的 widget 包一致
      widget.json
      index.html
      main.js / style.css / assets/…
```

**`package/` 是分界线**：里面的东西会被原样校验、摘要、打 zip；外面的
`item.json`、`preview.webp`、`README.md` 只用于网站展示，永远不会进包。

## 外部投稿用同一套路径

通过 issue 表单投稿的作者，在自己的仓库里也用 `content/<scenes|widgets>/<slug>/` 这个路径，
目录结构与下面完全一致。表单里的「作品目录 / Item directory」照抄这个路径即可，
合并时机器人会把整个目录原样落到本站的同一位置——来源与目标同名同构，出问题时容易对账。

```text
<author-repo>/content/scenes/aurora-night/   ← 与本站 content/scenes/aurora-night/ 同构
```

想放别的子目录也合法（表单填那个路径），作品目录就是仓库根时留空。
登记信息（谁提的、来自哪个仓库、审查到哪个 commit）记在仓库根的 `community.json`，
不在内容目录里——内容目录会被打进 zip 下发。

这样做的原因：预览图和说明文字如果混进包内，会一起被算进摘要、一起被塞进 zip，
用户装到的是一个「带截图和文档」的包。Lull 只认清单和入口，其余都是体积。

## 两类作品的格式差异（来自上游，不要自行合并）

| | Scene（壁纸） | Widget（工具） |
| --- | --- | --- |
| 根清单 | `catalog.json`（`schemaVersion: 1`），`scenes` 恰好一条 | `widget.json`（`schemaVersion: 2`） |
| id 规则 | `^[a-z0-9][a-z0-9._-]{2,63}$`，建议 `作者.场景` | `^[a-z][a-z0-9-]{1,31}$`，装好后目录名必须等于 id |
| 摘要 | 写进清单的 `integrity.digest`，覆盖 entry 所在目录 | 旁路文件 `.lull-integrity.json`，覆盖整包（除它自己） |
| 运行时 | `sandbox=""` 的 iframe，不执行 JS（除非声明 `wallpaper.script`） | `sandbox="allow-scripts"` + postMessage 桥 |
| 能力 | `wallpaper.*`（5 个） | `widget.*`（7 个） |

字段与安全边界的完整定义在上游文档：`docs/content-format.md`、`docs/scene-sdk.md`、
`docs/widget-sdk.md`。本仓库的 `schemas/` 是这些规范的逐字副本。

## 校验与摘要

```bash
pnpm content:check   # 校验全部作品（PR 与部署前都跑）
pnpm content:hash    # 内容改了之后重算摘要并写回
pnpm content:pack    # 只打包，不建站
```

摘要算法与 Lull 安装器完全一致，`scripts/lib/digest.mjs` 里带一个已知值自检：
官方「雾岚」包的摘要必须算出
`f6b86e63434d810099e293bfa74c556542a02fbe96fc7ce97390e0938a608ecb`。
算不出来就说明算法漂移了，此时打出的 zip 一定会被安装器拒绝。

## 新增作品

```bash
pnpm new scene aurora-night
pnpm new widget my-tool
```

生成骨架后填清单、放预览图，跑 `pnpm content:hash` 与 `pnpm content:check`。

## 种子内容

现有五个作品用来验证整条链路：

| 作品 | 说明 |
| --- | --- |
| `scenes/mist` | 官方内容包，摘要与 Rust 侧已知值一致，同时作为算法自检基准 |
| `scenes/aurora-veil` | 自建静态场景，演示三层模糊色带与 `clip-path` 山脊 |
| `scenes/three-scene` | 脚本场景，演示 `wallpaper.script` + `wallpaper.params` 的参数热更（Three.js 随包分发） |
| `widgets/minimal-clock` | 只申请 `widget.ui` 的最小权限工具 |
| `widgets/breathing` | 4-7-8 呼吸引导，演示 `requestAnimationFrame` 驱动的状态机 |

正式运营时可以删除，但建议至少留一个静态场景、一个脚本场景与一个工具，方便新贡献者对照结构。

## 脚本场景的额外要求

`wallpaper.params` / `wallpaper.sync` 只能配 `wallpaper.script` 使用，校验会拦下单独声明的情况。
脚本包还有两条约定：

- 依赖必须打进入口脚本（如 `three-scene` 把 Three.js 打包进 `main.js`），**不要**引用 CDN；
  运行时是 `sandbox="allow-scripts"` 的 opaque-origin iframe，CSP 会挡掉所有远程请求。
- 第三方库的版权与许可写进包内的 `THIRD_PARTY_NOTICES.md`，包会被原样算进摘要、打成 zip。
