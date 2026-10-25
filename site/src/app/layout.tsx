import type { Metadata, Viewport } from "next";

import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: "Lull Community · 壁纸与桌面工具",
    template: "%s · Lull Community",
  },
  description:
    "Lull 的第三方社区：浏览、下载、提交动态壁纸场景与桌面工具。内容托管在 GitHub 仓库，合并后自动校验与发布。",
  applicationName: "Lull Community",
  authors: [{ name: "Lull Community" }],
  openGraph: {
    title: "Lull Community",
    description: "第三方壁纸场景与桌面工具，内容即仓库，合并即发布。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
