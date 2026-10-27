import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 站内两种按钮：亮苔绿实心（primary）与描边幽灵（ghost）。
 *
 * 之前是 globals.css 里的 `.btn-primary` / `.btn-ghost`，迁移到 Tailwind 后
 * 收敛成一份变体表；链接用 `buttonVariants()` 取类名，按钮直接用 `<Button>`。
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent font-semibold hover:-translate-y-px hover:bg-[#d5ecc4] hover:shadow-[0_10px_30px_-12px_rgba(200,224,182,0.5)]",
        ghost:
          "border border-line-2 bg-transparent text-ink hover:border-primary hover:bg-primary/8 hover:text-white",
      },
      size: {
        sm: "h-8 px-4 text-[12.5px]",
        md: "px-5 py-2.5 text-[13.5px]",
        lg: "px-[18px] py-3 text-[13.5px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
