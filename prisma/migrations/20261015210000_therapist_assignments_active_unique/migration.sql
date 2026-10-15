-- One active therapist↔student assignment at a time (Prisma cannot express partial unique).
CREATE UNIQUE INDEX "therapist_assignments_active_unique" ON "therapist_assignments"("therapistId", "studentId") WHERE "endedAt" IS NULL;
