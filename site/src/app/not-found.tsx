import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-28 sm:px-8">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-[1.7rem] font-normal tracking-[-0.02em]">这个页面不在了</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        可能是作品改名或撤回了。站内所有页面都在构建时生成，删掉的作品不会留下空壳。
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/scenes" className={buttonVariants()}>
          浏览壁纸
        </Link>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          回到首页
        </Link>
      </div>
    </div>
  );
}
