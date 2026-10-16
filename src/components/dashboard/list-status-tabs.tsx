"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StatusTabOption = {
  value: string;
  label: string;
};

type ListStatusTabsProps = {
  /** Query param name (default `status`). */
  paramName?: string;
  options: StatusTabOption[];
  /** Used when param absent. */
  defaultValue: string;
  /** `aria-label` untuk tablist. */
  label?: string;
};

export function ListStatusTabs({
  paramName = "status",
  options,
  defaultValue,
  label = "Filter status",
}: ListStatusTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const raw = searchParams.get(paramName);
  const current =
    raw && options.some((o) => o.value === raw) ? raw : defaultValue;

  function onValueChange(next: string | number | null) {
    if (next == null) return;
    const value = String(next);
    // Skip replace bila nilai sama — cegah soft-nav / loading loop.
    if (value === current) return;
    const params = new URLSearchParams(searchParams.toString());
    // Simpan semua nilai (termasuk ALL) agar tab & query selaras.
    if (!value) params.delete(paramName);
    else params.set(paramName, value);
    params.delete("page");
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <Tabs
      value={current}
      onValueChange={onValueChange}
      className="w-full gap-0"
    >
      <TabsList
        variant="line"
        aria-label={label}
        className="h-auto min-h-11 w-full flex-wrap justify-start gap-0 rounded-none border-b border-[var(--cermin-border,#d9e2ec)] bg-transparent p-0"
        data-pending={pending ? "" : undefined}
      >
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            className="min-h-11 shrink-0 rounded-none px-3 py-2 text-sm sm:px-4 data-active:text-[var(--focus,#0b6e4f)] after:bg-[var(--cermin-accent,#3d7c6b)] group-data-horizontal/tabs:after:bottom-0"
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
