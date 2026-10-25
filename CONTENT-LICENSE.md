# 内容许可

本仓库把两类东西分开授权，和 Lull 主仓库（`lull-app`）的处理方式保持一致：
**网站代码**与**社区内容**不共用同一个许可。

## 1. 网站与工具脚本：MIT

`site/**`、`scripts/**`、`.github/**` 以及根目录下的配置和文档，使用
[`LICENSE`](LICENSE) 中的 MIT 许可。

## 2. 社区内容与格式规范：CC BY 4.0

以下内容使用 **Creative Commons Attribution 4.0 International**：

- `content/**` —— 社区作品的清单、包、预览图与说明文字
- `schemas/**` —— 内容格式的 JSON Schema（逐字来自 Lull 主仓库）

转载或改编时请保留署名，例如：

```text
"雾岚" scene package from Lull Community, licensed CC BY 4.0.
https://github.com/<org>/Lull-Community/tree/main/content/scenes/mist
```

## 3. 各作品可以有自己的许可

`content/` 目录的 CC BY 4.0 只覆盖**本仓库自有的**清单与说明文字。
每个作品包内的 `license` 字段才是该作品本身（HTML / CSS / 图片 / 脚本）的授权，
可以比仓库更严格，但必须显式声明，且不能与再分发冲突。

提交前请确认：

- 素材（纹理、图片、字体、音频）你有权分发；
- 作品许可允许他人下载、安装、本地修改；
- 不接受「仅限非商业 + 禁止演绎」这类与社区再分发冲突的条款。

## 4. 上游来源

本仓库的 `schemas/**` 与两个种子作品来自 Lull 主仓库
（`content/schema/**`、`public/content/scenes/mist`、`examples/**`），
随上游以 CC BY 4.0 发布。详见 [`schemas/README.md`](schemas/README.md)。
