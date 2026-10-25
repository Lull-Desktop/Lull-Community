# 呼吸节奏 · Breathing

4-7-8 呼吸引导：吸气 4 秒、屏息 7 秒、呼气 8 秒，循环计数。圆圈胀缩的节奏就是该呼吸的节奏，
不用盯着数字。

## 能力

只申请 `widget.ui`。不需要持久化、不需要联网、不需要读宿主主题——
一个呼吸引导器没有任何理由碰这些。

## 实现

- 每帧用 `requestAnimationFrame` 计算进度，直接写 `transform: scale()` 与
  `stroke-dashoffset`，没有 `setTimeout` 链，窗口挂起再唤醒不会漂移。
- 缓动用 `easeInOut`，吸气与呼气的速度两端更慢，接近真实呼吸曲线。
- 遵守 `prefers-reduced-motion`：关闭过渡后仍然按节奏变化尺寸，只是没有插值。
- 面板半透明 + `backdrop-filter`，`window.transparent = true`，贴在桌面上没有硬边。

## 安装

下载 `.zip` → Lull **设置 → 扩展 → 从文件安装** → 启用 → 打开。

## 许可

MIT，作者 Lull Community。
