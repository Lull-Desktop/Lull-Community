import Link from "next/link";

import { catalog } from "@/lib/catalog";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/scenes", label: "壁纸" },
  { href: "/widgets", label: "工具" },
  { href: "/submit", label: "提交作品" },
];

function Mark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="text-accent">
            <Mark />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Lull<span className="text-muted font-normal"> Community</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-[13.5px]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={catalog.repo.url}
          target="_blank"
          rel="noreferrer noopener"
          className="hidden items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-accent hover:text-accent sm:inline-flex"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          GitHub
        </a>
      </div>
    </header>
  );
}
