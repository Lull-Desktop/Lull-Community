import type { Metadata } from "next";

import { LegacyKindRedirect } from "@/components/legacy-kind-redirect";
import { kindFilterHref, kindLabel } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "正在跳转",
  description: "场景列表已经合并到组件市场页。",
  robots: { index: false, follow: false },
};

/** `/scenes` 不再单独渲染列表，只负责把旧链接带到合并后的类型筛选。 */
export default function ScenesRedirectPage() {
  return (
    <LegacyKindRedirect href={kindFilterHref("scene")} label={kindLabel("scene")} />
  );
}
