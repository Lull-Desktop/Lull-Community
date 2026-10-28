# 发布与签名操作规程

本文件讲**只有发布责任人需要做的事**：拿私钥给一批内容签名。日常投稿与合并看
[CONTRIBUTING.md](./CONTRIBUTING.md)，**从收到投稿到提交签名的完整顺序**看
[docs/review-runbook.md](./docs/review-runbook.md)，规则正文在
<https://lull-desktop.github.io/Lull-Community/submit#spec>。

签名要解决的事只有一件：让用户能确认「这批下载字节是 community 发的，且没被替换」。
它**不**授予权限、**不**放宽限制、**不**参与「能不能装」或「能不能跑」的判断。

---

## 0. 责任与边界

| 物 | 谁持有 | 在哪 |
| --- | --- | --- |
| 私钥 `publisher.pem` | **仅 community 发布责任人** | 离线介质 / 密码管理器 / 硬件密钥 |
| 公钥 `keys/publisher-keys.json` | 所有人 | 仓库，随站点公布 |
| 签名 `release/release.json.sig` | 所有人 | 仓库，随站点公布 |

三条硬规矩（脚本会拦，不靠自觉）：

1. **CI 永远不签名**。`sign-release.mjs` 看到 `CI` 环境变量直接退出。
2. **私钥不进仓库**。路径落在仓库目录内会被拒；`.gitignore` 也挡着。
3. **私钥不外传**。它等同于发布权；泄漏按 §4 处理。

### 首次启用：先建标签

模板里的 `labels:` 指向不存在的标签时，GitHub 会**静默忽略**——issue 建出来没有标签，
CI 就不会跑，而且不会有任何报错。所以第一次上线先建齐：

```bash
gh label create scene-submission  --color 1d76db --description "壁纸提交（表单）"
gh label create scene-update      --color 1d76db --description "壁纸更新（表单）"
gh label create widget-submission --color 0e8a16 --description "插件提交（表单）"
gh label create widget-update     --color 0e8a16 --description "插件更新（表单）"
gh label create awaiting-review   --color fbca04 --description "格式检查通过，等待维护者审查"
gh label create needs-changes     --color d93f0b --description "格式检查未通过，等作者修改"
gh label create imported          --color 5319e7 --description "已合并进 main"
gh label create duplicate         --color cfd3d7 --description "同一作品的重复提交"
```

建完开一条测试 issue 走一遍：应当自动带上对应标签，几十秒内收到机器人的检查评论。

---

## 1. 第一次：生成密钥并登记公钥

在**离线机器**上：

```bash
node scripts/keygen.mjs --out ~/lull-release-keys
```

会得到 `publisher.pem`（私钥，600 权限）与 `publisher.pub.pem`，并打印一条公钥清单条目。
把那条 JSON 加进 `keys/publisher-keys.json` 的 `keys` 数组，开 PR 合并。

条目里的 `name`（发布主体）与 `label`（密钥期次，如 `folium-2026-1`）是给人看的：
作品详情页的「签名与校验」按 `keyId` 找到这条公钥，把两者拼起来显示。
不填也能验签，但页面上只能显示一串 keyId。

> 公钥清单一旦合并，这个 keyId 就成了「验收标准」。之后凡是它签的东西，
> 用户都能验；反过来，私钥丢了就只能换密钥（§3），旧密钥签过的清单要保留旧公钥才验得过，
> 所以**退役的密钥不要从清单里删**。

---

## 2. 每次：签一批发布

签名不是「每合并一个 PR 就签」，是**发布批次**：攒一批，签一次。

```bash
# ① 干净的 main 与依赖
git switch main
git pull
pnpm install

# ② 一条命令：校验 → 重新打包 → 签名 → 验签
pnpm release --key ~/lull-release-keys/publisher.pem

# ③ 看一眼它打印的摘要（keyId、releaseSeq、条目数、总字节）与 diff
git diff --stat release/
```

