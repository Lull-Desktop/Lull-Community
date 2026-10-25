# schemas

这个目录里的文件**不是本仓库自创的标准**，而是从 Lull 主仓库
（`F:\TK\GameProjects\lull-app`，GitHub 上的 `lull-app`）**逐字复制**过来的：

| 文件 | 上游路径 | 上游许可 |
| --- | --- | --- |
| `scene.schema.json` | `content/schema/scene.schema.json` | CC BY 4.0 |
| `catalog.schema.json` | `content/schema/catalog.schema.json` | CC BY 4.0 |

上游对应文档：`docs/content-format.md`（内容包格式）、`docs/widget-sdk.md`（Widget 包）。

## 为什么复制而不是自己写

Lull 桌面端安装内容包时，按 `scene.schema.json` 与 `catalog.schema.json` 校验清单。
社区站如果自己再定一套字段，提交上来的作品会「网站上能看、装进 Lull 装不上」。
所以校验以这里的 schema 为唯一标准；上游改了格式，这里跟着同步。

同步方式：从 `lull-app` 复制这两个文件，覆盖后跑 `pnpm content:check`。
如果上游改了字段含义，`scripts/validate-content.mjs` 与贡献文档要一起改。

## Widget 没有 JSON Schema

上游的 Widget 清单（`widget.json`，schemaVersion 2）只在 Rust 侧校验，
没有导出的 schema 文件：`src-tauri/src/widget_package/manifest.rs`。
本仓库不发明一份，而是把同样的规则写进 `scripts/validate-content.mjs`
（id、窗口尺寸区间、能力白名单、`chrome=custom` 与 `widget.chrome` 的联动等），
并在注释里标注对应的 Rust 校验项。

## community-item.schema.json 是本仓库自己的东西

它只描述**网站展示用的元数据**（标签、精选、预览图），不会进入内容包，
也不会被 Lull 读取。作者需要在作品目录里提供 `item.json`，但 Lull 完全不知道它的存在。
