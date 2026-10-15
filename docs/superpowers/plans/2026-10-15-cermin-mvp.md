# CERMIN MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-lembaga Next.js app where Admin/Terapis/Orang Tua manage students and social stories, then run guided child-mode learning sessions with private media and server-side authorization.

**Architecture:** Modular monolith — Next.js App Router Server Actions + Route Handlers, Better Auth sessions in Postgres, Prisma → Supabase Postgres, private Supabase Storage with authz-gated signed URLs, domain folders under `src/server`, policies enforced on every mutation/query. Child has no login; adults open `/belajar`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Better Auth, Prisma, Zod, Supabase (Postgres + Storage), Vitest, Playwright, pnpm, Vercel.

**Spec references:** `docs/BRD.md`, `docs/PRD.md`, `docs/ERD.md`, `docs/ACCESS-CONTROL.md`, `docs/UI-DESIGN-SYSTEM.md`, `docs/ROADMAP.md`, `docs/TEST-PLAN.md`, `docs/superpowers/specs/2026-10-15-cermin-platform-design.md`

---

## File structure (lock-in)

```
/
├── package.json
├── pnpm-lock.yaml
├── .env.example
├── .gitignore
├── next.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # redirect → /login or /dashboard
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── terima-undangan/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── murid/
│   │   │   ├── pengguna/
│   │   │   ├── cerita/
│   │   │   └── sesi/
│   │   ├── belajar/
│   │   │   ├── layout.tsx              # child-mode chrome
│   │   │   └── [sessionId]/page.tsx
│   │   └── api/
│   │       ├── auth/[...all]/route.ts
│   │       └── media/[id]/route.ts
│   ├── components/
│   │   ├── ui/                         # shadcn
│   │   ├── dashboard/
│   │   └── belajar/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── auth-client.ts
│   │   ├── supabase-admin.ts
│   │   └── audit.ts
│   └── server/
│       ├── policies/access.ts
│       ├── validations/
│       │   ├── student.ts
│       │   ├── story.ts
│       │   ├── invite.ts
│       │   └── session.ts
│       └── actions/
│           ├── students.ts
│           ├── assignments.ts
│           ├── invites.ts
│           ├── stories.ts
│           ├── media.ts
│           └── sessions.ts
├── tests/
│   └── unit/
│       ├── policies/access.test.ts
│       └── validations/*.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── isolation.spec.ts
    └── child-mode.spec.ts
```

---

### Task 1: Scaffold Next.js + tooling

**Files:**

- Create: entire Next.js app via CLI
- Create: `.env.example`
- Modify: `.gitignore` (already exists — merge, keep `.superpowers/`)

- [ ] **Step 1: Init git and scaffold**

```bash
cd /home/agung/project/cermin-app
git init
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-pnpm
```

If CLI complains about non-empty dir (docs present), scaffold into temp and move files, or use `--force` if available. Preserve `docs/` and `.gitignore` entries for `.superpowers/`.

- [ ] **Step 2: Add core deps**

```bash
pnpm add better-auth @prisma/client @supabase/supabase-js zod nanoid
pnpm add -D prisma vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom playwright @playwright/test tsx
```

- [ ] **Step 3: Init shadcn**

```bash
pnpm dlx shadcn@latest init -y
pnpm dlx shadcn@latest add button input label card table dialog tabs textarea select toast sonner dropdown-menu separator avatar badge
```

- [ ] **Step 4: Write `.env.example`**

```bash
# App
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Postgres (Prisma)
DATABASE_URL=postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:5432/postgres

# Supabase Storage (server only)
NEXT_PUBLIC_SUPABASE_URL=https://ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Seed
SEED_ADMIN_EMAIL=admin@cermin.local
SEED_ADMIN_PASSWORD=change-me-strong
SEED_ADMIN_NAME=Administrator
```

- [ ] **Step 5: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold Next.js app with tooling for CERMIN MVP

