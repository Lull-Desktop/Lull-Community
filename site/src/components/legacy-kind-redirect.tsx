"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";

/**
 * 旧分类页的静态跳转壳。
 *
 * 站点是 `output: "export"`，托管在 GitHub Pages 上，不能下发 HTTP 3xx；
 * 所以这里用 `router.replace` 做客户端替换（不留下历史记录），
 * 同时保留一个可见链接，供禁用 JavaScript 或脚本加载失败时手动进入。
 */
export function LegacyKindRedirect({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <div className="shell py-24">
      <div className="mx-auto flex min-h-[40vh] max-w-xl flex-col items-start justify-center">
        <p className="eyebrow">redirect</p>
        <h1 className="mt-3 text-[1.6rem] font-normal tracking-[-0.02em]">正在前往组件市场</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {label}分类已经并入统一的作品列表，正在自动跳转。
        </p>
        <Link href={href} className={`${buttonVariants()} mt-6`}>
          立即前往
        </Link>
      </div>
    </div>
  );
}
