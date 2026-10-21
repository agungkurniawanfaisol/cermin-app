-- Drop old story-level evaluation tables
DROP TABLE IF EXISTS "session_evaluation_responses";
DROP TABLE IF EXISTS "evaluation_items";
DROP TABLE IF EXISTS "story_evaluations";

-- CreateTable page_mcqs
CREATE TABLE "page_mcqs" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "promptImageKey" TEXT,
    "correctKey" TEXT NOT NULL,

    CONSTRAINT "page_mcqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable page_mcq_choices
CREATE TABLE "page_mcq_choices" (
    "id" UUID NOT NULL,
    "mcqId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "labelText" TEXT NOT NULL DEFAULT '',
    "imageKey" TEXT,

    CONSTRAINT "page_mcq_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable session_mcq_responses
CREATE TABLE "session_mcq_responses" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "pageMcqId" UUID NOT NULL,
    "selectedKey" TEXT NOT NULL,

    CONSTRAINT "session_mcq_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "page_mcqs_pageId_key" ON "page_mcqs"("pageId");

CREATE UNIQUE INDEX "page_mcq_choices_mcqId_key_key" ON "page_mcq_choices"("mcqId", "key");
CREATE INDEX "page_mcq_choices_mcqId_idx" ON "page_mcq_choices"("mcqId");

CREATE UNIQUE INDEX "session_mcq_responses_sessionId_pageMcqId_key" ON "session_mcq_responses"("sessionId", "pageMcqId");
CREATE INDEX "session_mcq_responses_sessionId_idx" ON "session_mcq_responses"("sessionId");
CREATE INDEX "session_mcq_responses_pageMcqId_idx" ON "session_mcq_responses"("pageMcqId");

ALTER TABLE "page_mcqs" ADD CONSTRAINT "page_mcqs_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "story_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "page_mcq_choices" ADD CONSTRAINT "page_mcq_choices_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "page_mcqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_mcq_responses" ADD CONSTRAINT "session_mcq_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "learning_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_mcq_responses" ADD CONSTRAINT "session_mcq_responses_pageMcqId_fkey" FOREIGN KEY ("pageMcqId") REFERENCES "page_mcqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
