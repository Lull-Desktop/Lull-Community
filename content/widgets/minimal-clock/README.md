# 极简时钟 · Minimal Clock

一台只有时间的大字时钟。玻璃面板半透明，放在浅色或深色桌面上都不突兀。

## 能力

| 能力 | 是否需要 |
| --- | --- |
| `widget.ui` | 是（渲染界面） |
| `widget.theme` / `widget.state` / `widget.audio` / `widget.network` / `widget.chrome` | 不需要 |

这是最小权限的例子：一个只显示时间的工具，不需要持久化、不需要联网、不需要读写宿主状态。
启用时宿主只会显示一条 `widget.ui`，用户不必判断「它要网络做什么」。

## 实现

- 使用 `requestAnimationFrame` 轮询，只在**秒数变化**时改写 DOM，其余帧直接返回。
- 时间用 `font-variant-numeric: tabular-nums`，数字跳动时宽度不抖。
- 面板背景是半透明 + `backdrop-filter`，`window.transparent = true`，窗口没有直角边。
- 没有引入 `@lull/widget-sdk`：这个工具不需要与宿主通信，少一个依赖就少一处信任面。

## 安装

下载 `.zip` → Lull **设置 → 扩展 → 从文件安装** → 扩展里点「启用」→「打开」。

## 许可

MIT，作者 Lull Community。
