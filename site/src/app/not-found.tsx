import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-28 sm:px-8">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-0.02em]">这个页面不在了</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        可能是作品改名或撤回了。站内所有页面都在构建时生成，删掉的作品不会留下空壳。
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          浏览组件市场
        </Link>
        <Link href="/submit" className={buttonVariants({ variant: "ghost" })}>
          提交作品
        </Link>
      </div>
    </div>
  );
}
