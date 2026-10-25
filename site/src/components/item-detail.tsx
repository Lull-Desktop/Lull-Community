import Link from "next/link";

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

function Masthead({ item }: { item: CatalogItem }) {
  const categoryHref = item.kind === "scene" ? "/scenes" : "/widgets";

  return (
    <div className="border-b border-line pb-7">
      <nav className="flex items-center gap-2 text-[12px] text-muted" aria-label="位置">
        <Link href="/" className="hover:text-accent">
          首页
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={categoryHref} className="hover:text-accent">
          {kindLabel(item.kind)}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-soft">{item.name}</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-medium text-accent-deep">
              {kindLabel(item.kind)}
            </span>
            <span className="font-mono text-[11.5px] text-muted">v{item.version}</span>
            <span className="font-mono text-[11.5px] text-muted">·</span>
            <span className="text-[11.5px] text-muted">{item.license}</span>
          </div>
          <h1 className="mt-3 text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em]">
            {item.name}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
            {item.description}
          </p>
        </div>

        <div className="flex flex-col items-start gap-1.5 text-[12.5px] sm:items-end">
          <p className="text-muted">
            作者{" "}
            {item.authorUrl ? (
              <a
                href={item.authorUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink hover:text-accent"
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
            className="text-accent hover:underline"
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
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-semibold">下载内容包</p>
          <p className="mt-1 font-mono text-[11.5px] text-muted">
            {formatBytes(item.downloadBytes)} · {item.fileCount} 个文件
          </p>
        </div>
        <a
          href={itemDownloadUrl(item)}
          download
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-transform hover:-translate-y-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          下载 ZIP
        </a>
      </div>

      <ol className="mt-5 space-y-2.5 border-t border-line pt-4 text-[12.5px] text-ink-soft">
        <li className="flex gap-2.5">
          <span className="font-mono text-line-strong">01</span>
          打开 Lull 设置 → 扩展 → 「从文件安装」，选择刚下载的 zip。
        </li>
        <li className="flex gap-2.5">
          <span className="font-mono text-line-strong">02</span>
          {item.kind === "scene"
            ? "安装后到「壁纸 → 场景」里选择它。壁纸包不执行脚本，装完直接生效。"
            : "启用前会列出它申请的能力；确认后点「打开」才会创建窗口。"}
        </li>
        <li className="flex gap-2.5">
          <span className="font-mono text-line-strong">03</span>
          卸载在扩展中心里完成；scene 被壁纸引用时会先提示切换场景。
        </li>
      </ol>

      <details className="mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer text-[11.5px] text-muted hover:text-ink">
          包摘要（sha256）
        </summary>
        <p className="mt-2 break-all rounded-lg bg-paper-deep p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-soft">
          {item.integrity}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          摘要只证明「下载到的文件与发布时一致」，不是作者签名。安装器会复算并拒绝被改过的包。
        </p>
      </details>
    </div>
  );
}

function CapabilitySection({ item }: { item: CatalogItem }) {
  if (item.capabilities.length === 0) {
    return (
      <section>
        <h2 className="text-[15px] font-semibold tracking-tight">能力与权限</h2>
        <p className="mt-2 text-[13px] text-muted">未申请任何能力。</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-[15px] font-semibold tracking-tight">能力与权限</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        清单里声明的能力，{item.kind === "widget" ? "启用时由用户逐项确认" : "决定宿主放开哪种运行环境"}。
        「硬约束」是宿主真正能拦住的部分，「软约束」只是产品策略。
      </p>

      <ul className="mt-4 space-y-2.5">
        {item.capabilities.map((capability) => {
          const info = capabilityInfo(capability);
          return (
            <li key={capability} className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-[12px] text-ink">{capability}</code>
                <span className="text-[12.5px] text-ink-soft">{info.label}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10.5px] ${LEVEL_STYLE[info.level]}`}
                >
                  {info.level}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{info.detail}</p>
            </li>
          );
        })}
      </ul>

      {item.network && item.network.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-[12.5px] font-medium">允许访问的网络源</p>
          <ul className="mt-2 space-y-1 font-mono text-[11.5px] text-ink-soft">
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
      rows.push({
        label: "宿主 API",
        value: `>= ${item.compatibility.hostApi}`,
      });
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
      <h2 className="text-[15px] font-semibold tracking-tight">包信息</h2>
      <dl className="mt-3 overflow-hidden rounded-xl border border-line">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5 text-[12.5px] ${
              index % 2 === 0 ? "bg-surface" : "bg-paper"
            }`}
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="break-all font-mono text-[11.5px] text-ink-soft">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ParamsSection({ item }: { item: CatalogItem }) {
  if (!item.params || item.params.length === 0) return null;

  return (
    <section>
      <h2 className="text-[15px] font-semibold tracking-tight">可调参数</h2>
      <p className="mt-2 text-[12.5px] text-muted">
        在 Lull 的壁纸设置里调整，改完即时生效。
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[28rem] border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-paper-deep text-left text-[11.5px] text-muted">
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
                    <code className="ml-2 font-mono text-[10.5px] text-muted">{param.key}</code>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11.5px] text-ink-soft">{param.type}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[11.5px] text-ink-soft">
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
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Masthead item={item} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-line bg-night">
            <img
              src={asset(item.preview)}
              alt={`${item.name} 预览`}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>

          {item.screenshots.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {item.screenshots.map((shot, index) => (
                <img
                  key={shot}
                  src={asset(shot)}
                  alt={`${item.name} 截图 ${index + 1}`}
                  className="aspect-[16/10] w-full rounded-xl border border-line object-cover"
                />
              ))}
            </div>
          )}

          <div className="mt-8 space-y-9">
            <div className="lg:hidden">
              <InstallCard item={item} />
            </div>
            <CapabilitySection item={item} />
            <SpecsSection item={item} />
            <ParamsSection item={item} />

            {item.readme && (
              <section>
                <h2 className="text-[15px] font-semibold tracking-tight">作品说明</h2>
                <div
                  className="prose-lull mt-3"
                  // README 在构建时用 markdown-it 渲染，且关闭了裸 HTML，不含用户注入的标签
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(item.readme) }}
                />
              </section>
            )}

            {item.tags.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold tracking-tight">标签</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-soft"
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

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-[13px] font-semibold">许可与署名</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              作品以 <span className="font-mono text-ink-soft">{item.license}</span> 发布，
              署名 <span className="text-ink-soft">{item.author}</span>。
              转载或二次分发请保留署名与许可声明。
            </p>
            {item.homepage && (
              <a
                href={item.homepage}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block text-[12.5px] text-accent hover:underline"
              >
                作品主页 →
              </a>
            )}
            <a
              href={`${itemSourceUrl(item)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 block text-[12.5px] text-accent hover:underline"
            >
              仓库目录与清单 →
            </a>
            {item.licensePath && (
              <a
                href={`${catalog.repo.url}/blob/${catalog.repo.branch}/${item.licensePath}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 block text-[12.5px] text-accent hover:underline"
              >
                许可原文（{item.license}）→
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-paper-deep/60 p-5">
            <p className="text-[13px] font-semibold">发现安全问题？</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              内容包只能读自己的资源；工具运行在不透明源 iframe 里，能力逐项授权。
              仍然发现问题请开 issue 并标注作品 id。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
