# 安全说明

这份文档说的是**本项目保证什么、不保证什么**。请按字面理解，不要外推。

## 一句话

本站分发的内容保证「**能被 Lull 装上**」和「**和仓库里的字节一致**」。
发布签名额外说明「**这批字节由 community 发布**」。它**不**说明作者是谁，也**不**承诺内容安全。

## 我们保证

| 保证 | 靠什么 | 同时意味着 |
| --- | --- | --- |
| 内容符合 Lull 的包格式 | `pnpm content:check`：上游 JSON Schema + Rust 侧 widget 规则 + 路径与体积检查 | 只证明「能装」，不证明「好用」 |
| 下载到的 zip = 仓库里的内容 | 构建时从 `content/` 现打 zip，时间戳固定，可复现 | 传输损坏会被摘要拦下 |
| 装到机器上的字节没被改 | 包内摘要（scene 写 `catalog.json` 的 `integrity`，widget 写 `.lull-integrity.json`），安装器每次复算 | 摘要值就写在包里，**改了内容再重算就能对上** |
| 这批字节由 community 发布 | `release/release.json` + Ed25519 签名，公钥在 `keys/publisher-keys.json` | 只到「community」这一层，不到「某位作者」 |
| 这个包本身由 community 发布 | `release/signatures/` 下的逐包 Ed25519 签名（v2 起），对包声明里的 `digest` 再签一次 | 签名文件与公钥可达，但宿主端验签尚未实现；不代表作者身份或内容安全 |
| 扩展跑在隔离环境里 | 由 Lull 客户端负责：静态壁纸 `sandbox=""`；脚本壁纸与插件 `allow-scripts` 不透明源 + nonce CSP；权限取「清单声明 ∩ 用户授予」 | 本项目只是分发方，**不具备**运行时强制力 |

## 我们不保证

- **作者身份**。`community.json` 记的 `owners` 与 `source` 只是可追溯线索，
  任何人可以建一个同名仓库。我们不做实名、不做作者签名。
- **内容安全**。没有人工安全审计的承诺；审查看的是「能不能装、许可是否清楚、有没有明显越界」。
  插件会执行 JavaScript——沙箱限制的是它能碰到什么，不是它不会做坏事。
- **没有漏洞**。校验规则是白名单式的，白名单漏了就是漏了。
- **撤销的实时性**。公钥清单的撤销只对 CI 与站点立即生效；客户端要等下一次版本更新。

## 怎么自己验一遍

不需要信任这段文字，跑命令就行：

```bash
git clone https://github.com/Lull-Desktop/Lull-Community && cd Lull-Community
pnpm install && pnpm build          # 产出 zip 与 catalog.json
pnpm verify:release                 # 验签 + 比对每个 zip 的 sha256
```

`verify:release` 会告诉你四件事：清单是不是 community 签的、清单里每个 zip 的 sha256 是否对得上、
每个包的逐包签名是否有效且与清单一致、有没有内容还没被签名覆盖（`[V6]`，只是提示，不影响安装）。

站点上也能直接下载清单、签名、逐包签名与公钥清单：`/release/release.json`、
`/release/release.json.sig`、`/release/signatures/…`、`/release/keys.json`，
公钥原始清单见仓库 `keys/publisher-keys.json`。签名是 detached 的 Ed25519（PureEdDSA，
对清单/包声明的**原始字节**），不是 minisign/OpenSSH 格式，用本仓库脚本验最省事。

## 签名不参与准入

这一点必须说清楚，否则容易被当成「装了才安全」：

- 验签失败**不会**阻止安装，也**不会**阻止运行。
- 逐包签名（`release/signatures/`）同样只做来源标记：它让单个包可以脱离批次清单被核对，
  但本仓库不提供宿主端验签，也不改变安装器的准入条件。
- 站点与（将来的）客户端只改变一个徽章：`verified` / `unverified` / `mismatch`。
- `mismatch`（签名有效但字节不符）是最值得警惕的一档，当前也只标注、不拦截；
  是否升级为拒绝加载是客户端的产品决策。

换言之：**签名是来源标记，不是安全开关**。

## 报告问题

- 内容侵权、素材来源可疑、许可不符：开「作品问题」issue，选「许可或素材来源问题」。
- 装不上、跑不起来、性能异常：同上，选对应类型，带上 Lull 版本与错误码。
- 安全问题（远程代码、越权、隐私）：请在 issue 里只写「需要私下沟通」，
  由维护者另行联系；不要在公开 issue 里贴可利用细节。

## 措辞

本项目不使用「已验证」「官方认证」「安全」这类词来描述签名或审查结果。
看到这些说法请以本文件为准；如果有人用它们宣传，那不代表本项目的立场。
