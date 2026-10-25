import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/item-detail";
import { findItem, scenes } from "@/lib/catalog";

/** 静态导出：所有详情页在构建时就要存在，不在用户访问时临时生成。 */
export const dynamicParams = false;

export function generateStaticParams() {
  return scenes().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = findItem("scene", slug);
  if (!item) return { title: "场景不存在" };
  return {
    title: item.name,
    description: item.description,
    openGraph: {
      title: `${item.name} · Lull 壁纸场景`,
      description: item.description,
    },
  };
}

export default async function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findItem("scene", slug);
  if (!item) notFound();
  return <ItemDetail item={item} />;
}
