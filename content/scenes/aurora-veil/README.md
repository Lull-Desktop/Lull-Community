# 极光帷幕 · Aurora Veil

三层极光色带被 `blur(48px)` 柔化后以 `mix-blend-mode: screen` 叠加，在星野上缓慢摆动；
远山与近山用 `clip-path` 切出剪影，把地平线的冷光压住，避免画面下半部分发灰。

## 实现要点

| 部分 | 做法 |
| --- | --- |
| 星空 | 两层 `radial-gradient` 点阵，不同 `background-size` 与闪烁周期制造纵深 |
| 极光 | 三个色带，不同周期（46s / 64s / 80s）交替摆动，避免同步产生的机械感 |
| 山脊 | `clip-path: polygon()` 描出折线，不需要图片 |
| 暗角 | 一层全覆盖 `radial-gradient`，让视线集中在中央 |

## 性能

- `performance.tier = low`，目标 30fps。
- 动画只作用在 `transform` 与 `opacity` 上，不会触发重排；`will-change: transform` 提前合成图层。
- 尊重 `prefers-reduced-motion`：系统开启「减少动态效果」后动画全部停止。

## 安装

下载 `.zip` → Lull **设置 → 扩展 → 从文件安装** → **壁纸 → 场景** 选「极光帷幕」。

## 许可

CC BY 4.0，作者 Lull Community。
