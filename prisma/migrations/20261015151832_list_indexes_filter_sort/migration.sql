-- CreateIndex
CREATE INDEX "learning_sessions_ledByUserId_startedAt_idx" ON "learning_sessions"("ledByUserId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "learning_sessions_endedAt_startedAt_idx" ON "learning_sessions"("endedAt", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "stories_status_updatedAt_idx" ON "stories"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "stories_status_title_idx" ON "stories"("status", "title");

-- CreateIndex
CREATE INDEX "students_status_displayName_idx" ON "students"("status", "displayName");

-- CreateIndex
CREATE INDEX "students_status_createdAt_idx" ON "students"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "students_displayName_idx" ON "students"("displayName");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_status_createdAt_idx" ON "users"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");