EOF
)"
```

---

### Task 2: Prisma schema + seed

**Files:**

- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  ADMIN
  TERAPIS
  ORANG_TUA
}

enum UserStatus {
  ACTIVE
  DISABLED
}

enum StudentStatus {
  ACTIVE
  ARCHIVED
}

enum StoryStatus {
  DRAFT
  REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}

enum MediaKind {
  IMAGE
  AUDIO
}

enum TextSize {
  SM
  MD
  LG
  XL
}

model User {
  id            String     @id @default(uuid()) @db.Uuid
  name          String
  email         String     @unique
  emailVerified Boolean    @default(false)
  image         String?
  role          UserRole   @default(ORANG_TUA)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  sessions              Session[]
  accounts              Account[]
  preference            UserPreference?
  therapistAssignments  TherapistAssignment[] @relation("TherapistAssignments")
  assignmentsCreated    TherapistAssignment[] @relation("AssignmentCreator")
  parentLinks           ParentLink[]
  invitesCreated        InviteToken[]
  auditLogs             AuditLog[]
  storiesCreated        Story[]               @relation("StoryCreator")
  mediaCreated          MediaAsset[]
  sessionsLed           LearningSession[]
  observations          SessionObservation[]

  @@map("users")
}

model Session {
  id        String   @id @default(uuid()) @db.Uuid
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Account {
  id                    String    @id @default(uuid()) @db.Uuid
  accountId             String
  providerId            String
  userId                String    @db.Uuid
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("accounts")
}

model Verification {
  id         String   @id @default(uuid()) @db.Uuid
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verifications")
}

model UserPreference {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @unique @db.Uuid
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  textSize     TextSize @default(MD)
  audioEnabled Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("user_preferences")
}

model Student {
  id          String        @id @default(uuid()) @db.Uuid
  displayName String
  dateOfBirth DateTime?     @db.Date
  adminNotes  String?
  status      StudentStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  therapistAssignments TherapistAssignment[]
  parentLinks          ParentLink[]
  learningSessions     LearningSession[]

  @@map("students")
}

model TherapistAssignment {
  id          String    @id @default(uuid()) @db.Uuid
  therapistId String    @db.Uuid
  studentId   String    @db.Uuid
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  assignedById String   @db.Uuid
  therapist   User      @relation("TherapistAssignments", fields: [therapistId], references: [id])
  student     Student   @relation(fields: [studentId], references: [id])
  assignedBy  User      @relation("AssignmentCreator", fields: [assignedById], references: [id])

  @@index([therapistId])
  @@index([studentId])
  @@map("therapist_assignments")
}

model ParentLink {
  id            String  @id @default(uuid()) @db.Uuid
  parentId      String  @db.Uuid
  studentId     String  @db.Uuid
  relationLabel String?
  isActive      Boolean @default(true)
  parent        User    @relation(fields: [parentId], references: [id])
  student       Student @relation(fields: [studentId], references: [id])

  @@unique([parentId, studentId])
  @@index([studentId])
  @@map("parent_links")
}

model InviteToken {
  id          String    @id @default(uuid()) @db.Uuid
  email       String
  role        UserRole
  tokenHash   String    @unique
  expiresAt   DateTime
  usedAt      DateTime?
  createdById String    @db.Uuid
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())

  @@index([email])
  @@map("invite_tokens")
}

model StoryCategory {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  description String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  stories     Story[]

  @@map("story_categories")
}

model Story {
  id                  String      @id @default(uuid()) @db.Uuid
  categoryId          String      @db.Uuid
  title               String
  description         String      @default("")
  learningObjectives  String      @default("")
  status              StoryStatus @default(DRAFT)
  createdById         String      @db.Uuid
  publishedAt         DateTime?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  category            StoryCategory @relation(fields: [categoryId], references: [id])
  createdBy           User          @relation("StoryCreator", fields: [createdById], references: [id])
  pages               StoryPage[]
  versions            StoryVersion[]
  evaluations         StoryEvaluation[]
  media               MediaAsset[]
  learningSessions    LearningSession[]

  @@index([categoryId, status])
  @@map("stories")
}

model StoryVersion {
  id           String   @id @default(uuid()) @db.Uuid
  storyId      String   @db.Uuid
  versionNo    Int
  snapshotJson Json
  createdById  String   @db.Uuid
  createdAt    DateTime @default(now())
  story        Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@unique([storyId, versionNo])
  @@map("story_versions")
}

model StoryPage {
  id        String   @id @default(uuid()) @db.Uuid
  storyId   String   @db.Uuid
  sortOrder Int
  bodyText  String   @default("")
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  media     MediaAsset[]

  @@unique([storyId, sortOrder])
  @@map("story_pages")
}

model MediaAsset {
  id            String    @id @default(uuid()) @db.Uuid
  storyId       String?   @db.Uuid
  pageId        String?   @db.Uuid
  kind          MediaKind
  storageBucket String    @default("cermin-media")
  storageKey    String
  mimeType      String
  byteSize      Int
  altText       String?
  sortOrder     Int       @default(0)
  createdById   String    @db.Uuid
  createdAt     DateTime  @default(now())
  story         Story?    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  page          StoryPage? @relation(fields: [pageId], references: [id], onDelete: Cascade)
  createdBy     User      @relation(fields: [createdById], references: [id])

  @@index([pageId])
  @@index([storyId])
  @@map("media_assets")
}

model StoryEvaluation {
  id          String   @id @default(uuid()) @db.Uuid
  storyId     String   @db.Uuid
  title       String
  description String   @default("")
  sortOrder   Int      @default(0)
  story       Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  items       EvaluationItem[]

  @@map("story_evaluations")
}

model EvaluationItem {
  id           String   @id @default(uuid()) @db.Uuid
  evaluationId String   @db.Uuid
  prompt       String
  itemType     String   @default("TEXT")
  sortOrder    Int      @default(0)
  evaluation   StoryEvaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  responses    SessionEvaluationResponse[]

  @@map("evaluation_items")
}

model LearningSession {
  id          String    @id @default(uuid()) @db.Uuid
  studentId   String    @db.Uuid
  storyId     String    @db.Uuid
  ledByUserId String    @db.Uuid
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  student     Student   @relation(fields: [studentId], references: [id])
  story       Story     @relation(fields: [storyId], references: [id])
  ledBy       User      @relation(fields: [ledByUserId], references: [id])
  observations SessionObservation[]
  responses    SessionEvaluationResponse[]

  @@index([studentId, startedAt(sort: Desc)])
  @@index([storyId])
  @@map("learning_sessions")
}

model SessionObservation {
  id           String   @id @default(uuid()) @db.Uuid
  sessionId    String   @db.Uuid
  recordedById String   @db.Uuid
  note         String
  recordedAt   DateTime @default(now())
  session      LearningSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  recordedBy   User            @relation(fields: [recordedById], references: [id])

  @@map("session_observations")
}

model SessionEvaluationResponse {
  id                String @id @default(uuid()) @db.Uuid
  sessionId         String @db.Uuid
  evaluationItemId  String @db.Uuid
  value             Json
  note              String?
  session           LearningSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  evaluationItem    EvaluationItem  @relation(fields: [evaluationItemId], references: [id])

  @@unique([sessionId, evaluationItemId])
  @@map("session_evaluation_responses")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String?  @db.Uuid
  action     String
  entityType String
  entityId   String?
  metadata   Json?
  createdAt  DateTime @default(now())
  actor      User?    @relation(fields: [actorId], references: [id])

  @@index([createdAt(sort: Desc)])
  @@index([entityType, entityId])
  @@map("audit_logs")
}
```

