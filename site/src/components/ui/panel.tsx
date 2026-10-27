import { cva, type VariantProps } from "class-variance-authority";

/**
 * 三档表面：主卡（card）、侧栏薄卡（rail）、主预览舞台（stage）。
 *
 * 原来分别是 `.card-glow` / `.rail-card` / `.stage-glow` 三个 CSS 类，
 * 现在合并成一份 Tailwind 变体表，圆角、描边、阴影全部是工具类。
 */
export const panelVariants = cva("", {
  variants: {
    variant: {
      card: "relative rounded-2xl border border-line bg-gradient-to-b from-white/[0.028] to-transparent transition-colors hover:border-line-2",
      rail: "rounded-2xl border border-line bg-white/[0.02]",
      stage:
        "overflow-hidden rounded-3xl border border-line-2 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9),0_0_60px_-20px_rgba(159,191,150,0.35)]",
    },
  },
  defaultVariants: { variant: "card" },
});

export type PanelVariantProps = VariantProps<typeof panelVariants>;
