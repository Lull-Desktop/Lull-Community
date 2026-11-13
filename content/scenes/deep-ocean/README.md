# 深海鱼群 / Deep Ocean School

实时水下鱼群场景，包含海床、光柱和随环境运动的鱼群。场景使用 WebGPU
计算与渲染，并支持鼠标位置交互；可在 Lull 中调整鱼群数量、渲染比例、
海水浑浊度、鱼身亮度、泛光和光柱等参数。

## 来源与许可

- 原项目：[imokya/threejs-fish](https://github.com/imokya/threejs-fish)。
- 本场景基于该项目的本地改造版本，增加了 Lull 场景宿主适配及参数接口。
- 截至 2026 年 11 月 13 日，原项目未附带许可文件或声明开源许可证；
  因此原项目及其衍生部分的使用、修改和再分发授权尚待权利人确认。
  清单中的 `LicenseRef-Unspecified` 表示许可未明确，并非授权许可。
- 包内包含 three.js，依赖部分的 MIT 许可与版权声明见 `LICENSE`；
  该许可不代表整个场景均已获得 MIT 授权。

## 运行要求

需要支持 WebGPU 的环境和 Lull 宿主 API 3。鱼群数量与渲染比例越高，
GPU 消耗也会增加；无法取得 WebGPU 设备时场景无法正常渲染。
