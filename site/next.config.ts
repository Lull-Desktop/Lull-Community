import type { NextConfig } from "next";

/**
 * 静态导出 + GitHub Pages。
 *
 * 项目站点（`https://<org>.github.io/Lull-Community/`）必须设 `basePath`，
 * 否则 CSS / JS / 预览图 / 内部链接都会指向站点根，部署后整站 404。
 *
 * - CI 里自动取仓库名作为 basePath；
 * - 用自定义域名或组织根主页仓库时，把 `NEXT_PUBLIC_BASE_PATH` 显式设为空串。
 */
const onActions = process.env.GITHUB_ACTIONS === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Lull-Community";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (onActions ? `/${repoName}` : "");

const nextConfig: NextConfig = {
  output: "export",
  // 静态导出不支持服务端图片优化，图片走 public/ 原样输出
  images: { unoptimized: true },
  // 生成 `dir/index.html`，GitHub Pages 不需要额外的重写规则
  trailingSlash: true,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