- [ ] **Step 2: Write `src/lib/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Write `prisma/seed.ts`**

```ts
import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@cermin.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-strong";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: UserRole.ADMIN,
        emailVerified: true,
        preference: { create: {} },
      },
    });
    const hashed = await hashPassword(password);
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    console.log("Seeded admin:", email);
  }

  const categories = [
    { name: "Bergiliran", sortOrder: 1 },
    { name: "Menerima Kemenangan dan Kekalahan", sortOrder: 2 },
  ];
  for (const c of categories) {
    const found = await prisma.storyCategory.findFirst({
      where: { name: c.name },
    });
    if (!found) {
      await prisma.storyCategory.create({ data: c });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Note: if `better-auth/crypto` hash API differs in installed version, align with Better Auth docs for credential password hashing used by the adapter.

- [ ] **Step 4: Migrate (requires `.env.local` with Supabase URLs)**

```bash
pnpm prisma migrate dev --name init
pnpm db:seed
```

Expected: migration applied; admin + 2 categories present.

- [ ] **Step 5: Commit**

```bash
git add prisma src/lib/db.ts
git commit -m "$(cat <<'EOF'
feat: add Prisma schema, seed admin, and initial categories

EOF
)"
```

---

### Task 3: Better Auth + login page

**Files:**

- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-client.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/middleware.ts` (or proxy equivalent per Next version)
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement `src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "ORANG_TUA",
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "ACTIVE",
        input: false,
      },
    },
  },
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TERAPIS" | "ORANG_TUA";
  status: "ACTIVE" | "DISABLED";
};
```

- [ ] **Step 2: Auth route + client**

`src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

