## 这个 PR 提交了什么

<!-- 勾选适用的项，并补一句说明 -->

> 标题就是合并后的提交信息（本仓库只做 squash），格式 `type(scope): subject`。
> 完整规范：<https://lull-desktop.github.io/Lull-Community/submit#spec>
>
> 已经通过 issue 表单收录的作品**不要**再开 PR 改内容：内容更新请开「壁纸更新 / 插件更新」issue，
> 否则登记表里的 commit 与内容会对不上（`pnpm content:check` 会报出来）。

- [ ] 新增壁纸场景（`content/scenes/<slug>/`）
- [ ] 新增桌面组件（`content/widgets/<slug>/`）
- [ ] 更新已有作品（版本号已递增）
- [ ] 修复内容或文档问题

**作品名 / slug：**

**一句话说明它是做什么的：**

## 提交前自检

- [ ] 分支从最新 `main` 拉出，一个 PR 只做一件事
- [ ] `pnpm content:hash` 已跑过（摘要写回清单或 `.lull-integrity.json`）
- [ ] `pnpm content:check` 本地通过
- [ ] 用 `pnpm content:pack` 打出的 zip 真的拖进 Lull 装过，能正常显示/运行
- [ ] `preview.webp` 是 16:9、宽度 1280–1600px，不是截图糊图
- [ ] `README.md` 写清了实现思路与素材来源
- [ ] 作品目录里有 `LICENSE`，且清单里的 `license` 与之一致
- [ ] 素材（纹理、图片、字体、音频）我有权以该许可分发

## 能力说明（仅工具）

<!-- 每项申请的能力都写一句"为什么需要"；不需要的能力请删掉 -->

| 能力 | 用途 |
| --- | --- |
| `widget.ui` |  |
|  |  |

## 备注

<!-- 需要维护者注意的兼容性、体积、性能问题 -->
