import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { panelVariants } from "@/components/ui/panel";
import { capabilityInfo, LEVEL_STYLE } from "@/lib/capabilities";
import {
  asset,
  catalog,
  formatBytes,
  formatDate,
  itemDownloadUrl,
  itemSourceUrl,
  kindLabel,
  type CatalogItem,
} from "@/lib/catalog";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

function Masthead({ item }: { item: CatalogItem }) {
  const categoryHref = item.kind === "scene" ? "/scenes" : "/widgets";

  return (
    <div>
      <nav className="flex items-center gap-2 text-[11.5px] text-muted" aria-label="位置">
        <Link href="/" className="transition-colors hover:text-ink">
          首页
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={categoryHref} className="transition-colors hover:text-ink">
          {kindLabel(item.kind)}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-soft">{item.name}</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-accent">
              {kindLabel(item.kind)}
            </span>
            <span className="rounded-md border border-line-2 px-2 py-0.5 font-mono text-[10.5px] text-ink-soft">
              v{item.version}
            </span>
            <span className="rounded-md border border-line-2 px-2 py-0.5 font-mono text-[10.5px] text-ink-soft">
              {item.license}
            </span>
            {item.featured && (
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10.5px] text-primary ring-1 ring-inset ring-primary/30">
                精选
              </span>
            )}
            {/* 只表示「这批字节由 community 发布」，不代表作者身份，也不影响安装与运行 */}
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10.5px]",
                item.signed
                  ? "border-[#9fc796]/40 bg-[#9fc796]/10 text-[#c8e0b6]"
                  : "border-line-2 text-faint",
              )}
              title={
                item.signed
                  ? "该版本已包含在 community 的发布签名清单里"
                  : "该版本还没有被发布签名覆盖；不影响安装与运行"
              }
            >
              {item.signed ? "已签署发布" : "来源未验证"}
            </span>
          </div>

          <h1 className="mt-3.5 text-[clamp(1.8rem,3.6vw,2.6rem)] font-normal leading-[1.18] tracking-[-0.02em]">
            {item.name}
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            {item.description}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 text-[12px] sm:items-end">
          <p className="text-muted">
            作者{" "}
            {item.authorUrl ? (
              <a
                href={item.authorUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink transition-colors hover:text-accent"
              >
                {item.author}
              </a>
            ) : (
              <span className="text-ink">{item.author}</span>
            )}
          </p>
          <p className="text-muted">
            收录于 <span className="font-mono text-ink-soft">{formatDate(item.addedAt)}</span>
          </p>
          <a
            href={itemSourceUrl(item)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent transition-opacity hover:opacity-80"
          >
            查看源码 →
          </a>
        </div>
      </div>
    </div>
  );
}