`src/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
```

- [ ] **Step 3: Login page (Bahasa Indonesia)**

Create `src/app/login/page.tsx` with email/password form calling `authClient.signIn.email`. On success redirect `/dashboard`. Show errors in Indonesian (“Email atau kata sandi salah”).

- [ ] **Step 4: Protect dashboard via server session helper**

Create `src/server/policies/access.ts` starter (full in Task 4) with at least:

```ts
import { headers } from "next/headers";
import { auth, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class AuthzError extends Error {
  constructor(
    message = "Tidak diizinkan",
    public status = 403,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new AuthzError("Silakan masuk", 401);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  if (user.status !== "ACTIVE") throw new AuthzError("Akun nonaktif", 403);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}
```

Dashboard `layout.tsx` calls `requireSession()` and redirects to `/login` on 401.

- [ ] **Step 5: Manual smoke**

```bash
pnpm dev
```

Login with seed admin. Expected: reach `/dashboard` shell.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts src/app/api/auth src/app/login src/server/policies src/app/dashboard
git commit -m "$(cat <<'EOF'
feat: add Better Auth email login and protected dashboard shell

EOF
)"
```

---

### Task 4: Access policy helpers + unit tests (TDD)

**Files:**

- Create: `src/server/policies/access.ts` (complete)
- Create: `tests/unit/policies/access.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Configure Vitest**

`vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Write failing tests first**

`tests/unit/policies/access.test.ts` — test pure helpers that take already-loaded relation flags:

```ts
import { describe, expect, it } from "vitest";
import {
  canAccessStudent,
  canPublishStory,
  canLeadSession,
  type PolicyUser,
} from "@/server/policies/access";

const admin: PolicyUser = { id: "a", role: "ADMIN", status: "ACTIVE" };
const terapis: PolicyUser = { id: "t", role: "TERAPIS", status: "ACTIVE" };
const ortu: PolicyUser = { id: "o", role: "ORANG_TUA", status: "ACTIVE" };

describe("canAccessStudent", () => {
  it("allows admin", () => {
    expect(canAccessStudent(admin, { assigned: false, linked: false })).toBe(
      true,
    );
  });
  it("allows assigned terapis", () => {
    expect(canAccessStudent(terapis, { assigned: true, linked: false })).toBe(
      true,
    );
  });
  it("denies unassigned terapis", () => {
    expect(canAccessStudent(terapis, { assigned: false, linked: false })).toBe(
      false,
    );
  });
  it("allows linked ortu", () => {
    expect(canAccessStudent(ortu, { assigned: false, linked: true })).toBe(
      true,
    );
  });
  it("denies unlinked ortu", () => {
    expect(canAccessStudent(ortu, { assigned: false, linked: false })).toBe(
      false,
    );
  });
});

