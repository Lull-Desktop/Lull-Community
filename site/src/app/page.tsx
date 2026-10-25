import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { CatalogTeaser, Hero, HowItWorks } from "@/components/home-sections";
import { catalog, scenes, widgets } from "@/lib/catalog";

export default function HomePage() {
  const items = catalog.items;
  const featured = items.filter((item) => item.featured);
  const hero = featured[0] ?? items[0];
  // 首屏舞台已经展示过 hero，网格给一张 4 张的完整目录，四列刚好铺满
  const showcase = items.slice(0, 4);

  const filters = [
    { href: "/scenes", label: "壁纸场景", count: catalog.counts.scenes },
    { href: "/widgets", label: "桌面工具", count: catalog.counts.widgets },
  ];

  return (
    <>
      {hero && <Hero hero={hero} items={items} />}

      {/* 社区作品：全宽 4 列网格 */}
      <section className="shell pt-20">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">collection</p>
            <h2 className="mt-2.5 text-[clamp(1.65rem,2.6vw,2.1rem)] font-normal tracking-[-0.01em]">
              社区作品
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-[11.5px] font-medium text-ink">
              全部 {String(items.length).padStart(2, "0")}
            </span>
            {filters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:border-line-2 hover:text-ink"
              >
                {filter.label} {String(filter.count).padStart(2, "0")}
              </Link>
            ))}
            <Link
              href="/scenes"
              className="ml-1 text-[11.5px] font-medium text-accent hover:underline"
            >
              查看全部 →
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          {showcase.map((item, index) => (
            <ItemCard key={`${item.kind}-${item.slug}`} item={item} priority={index < 2} />
          ))}
        </div>
      </section>

      <div className="pt-14">
        <CatalogTeaser scenes={scenes()} widgets={widgets()} />
      </div>

      <div className="pt-20">
        <HowItWorks />
      </div>

      {/* 征集：主站的 .cta —— 左文案、右操作的两栏卡 */}
      <section className="shell pt-20">
        <div className="relative grid items-center gap-7 overflow-hidden rounded-3xl border border-line-2 bg-[radial-gradient(90%_120%_at_12%_0%,rgba(159,191,150,0.14),transparent_60%),radial-gradient(70%_120%_at_95%_100%,rgba(224,168,120,0.12),transparent_60%)] bg-void-2 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.4fr)_auto]">
          <div>
            <p className="eyebrow">contribute</p>
            <h2 className="mt-3 text-[clamp(1.5rem,2.4vw,1.9rem)] font-normal leading-[1.3] tracking-[-0.01em]">
              做了一张壁纸，或者一个小工具？
            </h2>
            <p className="mt-3 max-w-[52ch] text-[13px] leading-[1.85] text-muted">
              按规范放进一个目录，开一个 PR。合并之后，它会自动出现在这里，
              并且可以被任何人下载安装。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Link href="/submit" className="btn-primary">
              开始提交
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href={`${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost"
            >
              贡献指南
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
