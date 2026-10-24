-- Performance booster indexes for Story queries.

-- CreateIndex: support default /dashboard/cerita sorting by updatedAt DESC without status filter
CREATE INDEX IF NOT EXISTS "stories_updatedAt_idx" ON "stories"("updatedAt" DESC);

-- CreateIndex: support category-filtered story lists sorted by updatedAt DESC
CREATE INDEX IF NOT EXISTS "stories_categoryId_updatedAt_idx" ON "stories"("categoryId", "updatedAt" DESC);
