-- CreateIndex: support default /dashboard/pengguna sorting by createdAt DESC without status/role filter
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt" DESC);

-- CreateIndex: support /dashboard/murid?status=ALL sorting by createdAt DESC without status filter
CREATE INDEX IF NOT EXISTS "students_createdAt_idx" ON "students"("createdAt" DESC);