> **别在一条命令里串 `&&`**。Windows PowerShell 5.1 不认 `&&`（那是 PowerShell 7 才有的），
> 会报「标记“&&”不是此版本中的有效语句分隔符」。在 5.1 里要串行用 `;`，或写成
> `pnpm build; if ($?) { pnpm sign:release --key … }`。`pnpm release` 存在的意义就是
> 把顺序收进脚本，省掉这个平台差异——它内部跑的是 `content:check → build:catalog → sign → verify`。
>
> 另外 `~` 只有 bash 会展开：`pnpm release --key '~/x.pem'` 在 PowerShell 里是字面量，
> 脚本已经替你展开；路径带空格时记得加引号。

只签名、不重新打包时（产物已经是最新的）：

```bash
pnpm sign:release --key ~/lull-release-keys/publisher.pem
pnpm verify:release
```

脚本内部顺序（顺序错了签名就白签）：

1. 拒绝 CI 环境、拒绝仓库内的私钥路径；
2. 读 `site/src/generated/catalog.json` 与 `site/public/downloads/*`，逐项算 zip 的 sha256；
3. `releaseSeq` = 上一版 +1；
4. **手写**规范化 JSON 文本（键序、缩进、换行写死，不靠 `JSON.stringify`）；
5. 对这段字节做 Ed25519，写 `release/release.json.sig`（单行 base64）；
6. 立刻用公钥自验一次——签坏了当场知道。

提交 `release/release.json` 与 `release/release.json.sig`。**建议开 PR**：签名也值得被第二个人核对一眼。

> `pnpm release` 会在签完之后再生成一次索引，这样本地 `catalog.json` 的 `release` 字段与
> 每项的 `signed` 标记就是最新状态；只跑 `sign:release` 时它们会停留在「尚未签名」。

合并后 `deploy.yml` 会跑 `pnpm verify:release`，验签通过才发布。

---

## 3. 轮换

1. `keygen` 生成新密钥（不要覆盖旧私钥文件）；
2. 把新公钥条目加进清单，`notBefore` 写未来的日期；
3. 旧条目填 `retiredAt`（不要删、不要 `revoked`——删了它签过的历史清单就验不过了）；
4. 用新密钥签一次，让当前清单由新密钥签署；
5. 合并。此后所有新签名都用新 keyId。

**撤销**（`revoked: true`）只在「私钥确认泄漏」时用：它对 CI 与站点展示立即生效，
但**对已内置公钥的客户端不生效**——离线内置公钥的代价就是撤销慢，只能随客户端版本更新。
所以撤销必须配合一次轮换。

---

## 4. 私钥泄漏了怎么办

按这个顺序，别跳步：

1. **立刻**把该 `keyId` 标成 `revoked: true` 并合并——CI 与站点会立刻拒绝它签的东西；
2. 生成新密钥、登记、用新密钥重签当前批次（`releaseSeq` 继续递增）；
3. 在仓库开一个 issue 说明发生了什么（泄漏时间、可能的范围），保留记录；
4. 检查这段时间内 `main` 上是否有不该出现的改动；
5. 通知用户：在客户端内置新公钥之前，旧 keyId 的签名仍会显示为「已发布」，
   这一点必须说清楚，不能装作已经失效。

---

## 5. 常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `检测到 CI 环境` | 在 Actions 里跑了签名 | 签名只能在离线机器上做 |
| `私钥不能放在仓库目录里` | 私钥路径在仓库内 | 移出去，仓库只放公钥 |
| `公钥清单里没有 keyId …` | 新密钥还没登记就签了 | 先把公钥加进 `keys/publisher-keys.json` |
| `验签失败 V4` | 签名之后改了 zip | 还原 zip，或重新签一批 |
| `[V6] … 还没进签名清单` | 合并了新内容但没重签 | 正常，重签一次即可；不阻断部署 |
| `[V7] releaseSeq 没有递增` | 把旧清单贴回来了 | 重新签，不要手改清单 |

---

## 6. 不要做的事

- 不要手工编辑 `release/release.json`：签名会对不上，而且下次签名会整段重写。
- 不要把签名文件放进 `package/`：会改摘要（自己签自己），还会下发到用户机器。
- 不要把私钥贴进 issue、聊天、CI secret 或任何云端。
- 不要在文档里把发布签名说成「作者认证」或「官方认证」：它只代表 community 发布了这批字节。
