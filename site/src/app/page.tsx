import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { CatalogTeaser, HowItWorks } from "@/components/home-sections";
import { asset, catalog, formatBytes, itemHref } from "@/lib/catalog";

export default function HomePage() {
  const items = catalog.items;
  const featured = items.filter((item) => item.featured);
  const hero = featured[0] ?? items[0];
  const showcase = (featured.length > 1 ? featured.slice(1) : []).concat(
    items.filter((item) => item !== hero && !item.featured),
  ).slice(0, 5);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-night text-white">
        {hero && (
          <img
            src={asset(hero.preview)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[center_72%] opacity-75"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(110%_110%_at_50%_-15%,rgba(10,36,31,0.45),transparent_62%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-night/10" />

        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-accent-soft/60">
            lull community
          </p>

          <h1 className="mt-6 max-w-2xl text-[clamp(1.9rem,4.6vw,3.3rem)] font-semibold leading-[1.16] tracking-[-0.02em]">
            给安静的桌面
            <br />
            添一点会动的东西
          </h1>

          <p className="mt-6 max-w-xl text-[14.5px] leading-relaxed text-white/65">
            Lull 的第三方壁纸场景与桌面工具。每个作品都是一个可以直接安装的 zip，
            清单、许可与所需能力都写在包内，装之前就能看清它会碰什么。
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/scenes"
              className="rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              浏览壁纸
            </Link>
            <Link
              href="/widgets"
              className="rounded-full border border-white/25 px-5 py-2.5 text-[13.5px] text-white/85 transition-colors hover:border-white/50 hover:text-white"
            >
              浏览工具
            </Link>
            <Link
              href="/submit"
              className="px-1 text-[13.5px] text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
            >
              提交你的作品
            </Link>
          </div>

          <dl className="mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              { label: "壁纸场景", value: catalog.counts.scenes },
              { label: "桌面工具", value: catalog.counts.widgets },
              { label: "数据库", value: 0 },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-[11.5px] tracking-wide text-white/45">{stat.label}</dt>
                <dd className="mt-1 font-mono text-[1.35rem] leading-none text-white/90">
                  {String(stat.value).padStart(2, "0")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                collection
              </p>
              <h2 className="mt-3 text-[1.5rem] font-semibold tracking-tight">社区作品</h2>
            </div>
            <Link href="/scenes" className="text-[13px] text-accent hover:underline">
              全部作品 →
            </Link>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.map((item, index) => (
              <ItemCard key={`${item.kind}-${item.slug}`} item={item} priority={index < 3} />
            ))}
          </div>
        </section>
      )}

      {hero && (
        <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
          <div className="grid items-center gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-8 md:grid-cols-[1.15fr_1fr]">
            <div className="overflow-hidden rounded-2xl bg-night">
              <img
                src={asset(hero.preview)}
                alt={`${hero.name} 预览`}
                className="aspect-[16/9] h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                本期精选
              </p>
              <h2 className="mt-3 text-[1.35rem] font-semibold tracking-tight">{hero.name}</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{hero.description}</p>
              <dl className="mt-5 grid grid-cols-2 gap-y-2.5 text-[12.5px]">
                <dt className="text-muted">作者</dt>
                <dd>{hero.author}</dd>
                <dt className="text-muted">许可</dt>
                <dd>{hero.license}</dd>
                <dt className="text-muted">包大小</dt>
                <dd className="font-mono">{formatBytes(hero.downloadBytes)}</dd>
                <dt className="text-muted">版本</dt>
                <dd className="font-mono">v{hero.version}</dd>
              </dl>
              <Link
                href={itemHref(hero)}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-transform hover:-translate-y-0.5"
              >
                查看详情与下载
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="mt-20">
        <CatalogTeaser />
      </div>

      <div className="mt-20">
        <HowItWorks />
      </div>
    </>
  );
}