describe("canPublishStory", () => {
  it("only admin", () => {
    expect(canPublishStory(admin)).toBe(true);
    expect(canPublishStory(terapis)).toBe(false);
  });
});

describe("canLeadSession", () => {
  it("matches student access", () => {
    expect(canLeadSession(terapis, { assigned: true, linked: false })).toBe(
      true,
    );
    expect(canLeadSession(ortu, { assigned: false, linked: true })).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
pnpm test tests/unit/policies/access.test.ts
```

Expected: FAIL (exports missing).

- [ ] **Step 4: Implement helpers in `src/server/policies/access.ts`**

```ts
export type PolicyUser = {
  id: string;
  role: "ADMIN" | "TERAPIS" | "ORANG_TUA";
  status: "ACTIVE" | "DISABLED";
};

export type StudentAccessCtx = { assigned: boolean; linked: boolean };

export function canAccessStudent(
  user: PolicyUser,
  ctx: StudentAccessCtx,
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "TERAPIS") return ctx.assigned;
  if (user.role === "ORANG_TUA") return ctx.linked;
  return false;
}

export function canPublishStory(user: PolicyUser): boolean {
  return user.status === "ACTIVE" && user.role === "ADMIN";
}

export function canLeadSession(
  user: PolicyUser,
  ctx: StudentAccessCtx,
): boolean {
  return canAccessStudent(user, ctx);
}

export async function loadStudentAccessCtx(
  userId: string,
  role: PolicyUser["role"],
  studentId: string,
): Promise<StudentAccessCtx> {
  if (role === "ADMIN") return { assigned: true, linked: true };
  const [assignment, link] = await Promise.all([
    role === "TERAPIS"
      ? prisma.therapistAssignment.findFirst({
          where: { therapistId: userId, studentId, endedAt: null },
        })
      : null,
    role === "ORANG_TUA"
      ? prisma.parentLink.findFirst({
          where: { parentId: userId, studentId, isActive: true },
        })
      : null,
  ]);
  return { assigned: Boolean(assignment), linked: Boolean(link) };
}

export async function assertCanAccessStudent(
  user: PolicyUser,
  studentId: string,
) {
  const ctx = await loadStudentAccessCtx(user.id, user.role, studentId);
  if (!canAccessStudent(user, ctx)) throw new AuthzError();
}
```

Keep `requireSession` / `requireRole` / `AuthzError` from Task 3 in the same file; import `prisma`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test tests/unit/policies/access.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/server/policies/access.ts tests/unit/policies/access.test.ts
git commit -m "$(cat <<'EOF'
feat: add role and relationship access policy helpers with tests

EOF
)"
```

---

### Task 5: Invites + user management (Admin)

**Files:**

- Create: `src/server/validations/invite.ts`
- Create: `src/server/actions/invites.ts`
- Create: `src/app/dashboard/pengguna/page.tsx`
- Create: `src/app/terima-undangan/page.tsx`
- Create: `src/lib/audit.ts`

- [ ] **Step 1: Zod schema**

```ts
import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: z.enum(["TERAPIS", "ORANG_TUA", "ADMIN"]),
  name: z.string().min(1, "Nama wajib"),
});
```

- [ ] **Step 2: `writeAudit` helper**

```ts
import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}
```

- [ ] **Step 3: Invite action**

- `requireSession` + `requireRole("ADMIN")`
- Generate raw token (`nanoid(32)`), store `sha256` hash, expiry 72h
- Return invite URL `/terima-undangan?token=...` (MVP: show in UI; email optional later)
- Accept flow: validate token, create user+credential account with invited role, mark `usedAt`, write audit

- [ ] **Step 4: Admin UI**

`/dashboard/pengguna` lists users (nama, email, role, status) + form undangan. Disable user action sets `status: DISABLED`.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add admin invite flow and user list

EOF
)"
```

---

### Task 6: Students + assignments + parent links

**Files:**

- Create: `src/server/validations/student.ts`
- Create: `src/server/actions/students.ts`
- Create: `src/server/actions/assignments.ts`
- Create: `src/app/dashboard/murid/page.tsx`
- Create: `src/app/dashboard/murid/[id]/page.tsx`
- Test: extend policy tests if needed; add validation unit test

- [ ] **Step 1: Validation**

```ts
import { z } from "zod";

export const createStudentSchema = z.object({
  displayName: z.string().min(1, "Nama murid wajib").max(120),
  dateOfBirth: z.string().optional(), // ISO date
  adminNotes: z.string().max(2000).optional(),
});
```

- [ ] **Step 2: Actions**

- `createStudent` / `updateStudent` / `archiveStudent` — Admin only
- `listStudentsForViewer` — Admin all; Terapis where assignment active; Ortu where link active
- `assignTherapist({ studentId, therapistId })` — Admin; end previous active pair for same pair if re-assigning; enforce one active `(therapistId, studentId)` via transaction check
- `endTherapistAssignment(assignmentId)` — set `endedAt`
- `linkParent` / `unlinkParent` — Admin

Every action: Zod → session → role/assert → prisma → `writeAudit`.

- [ ] **Step 3: UI**

- List murid filtered by role
- Detail: profil + daftar terapis (aktif/history) + ortu linked
- Admin forms for assign/link

- [ ] **Step 4: Manual + unit validation test**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add student profiles with therapist assignment history and parent links

EOF
)"
```

---

### Task 7: Stories, pages, status workflow

**Files:**

- Create: `src/server/validations/story.ts`
- Create: `src/server/actions/stories.ts`
- Create: `src/app/dashboard/cerita/page.tsx`
- Create: `src/app/dashboard/cerita/[id]/page.tsx`
- Create: `tests/unit/validations/story-status.test.ts`

- [ ] **Step 1: Status transition helper + test (TDD)**

```ts
const allowed: Record<string, string[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: [],
};

export function canTransitionStoryStatus(from: string, to: string): boolean {
  return allowed[from]?.includes(to) ?? false;
}
```

Test all legal/illegal transitions. Publish action additionally requires `canPublishStory(user)` (Admin).

- [ ] **Step 2: Story actions**

- CRUD draft story (Admin + Terapis)
- Add/reorder/update pages
- `transitionStoryStatus`
- On `PUBLISHED`: set `publishedAt`, create `StoryVersion` snapshot JSON of title/pages/media metadata

- [ ] **Step 3: UI**

- List by category (seed categories visible)
- Editor: metadata + ordered pages (teks)
- Status buttons per role matrix

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add story categories, pages, and publish workflow

EOF
)"
```

---

### Task 8: Private media upload + gated access

**Files:**

- Create: `src/lib/supabase-admin.ts`
- Create: `src/server/actions/media.ts`
- Create: `src/app/api/media/[id]/route.ts`

- [ ] **Step 1: Supabase admin client**

```ts
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

Ensure bucket `cermin-media` exists and is **private** (see `docs/ROADMAP.md` §3).

- [ ] **Step 2: Upload action**

- Accept `FormData`: file, `pageId` or `storyId`, `kind`, `altText` (required if IMAGE)
- Allowlist mime: `image/jpeg|png|webp`, `audio/mpeg|wav|ogg`
- Max size e.g. 5MB image / 10MB audio
- Path: `stories/{storyId}/pages/{pageId}/{uuid}.{ext}`
- Upload via service role; insert `MediaAsset` (no public URL column)

- [ ] **Step 3: `GET /api/media/[id]`**

1. `requireSession`
2. Load media + story
3. `assertCanAccessMedia` (Admin; Terapis/Ortu if can access any student who may use story — MVP: Admin/Terapis with story edit rights OR any user who `canLeadSession` for at least one student + story PUBLISHED; simplify: if story PUBLISHED and user authenticated with student access capability for session context, or Admin/story editor)
4. `createSignedUrl(storageKey, 120)` and redirect **or** return JSON `{ url }` for `<img>`/`<audio>` src

Recommended MVP: return JSON signed URL; client sets src. Never store permanent public URL.

- [ ] **Step 4: Wire uploader into story page editor**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add private media upload and authz-gated signed URLs

EOF
)"
```

---

### Task 9: Learning sessions + child mode UI

**Files:**

- Create: `src/server/validations/session.ts`
- Create: `src/server/actions/sessions.ts`
- Create: `src/app/belajar/layout.tsx`
- Create: `src/app/belajar/[sessionId]/page.tsx`
- Create: `src/components/belajar/*`
- Create: `src/app/dashboard/sesi/page.tsx` (start session picker)

- [ ] **Step 1: Actions**

```ts
// startLearningSession({ studentId, storyId })
// assertCanLeadSession + story.status === PUBLISHED
// create LearningSession

// addObservation({ sessionId, note })
// endLearningSession({ sessionId })
```

- [ ] **Step 2: Child layout CSS**

In `belajar/layout.tsx` / CSS module:

```css
.belajar-root {
  font-family:
    "Comic Sans MS", "Comic Sans", "Chalkboard SE", "Marker Felt", cursive,
    sans-serif;
  background: #f7f4ef;
  color: #1f2933;
  min-height: 100dvh;
  font-size: 1.35rem;
  line-height: 1.6;
}
```

Large Prev/Next buttons; audio button only if media AUDIO present; **no autoplay** (`autoPlay` never set; call `.play()` only on click).

- [ ] **Step 3: Reader page**

Load session → verify `ledByUserId === current user` (or Admin) → show page N text + image via `/api/media/[id]` → controls.

- [ ] **Step 4: Observation side panel for adult** (simple textarea + simpan) without cluttering child visual field if possible — e.g. collapsible “Catatan terapis”.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add guided learning sessions and calm child-mode reader

EOF
)"
```

---

### Task 10: E2E Playwright + polish

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/auth.spec.ts`
- Create: `e2e/isolation.spec.ts`
- Create: `e2e/child-mode.spec.ts`

- [ ] **Step 1: Playwright config** baseURL `http://localhost:3000`

- [ ] **Step 2: E2E cases (from TEST-PLAN)**

- `auth.spec.ts`: admin login succeeds; disabled user blocked (create via prisma in setup)
- `isolation.spec.ts`: terapis B cannot open murid assigned only to A
- `child-mode.spec.ts`: start session → next page → audio element `paused === true` until click → add observation

Use test seed script or fixtures; never hit production Supabase.

- [ ] **Step 3: Run**

```bash
pnpm dev &
pnpm test:e2e
```

Expected: pass E1/E3/E5/E6 equivalents.

- [ ] **Step 4: Final commit**

```bash
git commit -m "$(cat <<'EOF'
test: add Playwright coverage for auth isolation and child mode

EOF
)"
```

---

## Out of plan (Phase 2 — do not implement in this plan)

- Evaluation multi-item UI + SessionEvaluationResponse UI
- StoryVersion restore UI
- Full audit log viewer
- Email sending for invites (MVP shows link)
- Multi-tenant / child accounts / EN i18n

Schema already includes evaluation/version tables for forward compatibility.

---

## Self-review

| Spec area                             | Task coverage                   |
| ------------------------------------- | ------------------------------- |
| Guided child, no child login          | Task 9                          |
| Better Auth + invites                 | Tasks 3, 5                      |
| Supabase Postgres + Prisma            | Task 2                          |
| Private Storage + signed URL          | Task 8                          |
| M:N assignment history + parent links | Task 6                          |
| Categories/stories/pages/status       | Task 7                          |
| Sessions + observations               | Task 9                          |
| Server policies                       | Task 4                          |
| ID UI + Comic Sans child mode         | Tasks 3, 9                      |
| Tests                                 | Tasks 4, 7, 10                  |
| Supabase setup docs                   | Already in `docs/ROADMAP.md` §3 |

Type names aligned: `UserRole`, `StoryStatus`, `MediaKind`, `canAccessStudent`, `LearningSession`, bucket `cermin-media`.
