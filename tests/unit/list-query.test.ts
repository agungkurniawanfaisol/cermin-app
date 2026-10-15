import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseListQuery,
  paginationMeta,
} from "@/lib/list-query";

describe("parseListQuery", () => {
  it("applies defaults for empty params", () => {
    const q = parseListQuery({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(q.q).toBe("");
    expect(q.order).toBe("asc");
  });

  it("parses page, pageSize, q, sort, order and clamps", () => {
    const q = parseListQuery(
      {
        page: "3",
        pageSize: "999",
        q: "  Alya  ",
        sort: "createdAt",
        order: "desc",
      },
      { allowedSort: ["name", "createdAt"], defaultSort: "name" },
    );
    expect(q.page).toBe(3);
    expect(q.pageSize).toBe(MAX_PAGE_SIZE);
    expect(q.q).toBe("Alya");
    expect(q.sort).toBe("createdAt");
    expect(q.order).toBe("desc");
  });

  it("rejects non-positive page and falls back", () => {
    expect(parseListQuery({ page: "0" }).page).toBe(1);
    expect(parseListQuery({ page: "-2" }).page).toBe(1);
    expect(parseListQuery({ page: "x" }).page).toBe(1);
  });

  it("keeps only allowed sort keys", () => {
    const q = parseListQuery(
      { sort: "password" },
      { allowedSort: ["name", "createdAt"], defaultSort: "name" },
    );
    expect(q.sort).toBe("name");
  });

  it("parses optional filter string", () => {
    const q = parseListQuery(
      { status: "ACTIVE" },
      { filters: { status: ["ACTIVE", "ARCHIVED", "ALL"] } },
    );
    expect(q.filters.status).toBe("ACTIVE");
    expect(
      parseListQuery(
        { status: "HACK" },
        { filters: { status: ["ACTIVE", "ARCHIVED", "ALL"] } },
      ).filters.status,
    ).toBeUndefined();
  });
});

describe("paginationMeta", () => {
  it("computes skip/take and page bounds", () => {
    const meta = paginationMeta({ page: 2, pageSize: 20, total: 45 });
    expect(meta.skip).toBe(20);
    expect(meta.take).toBe(20);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasPrev).toBe(true);
    expect(meta.hasNext).toBe(true);
    expect(meta.page).toBe(2);
  });

  it("clamps page when beyond last", () => {
    const meta = paginationMeta({ page: 99, pageSize: 20, total: 5 });
    expect(meta.page).toBe(1);
    expect(meta.skip).toBe(0);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
  });

  it("handles empty total", () => {
    const meta = paginationMeta({ page: 1, pageSize: 20, total: 0 });
    expect(meta.totalPages).toBe(0);
    expect(meta.skip).toBe(0);
    expect(meta.hasPrev).toBe(false);
    expect(meta.hasNext).toBe(false);
  });
});
