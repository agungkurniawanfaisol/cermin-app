"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ListFilterField = {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  /** Empty option label (clears filter). */
  allLabel?: string;
};

export type ListSortOption = {
  /** Format: `field:asc` atau `field:desc`. */
  value: string;
  label: string;
};

type ListFiltersProps = {
  searchPlaceholder?: string;
  filters?: ListFilterField[];
  sortOptions: ListSortOption[];
  defaultSortValue: string;
};

export function ListFilters({
  searchPlaceholder = "Cari…",
  filters = [],
  sortOptions,
  defaultSortValue,
}: ListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (q === current) return;
      const next = new URLSearchParams(searchParams.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      next.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce q → URL only
  }, [q]);

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") next.delete(name);
    else next.set(name, value);
    next.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function resetAll() {
    setQ("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const currentSortValue = `${searchParams.get("sort") ?? defaultSortValue.split(":")[0]}:${searchParams.get("order") ?? defaultSortValue.split(":")[1] ?? "asc"}`;

  const hasActive =
    Boolean(searchParams.get("q")) ||
    filters.some((f) => searchParams.get(f.name)) ||
    currentSortValue !== defaultSortValue;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="list-q" className="text-xs font-medium">
            Cari
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cermin-muted,#5c6b73)]"
              aria-hidden
            />
            <Input
              id="list-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-h-11 pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        {filters.map((field) => (
          <div key={field.name} className="w-full space-y-1.5 sm:w-44">
            <Label htmlFor={`filter-${field.name}`} className="text-xs font-medium">
              {field.label}
            </Label>
            <select
              id={`filter-${field.name}`}
              className="flex min-h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-sm text-[var(--text,#1f2933)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
              value={searchParams.get(field.name) ?? "ALL"}
              onChange={(e) => updateParam(field.name, e.target.value)}
              disabled={pending}
            >
              <option value="ALL">{field.allLabel ?? "Semua"}</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="w-full space-y-1.5 sm:w-52">
          <Label htmlFor="list-sort" className="text-xs font-medium">
            Urutkan
          </Label>
          <select
            id="list-sort"
            className="flex min-h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-sm text-[var(--text,#1f2933)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
            value={
              sortOptions.some((o) => o.value === currentSortValue)
                ? currentSortValue
                : defaultSortValue
            }
            onChange={(e) => {
              const [sort, order] = e.target.value.split(":");
              const next = new URLSearchParams(searchParams.toString());
              if (sort) next.set("sort", sort);
              if (order) next.set("order", order);
              next.delete("page");
              startTransition(() => {
                router.replace(`${pathname}?${next.toString()}`, {
                  scroll: false,
                });
              });
            }}
            disabled={pending}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActive ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={pending}
            onClick={resetAll}
          >
            Reset filter
          </Button>
        </div>
      ) : null}
    </div>
  );
}
