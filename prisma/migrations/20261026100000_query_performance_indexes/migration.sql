-- Composite indexes to accelerate filtered & sorted queries across dashboard views.

-- 1. Accelerate listUsers when filtering by role and/or status with default sort by createdAt DESC
CREATE INDEX IF NOT EXISTS "users_role_status_createdAt_idx" ON "users"("role", "status", "createdAt" DESC);

-- 2. Drop redundant therapistId index (covered as leading column by therapist_assignments_therapistId_endedAt_idx)
DROP INDEX IF EXISTS "therapist_assignments_therapistId_idx";

-- 3. Accelerate listStoriesForViewer when filtering by categoryId and status sorted by updatedAt DESC
CREATE INDEX IF NOT EXISTS "stories_categoryId_status_updatedAt_idx" ON "stories"("categoryId", "status", "updatedAt" DESC);

-- 4. Accelerate listLearningSessionsForViewer when filtering by studentId and state (endedAt) sorted by startedAt DESC
CREATE INDEX IF NOT EXISTS "learning_sessions_studentId_endedAt_startedAt_idx" ON "learning_sessions"("studentId", "endedAt", "startedAt" DESC);

-- 5. Accelerate listAuditLogsForAdmin when filtering by entityType sorted by createdAt DESC
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_createdAt_idx" ON "audit_logs"("entityType", "createdAt" DESC);
