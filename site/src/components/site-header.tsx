"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SearchDialog } from "@/components/search-dialog";
import { catalog } from "@/lib/catalog";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/scenes", label: "壁纸" },
  { href: "/widgets", label: "工具" },
  { href: "/submit", label: "提交作品" },
];

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lull-mark" x1="3" y1="20" x2="21" y2="4">
          <stop stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#d946ef" />
          <stop offset="1" stopColor="#3ddcbf" />
        </linearGradient>
      </defs>
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"
        stroke="url(#lull-mark)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="17.5" cy="6.5" r="1.5" fill="#d946ef" />
    </svg>
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
      <header className="sticky top-0 z-40 border-b border-line/80 bg-void/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[15.5px] font-semibold tracking-tight text-ink">
              Lull
              <span className="ml-1.5 font-normal text-muted">Community</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                  isActive(item.href)
                    ? "bg-violet/15 text-ink shadow-[inset_0_0_0_1px_rgba(139,92,246,0.4)]"
                    : "text-muted hover:bg-white/5 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto flex h-9 items-center gap-2 rounded-full border border-line-2 bg-white/[0.03] px-3 text-[12.5px] text-muted transition-colors hover:border-violet/50 hover:text-ink sm:w-56"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">搜索壁纸与工具</span>
            <kbd className="ml-auto hidden rounded border border-line-2 px-1 py-0.5 font-mono text-[9.5px] text-muted sm:block">
              ⌘K
            </kbd>
          </button>

          <a
            href={catalog.repo.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub 仓库"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-2 text-muted transition-colors hover:border-violet/50 hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>

          <Link href="/submit" className="btn-primary hidden !px-4 !py-2 sm:inline-flex">
            上传作品
          </Link>
        </div>

        {/* 移动端：横向可滚动的胶囊导航 */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line/60 px-5 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-1 text-[12.5px] ${
                isActive(item.href)
                  ? "bg-violet/15 text-ink shadow-[inset_0_0_0_1px_rgba(139,92,246,0.4)]"
                  : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </>
  );
}
