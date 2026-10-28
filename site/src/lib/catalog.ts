import catalogJson from "@/generated/catalog.json";

export type ItemKind = "scene" | "widget";

export type SceneParam = {
  key: string;
  type: "number" | "boolean" | "string" | "color" | "enum";
  label: string;
  description?: string;
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
};

export type CatalogItem = {
  kind: ItemKind;
  slug: string;
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  capabilities: string[];
  tags: string[];
  featured: boolean;
  addedAt: string;
  preview: string;
  screenshots: string[];
  download: string;
  downloadBytes: number;
  /** 站点上这份 zip 的 sha256：用户下载后可以自己复算核对。 */
  zipSha256: string;
  packageBytes: number;
  fileCount: number;
  integrity: string;
  entry: string;
  readme: string;
  authorUrl: string | null;
  homepage: string | null;
  sourcePath: string;
  /** community.json 里登记的来源仓库；PR 投稿或未登记时为 null。 */
  source: string | null;
  sourceCommit: string | null;
  submission: number | null;
  owners: string[] | null;
  /** 是否被 community 发布签名覆盖（同 id、同版本、同摘要）。只用于展示来源，不影响安装。 */
  signed: boolean;
  licensePath: string | null;
  theme: { background: string; accent: string } | null;
  performance: { tier: string; targetFps?: number } | null;
  compatibility: { hostApi: number; platforms?: string[] } | null;
  params: SceneParam[] | null;
  window: {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    resizable?: boolean;
    transparent?: boolean;
    chrome?: string;
  } | null;
  lifecycle: string | null;
  network: string[] | null;
};

export type ReleaseInfo = {
  keyId: string | null;
  /** 公钥清单里登记的人可读名字（如「Folium official」），未登记时 null。 */
  keyName: string | null;
  /** 密钥期次（如「folium-2026-1」），未登记时 null。 */
  keyLabel: string | null;
  releaseSeq: number | null;
  signedAt: string | null;
  url: string;
};

export type Catalog = {
  schemaVersion: number;
  generatedAt: string;
  repo: { url: string; branch: string };
  counts: { scenes: number; widgets: number };
  /** null = 还没有发布签名；站点上所有作品都会标成「来源未验证」。 */
  release: ReleaseInfo | null;
  items: CatalogItem[];
};

/**
 * 索引由 `scripts/build-catalog.mjs` 生成，仓库里不入库。
 * 因此 `pnpm dev` / `pnpm build` 都会先跑一遍生成脚本。
 */
export const catalog = catalogJson as unknown as Catalog;

/** GitHub Pages 项目站点需要给 public/ 下的静态资源手动加前缀。 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${basePath}${path}`;
}

export function itemHref(item: Pick<CatalogItem, "kind" | "slug">): string {
  return `/${item.kind === "scene" ? "scenes" : "widgets"}/${item.slug}`;
}

export function itemSourceUrl(item: CatalogItem): string {
  return `${catalog.repo.url}/tree/${catalog.repo.branch}/${item.sourcePath}`;
}

export function itemDownloadUrl(item: CatalogItem): string {
  return asset(item.download);
}

export function scenes(): CatalogItem[] {
  return catalog.items.filter((item) => item.kind === "scene");
}

export function widgets(): CatalogItem[] {
  return catalog.items.filter((item) => item.kind === "widget");
}

export function findItem(kind: ItemKind, slug: string): CatalogItem | undefined {
  return catalog.items.find((item) => item.kind === kind && item.slug === slug);
}

export function kindLabel(kind: ItemKind): string {
  return kind === "scene" ? "壁纸" : "工具";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function formatDate(iso: string): string {
  return iso.replaceAll("-", ".");
}
