import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-28 sm:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">404</p>
      <h1 className="mt-3 text-[1.6rem] font-semibold tracking-tight">这个页面不在了</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
        可能是作品改名或撤回了。站内所有页面都在构建时生成，删掉的作品不会留下空壳。
      </p>
      <div className="mt-7 flex gap-3">
        <Link
          href="/scenes"
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper"
        >
          浏览壁纸
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line-strong px-4 py-2 text-[13px] text-ink-soft hover:border-accent hover:text-accent"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
