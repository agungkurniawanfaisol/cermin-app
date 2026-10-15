export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export type ListQueryInput = Record<string, string | string[] | undefined>;

export type ParsedListQuery = {
  page: number;
  pageSize: number;
  q: string;
  sort: string;
  order: "asc" | "desc";
  filters: Record<string, string | undefined>;
};

export type ParseListQueryOptions = {
  allowedSort?: string[];
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  defaultPageSize?: number;
  /** Allowed values per filter key. Missing/invalid → undefined. */
  filters?: Record<string, readonly string[]>;
};

function first(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

export function parseListQuery(
  input: ListQueryInput,
  options: ParseListQueryOptions = {},
): ParsedListQuery {
  const defaultSort = options.defaultSort ?? "name";
  const allowedSort = options.allowedSort ?? [defaultSort];
  const defaultOrder = options.defaultOrder ?? "asc";
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;

  const page = parsePositiveInt(first(input.page), 1);
  let pageSize = parsePositiveInt(first(input.pageSize), defaultPageSize);
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  const q = (first(input.q) ?? "").trim();

  const sortRaw = first(input.sort) ?? defaultSort;
  const sort = allowedSort.includes(sortRaw) ? sortRaw : defaultSort;

  const orderRaw = first(input.order);
  const order: "asc" | "desc" =
    orderRaw === "desc" || orderRaw === "asc" ? orderRaw : defaultOrder;

  const filters: Record<string, string | undefined> = {};
  if (options.filters) {
    for (const [key, allowed] of Object.entries(options.filters)) {
      const value = first(input[key]);
      filters[key] =
        value && (allowed as readonly string[]).includes(value)
          ? value
          : undefined;
    }
  }

  return { page, pageSize, q, sort, order, filters };
}

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export function paginationMeta(args: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  const { pageSize, total } = args;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page =
    totalPages === 0 ? 1 : Math.min(Math.max(args.page, 1), totalPages);
  const skip = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total,
    totalPages,
    skip,
    take: pageSize,
    hasPrev: page > 1,
    hasNext: totalPages > 0 && page < totalPages,
  };
}

export type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export function toListResult<T>(
  items: T[],
  meta: PaginationMeta,
): ListResult<T> {
  return {
    items,
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
    hasPrev: meta.hasPrev,
    hasNext: meta.hasNext,
  };
}
