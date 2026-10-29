import { cn } from "@/lib/utils";

export type ChipOption = {
  value: string;
  label: string;
};

/**
 * 一行胶囊筛选：标题在上，选项在下。
 *
 * 组件不区分单选/多选：单选组在选项里带上 `"all"`，多选组不带；
 * 选中的值统一用数组表示。
 */
export function FilterChips({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly ChipOption[];
  selected: readonly string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.02em] text-muted">{label}</p>
      <div role="group" aria-label={label} className="mt-2 flex flex-wrap items-center gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
                active
                  ? "border-primary/60 bg-primary/15 font-medium text-ink shadow-[inset_0_0_0_1px_rgba(159,191,150,0.35)]"
                  : "border-line text-muted hover:border-line-2 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
