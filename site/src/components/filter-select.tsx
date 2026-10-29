"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

/**
 * 高级筛选用的下拉选择。
 *
 * 单选：点一项即选中并收起；多选：点一项切换，菜单保持展开。
 * 未选择时显示「不限」——高级项默认不生效。
 */
export function FilterSelect({
  label,
  options,
  values,
  onChange,
  multiple = false,
}: {
  label: string;
  options: readonly SelectOption[];
  values: readonly string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const labelOf = (value: string) =>
    options.find((option) => option.value === value)?.label ?? value;
  const summary =
    values.length === 0 ? "不限" : values.map(labelOf).join(multiple ? " / " : "");

  const select = (value: string) => {
    if (multiple) {
      onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
      return;
    }
    onChange([value]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <p className="text-[11px] tracking-[0.02em] text-muted">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "mt-2 flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white/[0.02] px-3 text-left text-[12.5px] transition-colors",
          open ? "border-primary/50" : "border-line hover:border-line-2",
        )}
      >
        <span className={cn("truncate", values.length === 0 ? "text-faint" : "text-ink")}>
          {summary}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          aria-multiselectable={multiple}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line-2 bg-void-2/95 p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {multiple && values.length === 0 && (
            <li className="px-3 py-1.5 text-[11px] text-faint">不选 = 不限</li>
          )}
          {options.map((option) => {
            const active = values.includes(option.value);
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[12.5px] transition-colors",
                    active
                      ? "bg-white/[0.06] text-ink"
                      : "text-ink-soft hover:bg-white/[0.04] hover:text-ink",
                  )}
                >
                  <span className="w-3.5 shrink-0 text-primary" aria-hidden="true">
                    {active ? "✓" : ""}
                  </span>
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
