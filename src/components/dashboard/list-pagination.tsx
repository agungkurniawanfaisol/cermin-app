import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Current query string without leading ? — page param will be set. */
  searchParams: Record<string, string | undefined>;
  basePath: string;
};

function hrefFor(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page") continue;
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  searchParams,
  basePath,
}: ListPaginationProps) {
  if (total === 0) {
    return (
      <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
        Tidak ada data.
      </p>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const prevHref = hrefFor(basePath, searchParams, page - 1);
  const nextHref = hrefFor(basePath, searchParams, page + 1);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
        Menampilkan {from}–{to} dari {total}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={prevHref}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-1 rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-sm font-medium text-[var(--text,#1f2933)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
            page <= 1
              ? "pointer-events-none opacity-40"
              : "hover:bg-[var(--accent-soft,#e6f2ee)]",
          )}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Sebelumnya
        </Link>
        <span className="min-w-16 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
          {page} / {totalPages}
        </span>
        <Link
          href={nextHref}
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-1 rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-sm font-medium text-[var(--text,#1f2933)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
            page >= totalPages
              ? "pointer-events-none opacity-40"
              : "hover:bg-[var(--accent-soft,#e6f2ee)]",
          )}
        >
          Berikutnya
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
