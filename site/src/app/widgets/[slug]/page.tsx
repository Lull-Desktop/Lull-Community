import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/item-detail";
import { findItem, widgets } from "@/lib/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return widgets().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = findItem("widget", slug);
  if (!item) return { title: "工具不存在" };
  return {
    title: item.name,
    description: item.description,
    openGraph: {
      title: `${item.name} · Lull 桌面工具`,
      description: item.description,
    },
  };
}

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findItem("widget", slug);
  if (!item) notFound();
  return <ItemDetail item={item} />;
}
