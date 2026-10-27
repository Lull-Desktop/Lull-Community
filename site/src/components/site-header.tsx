"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import ShinyText from "@/components/react-bits/ShinyText";
import { SearchDialog } from "@/components/search-dialog";
import { buttonVariants } from "@/components/ui/button";
import { asset, catalog } from "@/lib/catalog";

/** Lull 客户端主站（社区入口），站外链接。 */
const LULL_SITE_URL = "https://lull-desktop.github.io/Lull/";

const NAV: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "首页" },
  { href: "/scenes", label: "壁纸" },
  { href: "/widgets", label: "工具" },
  { href: "/submit", label: "提交作品" },
  { href: LULL_SITE_URL, label: "Lull App", external: true },
];

/**
 * 月亮字标：直接复用站点图标 `public/favicon.svg`，不再内联一份 SVG。
 * 走 `asset()` 拼 basePath——GitHub Pages 是项目站点，资源在 `/<repo>/` 下。
 */
function Mark() {
  return (
    <img
      src={asset("/favicon.svg")}
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      decoding="async"
      className="block size-6 shrink-0"
    />
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-void/75 backdrop-blur-[14px] backdrop-saturate-150">
        <div className="shell flex h-16 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-baseline gap-2.5">
            <span className="self-center">
              <Mark />
            </span>
            {/* 悬浮时一道苔绿反光扫过，用 React Bits 的 ShinyText */}
            <ShinyText
              text="Lull"
              color="#e6eee4"
              shineColor="#c8e0b6"
              speed={2.2}
              shineWidth={55}
              trigger="hover"
              className="font-serif text-[0.9rem] uppercase tracking-[0.42em] text-mist max-[380px]:hidden"
            />
            <span className="text-[10.5px] tracking-[0.18em] text-faint uppercase">Community</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] text-muted transition-colors hover:bg-primary/[0.06] hover:text-ink"
                >
                  {item.label}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                    className="mt-px text-faint transition-colors group-hover:text-ink-soft"
                  >
                    <path
                      d="M3.5 8.5 8.5 3.5M4.2 3.5h4.3v4.3"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-ink"
                      : "text-muted hover:bg-primary/[0.06] hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-[228px] items-center gap-2 rounded-full border border-line px-3.5 text-[12.5px] text-muted transition-colors hover:border-line-2 hover:text-ink-soft"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
              <span>搜索场景与工具…</span>
              <kbd className="ml-auto font-mono text-[10px] text-faint">⌘K</kbd>
            </button>

            <a
              href={catalog.repo.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub 仓库"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-2 hover:text-ink"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>

            <Link
              href="/submit"
              className={`${buttonVariants({ size: "sm" })} hidden sm:inline-flex`}
            >
              提交作品
            </Link>
          </div>
        </div>

        {/* 窄屏：横向可滚动的胶囊导航（桌面稿不展示，保留以不丢入口） */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line/60 px-[1.25rem] py-2 lg:hidden">
          {NAV.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1 text-[12.5px] text-muted"
              >
                {item.label}
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-faint">
                  <path
                    d="M3.5 8.5 8.5 3.5M4.2 3.5h4.3v4.3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-1 text-[12.5px] ${
                  isActive(item.href) ? "bg-primary/10 text-ink" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      </header>

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </>
  );
}
