# 三维光轨 · Three.js 光轨

一个用 WebGL 画的壁纸：线框环结（TorusKnot）在星尘里缓慢自转，冷青色点光从右上方压过主体，
青绿色轮廓光从后下方勾出边缘。整场景在近黑底上做加色混合，暗部不会发灰。

它是社区里第一个**脚本场景**（`wallpaper.script` + `wallpaper.params`）参考实现：
想给壁纸加可调参数、又不想重建 iframe，可以照这个结构写。

## 参数

五个参数都写在清单的 `params` 里（详情页上方的「可调参数」表就是直接读清单渲染的），
在设置面板改完即时生效，不重启壁纸：`speed` 转速、`particles` 星尘数量、
`tint` 主色、`wireframe` 线框开关、`tilt` 倾角。

## 实现要点

| 部分 | 做法 |
| --- | --- |
| 参数热更 | `connectLullScene()` 拿到的 `onFrame` 里读 `frame.params`，只更新材质色、粒子几何与相机纵横比，从不重建对象 |
| 星尘 | `BufferGeometry` + `Points`，球壳内均匀采样；数量变化时才重建几何，其余帧只转 `rotation.y` |
| 体积光感 | `FogExp2` 让远处粒子自然淡出，`AdditiveBlending` + `depthWrite: false` 避免点阵互相遮挡 |
| 帧同步 | 宿主开启 `sync` 时用 `sync.epochMs` 对齐相位，多屏壁纸不会各转各的 |
| 省电 | `onVisibility` 为 false 时直接跳过渲染；系统开启「减少动态效果」后停止累加相位 |

Three.js 已随 `main.js` 打包，**不加载任何远程脚本**；场景仍运行在
`sandbox="allow-scripts"` 的 opaque-origin iframe 里。

## 性能

- `performance.tier = medium`，目标 60fps；星尘上限 5000，上限内是单次 draw call。
- `pixelRatio` 截断到 2，高 DPI 屏不会按物理像素翻倍渲染。
- 尺寸变化只在 `viewport` 真的变了才调 `setSize` 与投影矩阵。

## 安装

下载 `.zip` → Lull **设置 → 扩展 → 从文件安装** → **壁纸 → 场景** 选「三维光轨（Three.js）」。

## 许可

场景代码 CC BY 4.0，作者 Lull Demo。包内 `THIRD_PARTY_NOTICES.md` 记录了
随包分发的 **Three.js r186（MIT）** 及其版权声明。
