import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind 类名。
 *
 * 站点里 `.tsx` 的样式一律走 Tailwind 工具类，遇到「调用方要覆盖组件默认值」时，
 * 必须经过 `cn()`——否则 `p-8` 与 `p-0` 谁生效取决于生成顺序。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
