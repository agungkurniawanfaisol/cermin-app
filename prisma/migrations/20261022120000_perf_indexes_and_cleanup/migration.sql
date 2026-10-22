-- Performance indexes, redundant index cleanup, and hot-path query optimizations.

-- 1. Redundant duplicate index cleanup
-- page_mcq_choices composite unique (mcqId, key) already satisfies mcqId prefix lookups.
DROP INDEX IF EXISTS "page_mcq_choices_mcqId_idx";

-- session_mcq_responses composite unique (sessionId, pageMcqId) already satisfies sessionId prefix lookups.
DROP INDEX IF EXISTS "session_mcq_responses_sessionId_idx";

-- 2. Index upgrades & replacements
-- users: role + status + name eliminates in-memory sorting on user dropdowns.
DROP INDEX IF EXISTS "users_role_status_idx";
CREATE INDEX IF NOT EXISTS "users_role_status_name_idx" ON "users"("role", "status", "name");

-- therapist_assignments: studentId + endedAt covers active assignment lookups and bulk student archive.
DROP INDEX IF EXISTS "therapist_assignments_studentId_idx";
CREATE INDEX IF NOT EXISTS "therapist_assignments_studentId_endedAt_idx" ON "therapist_assignments"("studentId", "endedAt");

-- parent_links: studentId + isActive covers student detail active parents queries.
DROP INDEX IF EXISTS "parent_links_studentId_idx";
CREATE INDEX IF NOT EXISTS "parent_links_studentId_isActive_idx" ON "parent_links"("studentId", "isActive");

-- media_assets: studentId + createdAt DESC covers student portrait list without in-memory sort.
DROP INDEX IF EXISTS "media_assets_studentId_idx";
CREATE INDEX IF NOT EXISTS "media_assets_studentId_createdAt_idx" ON "media_assets"("studentId", "createdAt" DESC);

-- 3. Critical foreign keys and hot-path filters
-- sessions / accounts: covers Better-Auth cascade deletions and user lookups.
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");

-- invite_tokens: eliminates table scans for active invite counts on admin dashboard.
CREATE INDEX IF NOT EXISTS "invite_tokens_usedAt_expiresAt_idx" ON "invite_tokens"("usedAt", "expiresAt");

-- learning_sessions: covers chronological session list when filtering all sessions or recent counts.
CREATE INDEX IF NOT EXISTS "learning_sessions_startedAt_idx" ON "learning_sessions"("startedAt" DESC);

-- audit_logs: covers filtering by actor and action-based chronological queries.
CREATE INDEX IF NOT EXISTS "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);
