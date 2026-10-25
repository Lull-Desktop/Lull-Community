import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { CatalogTeaser, Hero, HowItWorks, LatestFeed } from "@/components/home-sections";
import { catalog, scenes, widgets } from "@/lib/catalog";

export default function HomePage() {
  const items = catalog.items;
  const featured = items.filter((item) => item.featured);
  const hero = featured[0] ?? items[0];
  const sideA = items.find((item) => item !== hero);
  // 首屏拼贴已经展示过 hero，这里给一张 2×2 的完整目录，避免出现半行空缺
  const showcase = items.slice(0, 4);

  return (
    <>
      {hero && <Hero hero={hero} sideA={sideA} />}

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">collection</p>
                <h2 className="mt-2.5 text-[1.5rem] font-semibold tracking-[-0.02em]">
                  社区作品
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[12.5px]">
                <Link href="/scenes" className="text-muted transition-colors hover:text-fuchsia">
                  壁纸
                </Link>
                <span className="text-line-2" aria-hidden="true">
                  /
                </span>
                <Link href="/widgets" className="text-muted transition-colors hover:text-fuchsia">
                  工具
                </Link>
                <Link href="/scenes" className="text-fuchsia hover:underline">
                  全部 →
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {showcase.map((item, index) => (
                <ItemCard key={`${item.kind}-${item.slug}`} item={item} priority={index < 2} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <LatestFeed items={items.slice(0, 4)} />

            <div className="rounded-2xl border border-line bg-panel/50 p-4">
              <p className="text-[12.5px] font-medium text-ink">没有账号，也没有后台</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                作品是仓库里的目录，索引在构建时生成。所以这里没有注册、没有上传接口，
                点开任意作品都能追到它的源码与清单。
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["git", "manifest", "sha256", "pages"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-20">
        <HowItWorks />
      </div>

      <div className="mt-20">
        <CatalogTeaser scenes={scenes()} widgets={widgets()} />
      </div>

      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <div className="card-glow relative overflow-hidden px-6 py-10 text-center sm:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(60%_130%_at_50%_-20%,rgba(139,92,246,0.35),transparent_65%)]" />
          <div className="relative">
            <p className="eyebrow">contribute</p>
            <h2 className="mx-auto mt-3 max-w-lg text-[1.4rem] font-semibold leading-tight tracking-[-0.02em]">
              做了一张壁纸，或者一个小工具？
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted">
              按规范放进一个目录，开一个 PR。合并之后，它会自动出现在这里，
              并且可以被任何人下载安装。
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </section>
    </>
  );
}