function InstallCard({ item }: { item: CatalogItem }) {
  return (
    <div className={cn(panelVariants(), "p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ink">下载内容包</p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {formatBytes(item.downloadBytes)} · {item.fileCount} 个文件
          </p>
        </div>
        <a
          href={itemDownloadUrl(item)}
          download
          className={buttonVariants({ size: "sm" })}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          下载 ZIP
        </a>
      </div>

      <ol className="mt-5 space-y-2.5 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-soft">
        <li className="flex gap-2.5">
          <span className="font-mono text-line-2">01</span>
          打开 Lull 设置 → 扩展 → 「从文件安装」，选择刚下载的 zip。
        </li>
        <li className="flex gap-2.5">
          <span className="font-mono text-line-2">02</span>
          {item.kind === "scene"
            ? "安装后到「壁纸 → 场景」里选择它。壁纸包不执行脚本，装完直接生效。"
            : "启用前会列出它申请的能力；确认后点「打开」才会创建窗口。"}
        </li>
        <li className="flex gap-2.5">
          <span className="font-mono text-line-2">03</span>
          卸载在扩展中心里完成；scene 被壁纸引用时会先提示切换场景。
        </li>
      </ol>
    </div>
  );
}

function CapabilitySection({ item }: { item: CatalogItem }) {
  if (item.capabilities.length === 0) {
    return (
      <section>
        <h2 className="text-[14.5px] font-medium tracking-tight text-ink">能力与权限</h2>
        <p className="mt-2 text-[12.5px] text-muted">未申请任何能力。</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-[14.5px] font-medium tracking-tight text-ink">能力与权限</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        清单里声明的能力，
        {item.kind === "widget" ? "启用时由用户逐项确认" : "决定宿主放开哪种运行环境"}。
        「硬约束」是宿主真正能拦住的部分，「软约束」只是产品策略。
      </p>

      <ul className="mt-4 space-y-2">
        {item.capabilities.map((capability) => {
          const info = capabilityInfo(capability);
          return (
            <li
              key={capability}
              className="rounded-xl border border-line bg-panel/60 px-4 py-3 transition-colors hover:border-line-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-[11.5px] text-[#c8e0b6]">{capability}</code>
                <span className="text-[12px] text-ink-soft">{info.label}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${LEVEL_STYLE[info.level]}`}
                >
                  {info.level}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{info.detail}</p>
            </li>
          );
        })}
      </ul>

      {item.network && item.network.length > 0 && (
        <div className="mt-2 rounded-xl border border-line bg-panel/60 px-4 py-3">
          <p className="text-[12px] font-medium text-ink">允许访问的网络源</p>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-ink-soft">
            {item.network.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SpecsSection({ item }: { item: CatalogItem }) {
  const rows: { label: string; value: string }[] = [
    { label: "id", value: item.id },
    { label: "入口文件", value: item.entry },
  ];

  if (item.kind === "scene") {
    if (item.theme) {
      rows.push({ label: "主题色", value: `${item.theme.background} / ${item.theme.accent}` });
    }
    if (item.performance) {
      rows.push({
        label: "性能档位",
        value: `${item.performance.tier}${item.performance.targetFps ? ` · ${item.performance.targetFps}fps` : ""}`,
      });
    }
    if (item.compatibility) {
      rows.push({ label: "宿主 API", value: `>= ${item.compatibility.hostApi}` });
      if (item.compatibility.platforms) {
        rows.push({ label: "平台", value: item.compatibility.platforms.join(" / ") });
      }
    }
  } else if (item.window) {
    rows.push({
      label: "窗口",
      value:
        `${item.window.width}×${item.window.height}` +
        (item.window.chrome ? ` · ${item.window.chrome === "custom" ? "自绘顶栏" : "宿主顶栏"}` : "") +
        (item.window.transparent ? " · 透明" : ""),
    });
    if (item.lifecycle) {
      rows.push({
        label: "关闭行为",
        value: item.lifecycle === "suspend" ? "销毁窗口，下次冷启动" : "隐藏窗口，后台继续运行",
      });
    }
  }

  return (
    <section>
      <h2 className="text-[14.5px] font-medium tracking-tight text-ink">包信息</h2>
      <dl className="mt-3 overflow-hidden rounded-xl border border-line">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`grid grid-cols-[7rem_1fr] gap-3 px-4 py-2.5 text-[12px] ${
              index % 2 === 0 ? "bg-panel/60" : "bg-panel/25"
            }`}
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="break-all font-mono text-[11px] text-ink-soft">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * 签名时间只按 UTC 显示：静态导出在构建机上跑，用本地时区会让同一份内容
 * 在不同机器上渲出不同文字。
 */
function formatUtcMinute(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return match ? `${match[1]}.${match[2]}.${match[3]} ${match[4]}:${match[5]} UTC` : iso;
}

/**
 * 签名与校验：四行机器可核对的事实。
 * 措辞只到「这批字节是不是发布者发的」为止——不写成安全背书，也不暗示作者身份。
 */
function SignatureSection({ item }: { item: CatalogItem }) {
  const release = catalog.release;
  const keyId = release?.keyId ?? null;
  /** 公钥清单里登记的人可读名；没登记就退回 keyId，不编名字。 */
  const keyName = release ? [release.keyName, release.keyLabel].filter(Boolean).join(" ") : "";

  const rows: { label: string; value: string; note?: string }[] = [
    {
      label: "签名密钥",
      value: item.signed ? (keyName || keyId || "—") : "—",
      // 有名字时才补一行 keyId：否则它已经在值里，重复显示只是噪音
      note: item.signed && keyName && keyId ? `keyId ${keyId}` : undefined,
    },
    {
      label: "签名时间",
      value: item.signed && release?.signedAt ? formatUtcMinute(release.signedAt) : "—",
    },
    {
      label: "签名摘要",
      // 每个包自己的内容摘要：签名清单里登记的就是它，安装器复算的也是它
      value: item.integrity,
    },
    // 这一行不依赖签名：任何一次构建都能给出这份 zip 的字节摘要
    { label: "文件 SHA-256", value: item.zipSha256 },
  ];

  return (
    <section>
      <h2 className="text-[14.5px] font-medium tracking-tight text-ink">签名与校验</h2>
      <dl className="mt-3 overflow-hidden rounded-xl border border-line">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`grid grid-cols-[7rem_1fr] gap-3 px-4 py-2.5 text-[12px] ${
              index % 2 === 0 ? "bg-panel/60" : "bg-panel/25"
            }`}
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="min-w-0">
              <span
                className={cn(
                  "break-all font-mono text-[11px]",
                  row.value === "—" ? "text-faint" : "text-ink-soft",
                )}
              >
                {row.value}
              </span>
              {row.note && <span className="mt-0.5 block font-mono text-[10px] text-faint">{row.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {item.signed ? (
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
          签名清单{" "}
          <a
            href={asset(release?.url ?? "/release/release.json")}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-accent hover:underline"
          >
            release/release.json
          </a>
          {release?.releaseSeq ? `（第 ${release.releaseSeq} 批）` : ""}
          里为这个包登记的就是上面的签名摘要，安装器会按同一算法复算并拒绝被改过的包。
          签名只说明这批文件由发布者发出，
          <span className="text-ink-soft">不证明作者是谁</span>
          ，也不参与安装与运行；文件 SHA-256 是下载 zip 的字节摘要，与包摘要是两层。
        </p>
      ) : (
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
          这个版本不在签名清单里，所以没有签名密钥与签名时间。
          签名摘要是构建时算出的包摘要，安装器会复算并拒绝被改过的包；
          文件 SHA-256 用于核对下载的 zip 有没有在传输中被改。
        </p>
      )}
    </section>
  );
}

function ParamsSection({ item }: { item: CatalogItem }) {
  if (!item.params || item.params.length === 0) return null;

  return (
    <section>
      <h2 className="text-[14.5px] font-medium tracking-tight text-ink">可调参数</h2>
      <p className="mt-2 text-[12.5px] text-muted">在 Lull 的壁纸设置里调整，改完即时生效。</p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[28rem] border-collapse text-[12px]">
          <thead>
            <tr className="bg-white/[0.04] text-left text-[10.5px] uppercase tracking-[0.12em] text-muted">
              <th className="px-3.5 py-2 font-medium">参数</th>
              <th className="px-3.5 py-2 font-medium">类型</th>
              <th className="px-3.5 py-2 font-medium">默认</th>
              <th className="px-3.5 py-2 font-medium">范围</th>
            </tr>
          </thead>
          <tbody>
            {item.params.map((param) => {
              const range =
                param.type === "enum"
                  ? (param.options ?? []).map((option) => option.label).join(" / ")
                  : param.min !== undefined && param.max !== undefined
                    ? `${param.min} – ${param.max}${param.step ? `（步进 ${param.step}）` : ""}`
                    : "—";
              return (
                <tr key={param.key} className="border-t border-line">
                  <td className="px-3.5 py-2.5">
                    <span className="text-ink">{param.label}</span>
                    <code className="ml-2 font-mono text-[10px] text-muted">{param.key}</code>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-ink-soft">{param.type}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-ink-soft">
                    {JSON.stringify(param.default)}
                  </td>
                  <td className="px-3.5 py-2.5 text-ink-soft">{range}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** 场景与工具详情页共用：结构相同，只有少数条目按 kind 显示。 */
export function ItemDetail({ item }: { item: CatalogItem }) {
  return (
    <div className="relative">
      {/* 顶部环境光：壁纸直接用自己的画面，工具用一层紫光（截图当背景会把界面文字放大成噪点） */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        {item.kind === "scene" ? (
          <img
            src={asset(item.preview)}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-110 object-cover object-center opacity-[0.18] blur-[14px]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(55%_90%_at_22%_0%,rgba(159,191,150,0.22),transparent_66%),radial-gradient(45%_80%_at_86%_4%,rgba(224,168,120,0.14),transparent_70%)]" />
        )}
        <div className="grid-lines absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/80 to-void" />
      </div>

      <div className="shell py-10">
        <Masthead item={item} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/12 shadow-[0_40px_90px_-50px_rgba(159,191,150,0.85)]">
              <img
                src={asset(item.preview)}
                alt={`${item.name} 预览`}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>

            {item.screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {item.screenshots.map((shot, index) => (
                  <img
                    key={shot}
                    src={asset(shot)}
                    alt={`${item.name} 截图 ${index + 1}`}
                    className="aspect-[16/10] w-full rounded-xl ring-1 ring-white/10 object-cover"
                  />
                ))}
              </div>
            )}

            <div className="mt-8 space-y-8">
              <div className="lg:hidden">
                <InstallCard item={item} />
              </div>
              <CapabilitySection item={item} />
              <SpecsSection item={item} />
              <SignatureSection item={item} />
              <ParamsSection item={item} />

              {item.readme && (
                <section>
                  <h2 className="text-[14.5px] font-medium tracking-tight text-ink">作品说明</h2>
                  <div
                    className="prose-lull mt-3"
                    // README 在构建时用 markdown-it 渲染，且关闭了裸 HTML，不含用户注入的标签
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(item.readme) }}
                  />
                </section>
              )}

              {item.tags.length > 0 && (
                <section>
                  <h2 className="text-[14.5px] font-medium tracking-tight text-ink">标签</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="hidden lg:block">
              <InstallCard item={item} />
            </div>

            <div className="rounded-2xl border border-line bg-panel/50 p-4">
              <p className="text-[12.5px] font-medium text-ink">许可与署名</p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                作品以 <span className="font-mono text-ink-soft">{item.license}</span> 发布，
                署名 <span className="text-ink-soft">{item.author}</span>。
                转载或二次分发请保留署名与许可声明。
              </p>
              {item.homepage && (
                <a
                  href={item.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2.5 block text-[12px] text-accent hover:underline"
                >
                  作品主页 →
                </a>
              )}
              <a
                href={itemSourceUrl(item)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2.5 block text-[12px] text-accent hover:underline"
              >
                仓库目录与清单 →
              </a>
              {item.licensePath && (
                <a
                  href={`${catalog.repo.url}/blob/${catalog.repo.branch}/${item.licensePath}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2.5 block text-[12px] text-accent hover:underline"
                >
                  许可原文（{item.license}）→
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-panel/50 p-4">
              <p className="text-[12.5px] font-medium text-ink">来源</p>
              {item.source ? (
                <>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">
                    提交自{" "}
                    <a
                      href={item.source}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent hover:underline"
                    >
                      {item.source.replace(/^https:\/\//, "")}
                    </a>
                    {item.submission ? ` · #${item.submission}` : ""}
                  </p>
                  {item.sourceCommit && (
                    <p className="mt-1.5 font-mono text-[10.5px] text-faint">
                      审查提交 {item.sourceCommit.slice(0, 12)}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  这个作品是通过 PR 直接投稿的，没有登记外部仓库。
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-panel/40 p-4">
              <p className="text-[12.5px] font-medium text-ink">发现安全问题？</p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                内容包只能读自己的资源；工具运行在不透明源 iframe 里，能力逐项授权。
                仍然发现问题请开 issue 并标注作品 id。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
