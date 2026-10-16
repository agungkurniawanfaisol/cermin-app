# FAQ & Petunjuk (Bantuan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman `/dashboard/bantuan` dengan tab FAQ (CRUD Admin) dan Petunjuk (upload PDF Admin + preview/unduh untuk semua peran login).

**Architecture:** Model Prisma `FaqItem` + `GuideDocument` (bukan `MediaAsset`). Mutasi lewat Server Actions + Zod + `requireRole("ADMIN")` + `writeAudit`. Baca PDF lewat Route Handler `/api/guides/[id]` yang mengeluarkan signed URL TTL pendek setelah authz. UI: Server Components + client tabs/accordion/uploader tipis.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Supabase Storage (`cermin-media`), Better Auth, Vitest, Zod, Tailwind (calm light tokens).

**Spec:** [`docs/superpowers/specs/2026-10-16-faq-petunjuk-bantuan-design.md`](../specs/2026-10-16-faq-petunjuk-bantuan-design.md)

---

## File map

| File                                                                 | Responsibility                                 |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| `prisma/schema.prisma`                                               | Model `FaqItem`, `GuideDocument` + relasi User |
| `prisma/migrations/20261016070000_faq_guide_documents/migration.sql` | Migrasi tabel + index                          |
| `src/server/validations/help.ts`                                     | Zod FAQ + guide upload/meta                    |
| `src/server/policies/access.ts`                                      | `assertCanAccessGuide`                         |
| `src/server/actions/faqs.ts`                                         | list/create/update/delete FAQ                  |
| `src/server/actions/guides.ts`                                       | list/upload/update/delete guide                |
| `src/app/api/guides/[id]/route.ts`                                   | Signed URL PDF                                 |
| `src/app/dashboard/bantuan/page.tsx`                                 | Halaman + Suspense                             |
| `src/app/dashboard/bantuan/bantuan-tabs.tsx`                         | Client tabs FAQ \| Petunjuk                    |
| `src/app/dashboard/bantuan/faq-panel.tsx`                            | Accordion + Admin forms                        |
| `src/app/dashboard/bantuan/guide-panel.tsx`                          | List + preview + upload                        |
| `src/server/queries/dashboard-shell.ts`                              | Nav item Bantuan                               |
| `src/components/dashboard/dashboard-nav.tsx`                         | Ikon `CircleHelp`                              |
| `src/lib/dashboard-breadcrumbs.ts`                                   | Label `bantuan`                                |
| `src/lib/audit-actions.ts`                                           | Aksi audit FAQ/guide                           |
| `prisma/seed.ts`                                                     | 1–2 FAQ contoh (opsional)                      |
| `tests/unit/help-authz.test.ts`                                      | Published filter + policy guide                |
| `tests/integration/help-actions.test.ts`                             | Admin vs non-admin mutasi + audit              |

---

### Task 1: Prisma schema + migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261016070000_faq_guide_documents/migration.sql`

- [ ] **Step 1: Add models to schema**

On `User`, add:

```prisma
  faqsCreated   FaqItem[]        @relation("FaqCreator")
  guidesUploaded GuideDocument[] @relation("GuideUploader")
```

Append models (before or after `MediaAsset` block is fine):

```prisma
model FaqItem {
  id          String   @id @default(uuid()) @db.Uuid
  question    String
  answer      String
  sortOrder   Int      @default(0)
  isPublished Boolean  @default(true)
  createdById String   @db.Uuid
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   User     @relation("FaqCreator", fields: [createdById], references: [id])

  @@index([isPublished, sortOrder])
  @@map("faq_items")
}

model GuideDocument {
  id               String   @id @default(uuid()) @db.Uuid
  title            String
  sortOrder        Int      @default(0)
  isPublished      Boolean  @default(true)
  storageBucket    String   @default("cermin-media")
  storageKey       String
  mimeType         String
  byteSize         Int
  originalFileName String
  uploadedById     String   @db.Uuid
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  uploadedBy       User     @relation("GuideUploader", fields: [uploadedById], references: [id])

  @@index([isPublished, sortOrder])
  @@map("guide_documents")
}
```

- [ ] **Step 2: Write migration SQL**

```sql
-- CreateTable
CREATE TABLE "faq_items" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guide_documents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "storageBucket" TEXT NOT NULL DEFAULT 'cermin-media',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "faq_items_isPublished_sortOrder_idx" ON "faq_items"("isPublished", "sortOrder");
CREATE INDEX "guide_documents_isPublished_sortOrder_idx" ON "guide_documents"("isPublished", "sortOrder");

ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guide_documents" ADD CONSTRAINT "guide_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 3: Generate client + apply migrate**

Run:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

Expected: client regenerated; migration applied (or `migrate dev` locally if preferred).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261016070000_faq_guide_documents
git commit -m "$(cat <<'EOF'
feat(db): add FaqItem and GuideDocument for bantuan

EOF
)"
```

---

### Task 2: Zod validations + audit action names

**Files:**

- Create: `src/server/validations/help.ts`
- Modify: `src/lib/audit-actions.ts`

- [ ] **Step 1: Create validations**

```ts
import { z } from "zod";

export const faqIdSchema = z.object({
  id: z.string().uuid("ID FAQ tidak valid"),
});

export const faqUpsertSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Pertanyaan wajib")
    .max(300, "Pertanyaan terlalu panjang"),
  answer: z
    .string()
    .trim()
    .min(1, "Jawaban wajib")
    .max(5000, "Jawaban terlalu panjang"),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  isPublished: z.boolean().optional(),
});

export const guideIdSchema = z.object({
  id: z.string().uuid("ID petunjuk tidak valid"),
});

export const guideMetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul wajib")
    .max(200, "Judul terlalu panjang"),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  isPublished: z.boolean().optional(),
});

export const GUIDE_MAX_BYTES = 10 * 1024 * 1024;
export const GUIDE_MIME = "application/pdf";
```

- [ ] **Step 2: Extend audit catalogs**

In `OPTIONAL_AUDIT_ACTIONS` add:

```ts
  "faq.create",
  "faq.update",
  "faq.delete",
  "guide.upload",
  "guide.update",
  "guide.delete",
```

- [ ] **Step 3: Commit**

```bash
git add src/server/validations/help.ts src/lib/audit-actions.ts
git commit -m "$(cat <<'EOF'
feat: add help Zod schemas and audit action names

EOF
)"
```

---

### Task 3: Policy `assertCanAccessGuide` (TDD)

**Files:**

- Modify: `src/server/policies/access.ts`
- Create: `tests/unit/help-access.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  canAccessGuideDocument,
  type PolicyUser,
} from "@/server/policies/access";

const admin: PolicyUser = { id: "a", role: "ADMIN", status: "ACTIVE" };
const terapis: PolicyUser = { id: "t", role: "TERAPIS", status: "ACTIVE" };
const ortu: PolicyUser = { id: "o", role: "ORANG_TUA", status: "ACTIVE" };
const disabled: PolicyUser = {
  id: "d",
  role: "TERAPIS",
  status: "DISABLED",
};

describe("canAccessGuideDocument", () => {
  it("allows any active user for published guide", () => {
    expect(canAccessGuideDocument(admin, { isPublished: true })).toBe(true);
    expect(canAccessGuideDocument(terapis, { isPublished: true })).toBe(true);
    expect(canAccessGuideDocument(ortu, { isPublished: true })).toBe(true);
  });

  it("allows only admin for unpublished guide", () => {
    expect(canAccessGuideDocument(admin, { isPublished: false })).toBe(true);
    expect(canAccessGuideDocument(terapis, { isPublished: false })).toBe(false);
    expect(canAccessGuideDocument(ortu, { isPublished: false })).toBe(false);
  });

  it("denies disabled users", () => {
    expect(canAccessGuideDocument(disabled, { isPublished: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm exec vitest run tests/unit/help-access.test.ts
```

Expected: FAIL — `canAccessGuideDocument` not exported.

- [ ] **Step 3: Implement helper**

In `src/server/policies/access.ts`:

```ts
export function canAccessGuideDocument(
  user: PolicyUser,
  guide: { isPublished: boolean },
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (user.role === "ADMIN") return true;
  return guide.isPublished;
}

export async function assertCanAccessGuide(
  user: PolicyUser,
  guideId: string,
): Promise<void> {
  const guide = await prisma.guideDocument.findUnique({
    where: { id: guideId },
    select: { isPublished: true },
  });
  if (!guide) throw new AuthzError("Tidak ditemukan", 404);
  if (!canAccessGuideDocument(user, guide)) throw new AuthzError();
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm exec vitest run tests/unit/help-access.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/server/policies/access.ts tests/unit/help-access.test.ts
git commit -m "$(cat <<'EOF'
feat: add guide document access policy with tests

EOF
)"
```

---

### Task 4: FAQ server actions (TDD authz)

**Files:**

- Create: `src/server/actions/faqs.ts`
- Create: `tests/integration/faq-actions.test.ts` (skip if no `DATABASE_URL`, follow existing integration pattern)

- [ ] **Step 1: Implement `faqs.ts`**

Mirror patterns from `src/server/actions/students.ts` / invites (`ActionResult`, `toActionError`, `writeAudit`, `revalidatePath`).

Required exports:

```ts
export type ListedFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
};

export async function listFaqsForViewer(): Promise<ListedFaq[]>;
// non-admin: where isPublished true; admin: all
// orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]

export async function createFaq(
  input: z.infer<typeof faqUpsertSchema>,
): Promise<ActionResult<{ id: string }>>;

export async function updateFaq(
  input: { id: string } & Partial<z.infer<typeof faqUpsertSchema>>,
): Promise<ActionResult<{ id: string }>>;

export async function deleteFaq(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>>;
```

Rules:

- List: `await requireSession()`; filter unpublished unless `ADMIN`.
- Mutations: `await requireRole("ADMIN")`; Zod; `writeAudit` with action `faq.create|update|delete`, `entityType: "FaqItem"`, metadata `{ question }` only (truncate to 120 chars) — never full answer.
- `revalidatePath("/dashboard/bantuan")`.

- [ ] **Step 2: Unit-style authz test without DB** (mock `requireRole` OR integration if mocks heavy)

Prefer thin test file `tests/unit/faq-list-filter.test.ts` that tests a pure helper if you extract:

```ts
export function faqListWhere(role: PolicyUser["role"]) {
  return role === "ADMIN" ? {} : { isPublished: true };
}
```

Put helper in `faqs.ts` or `access.ts` and test it.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/faqs.ts tests/unit/faq-list-filter.test.ts
git commit -m "$(cat <<'EOF'
feat: add FAQ list and admin CRUD actions

EOF
)"
```

---

### Task 5: Guide actions + signed URL API

**Files:**

- Create: `src/server/actions/guides.ts`
- Create: `src/app/api/guides/[id]/route.ts`
- Create: `tests/unit/guide-upload-validate.test.ts` (mime/size pure checks)

- [ ] **Step 1: Pure upload validators + test**

In `src/server/validations/help.ts` add:

```ts
export function assertValidGuideFile(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  const nameOk = file.name.toLowerCase().endsWith(".pdf");
  if (file.type !== GUIDE_MIME && !nameOk) {
    return "File harus PDF";
  }
  if (file.type !== GUIDE_MIME && nameOk) {
    // some browsers send empty type — allow if extension pdf
  } else if (file.type !== GUIDE_MIME) {
    return "File harus PDF";
  }
  if (file.size <= 0) return "File kosong";
  if (file.size > GUIDE_MAX_BYTES) return "Ukuran PDF maksimal 10 MB";
  return null;
}
```

Test cases: wrong mime, oversize, ok.

- [ ] **Step 2: Implement `guides.ts`**

```ts
export type ListedGuide = {
  id: string;
  title: string;
  sortOrder: number;
  isPublished: boolean;
  originalFileName: string;
  byteSize: number;
  updatedAt: Date;
};

export async function listGuidesForViewer(): Promise<ListedGuide[]>;
export async function uploadGuide(
  formData: FormData,
): Promise<ActionResult<{ id: string }>>;
export async function updateGuideMeta(
  input: { id: string } & z.infer<typeof guideMetaSchema>,
): Promise<ActionResult<{ id: string }>>;
export async function deleteGuide(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>>;
```

Upload flow (Admin only):

1. Parse `title` + `file` from FormData.
2. `assertValidGuideFile`.
3. `const id = randomUUID()`.
4. `storageKey = \`guides/${id}.pdf\``.
5. Upload buffer via `getSupabaseAdmin().storage.from("cermin-media").upload(...)`.
6. `prisma.guideDocument.create({ data: { id, title, storageKey, mimeType: GUIDE_MIME, byteSize, originalFileName, uploadedById } })`.
7. On DB failure after upload: `storage.remove([storageKey])`.
8. `writeAudit({ action: "guide.upload", entityType: "GuideDocument", entityId: id, metadata: { title } })`.
9. `revalidatePath("/dashboard/bantuan")`.

Delete: Admin → remove storage object → delete row → audit `guide.delete`.

- [ ] **Step 3: API route**

Copy structure from `src/app/api/media/[id]/route.ts`:

```ts
// GET /api/guides/[id]?redirect=1
// requireSession → guideIdSchema → assertCanAccessGuide → createSignedUrl(storageKey, 120)
// JSON { url } or redirect
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/guides.ts src/server/validations/help.ts \
  src/app/api/guides src/tests/unit/guide-upload-validate.test.ts \
  tests/unit/guide-upload-validate.test.ts
git commit -m "$(cat <<'EOF'
feat: add guide PDF upload actions and signed URL API

EOF
)"
```

---

### Task 6: Nav + breadcrumbs

**Files:**

- Modify: `src/server/queries/dashboard-shell.ts`
- Modify: `src/components/dashboard/dashboard-nav.tsx`
- Modify: `src/lib/dashboard-breadcrumbs.ts`
- Test: extend or add `tests/unit/dashboard-breadcrumbs.test.ts` if exists; else quick assert in new file

- [ ] **Step 1: Insert nav item before Pengaturan**

```ts
    { href: "/dashboard/sesi", label: "Sesi" },
    ...(user.role === "ADMIN"
      ? [{ href: "/dashboard/pengguna", label: "Pengguna" }]
      : []),
    { href: "/dashboard/bantuan", label: "Bantuan" },
    { href: "/dashboard/pengaturan", label: "Pengaturan" },
```

- [ ] **Step 2: Icon map**

```ts
import { CircleHelp /* existing */ } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  // ...
  "/dashboard/bantuan": CircleHelp,
};
```

- [ ] **Step 3: Breadcrumb label**

```ts
  bantuan: "Bantuan",
```

- [ ] **Step 4: Commit**

```bash
git add src/server/queries/dashboard-shell.ts \
  src/components/dashboard/dashboard-nav.tsx \
  src/lib/dashboard-breadcrumbs.ts
git commit -m "$(cat <<'EOF'
feat: add Bantuan nav item and breadcrumb

EOF
)"
```

---

### Task 7: UI — page shell + tabs

**Files:**

- Create: `src/app/dashboard/bantuan/page.tsx`
- Create: `src/app/dashboard/bantuan/bantuan-tabs.tsx`

- [ ] **Step 1: Server page**

```tsx
import { Suspense } from "react";
import { requireSession } from "@/server/policies/access";
import { listFaqsForViewer } from "@/server/actions/faqs";
import { listGuidesForViewer } from "@/server/actions/guides";
import { BantuanTabs } from "./bantuan-tabs";

export const instant = false;

async function BantuanContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const sp = await searchParams;
  const tabRaw = typeof sp.tab === "string" ? sp.tab : "faq";
  const tab = tabRaw === "petunjuk" ? "petunjuk" : "faq";

  const [faqs, guides] = await Promise.all([
    listFaqsForViewer(),
    listGuidesForViewer(),
  ]);

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
        Bantuan
      </h1>
      <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
        FAQ dan petunjuk penggunaan.
      </p>
      <div className="mt-6">
        <BantuanTabs
          initialTab={tab}
          faqs={faqs}
          guides={guides}
          isAdmin={user.role === "ADMIN"}
        />
      </div>
    </main>
  );
}

export default function BantuanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 px-4 py-6">
          <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat bantuan…</p>
        </main>
      }
    >
      <BantuanContent searchParams={searchParams} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Tabs client**

Use existing `@/components/ui/tabs` + `useRouter` to sync `?tab=` (same pattern as `ListStatusTabs`).

Render placeholders for panels first; wire real panels in Task 8–9.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/bantuan
git commit -m "$(cat <<'EOF'
feat: add Bantuan page shell with FAQ/Petunjuk tabs

EOF
)"
```

---

### Task 8: FAQ panel UI

**Files:**

- Create: `src/app/dashboard/bantuan/faq-panel.tsx`
- Wire into `bantuan-tabs.tsx`

- [ ] **Step 1: Accordion list (all roles)**

Use `<details>` / `<summary>` for calm UI (no flashy animation). Render `question` + `answer` as plain text (`whitespace-pre-wrap`). **No** `dangerouslySetInnerHTML`.

- [ ] **Step 2: Admin controls**

Client forms calling `createFaq` / `updateFaq` / `deleteFaq` via `useTransition`; `router.refresh()` on success. Confirm before delete. Fields: question, answer, sortOrder, isPublished checkbox.

- [ ] **Step 3: Empty state**

“Belum ada FAQ.” Admin: CTA fokus ke form tambah.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/bantuan/faq-panel.tsx src/app/dashboard/bantuan/bantuan-tabs.tsx
git commit -m "$(cat <<'EOF'
feat: add FAQ accordion and admin CRUD UI

EOF
)"
```

---

### Task 9: Guide panel UI (list + preview + upload)

**Files:**

- Create: `src/app/dashboard/bantuan/guide-panel.tsx`
- Wire into `bantuan-tabs.tsx`

- [ ] **Step 1: List + selection state**

Client component: selected `guideId`. Desktop: `md:grid md:grid-cols-[minmax(12rem,16rem)_1fr]`. Mobile: stack list then preview.

- [ ] **Step 2: Preview**

When selected, fetch `/api/guides/${id}` → `{ url }` → `<iframe title={title} src={url} className="h-[70vh] w-full rounded-xl border ..." />`. Show Unduh as `<a href={url} download={originalFileName}>` or open in new tab. Handle loading/error quietly.

Refresh signed URL if iframe fails after TTL (optional: re-fetch on focus).

- [ ] **Step 3: Admin upload**

Form: title input + file input `accept="application/pdf,.pdf"` + submit → `uploadGuide(FormData)`. Delete button → `deleteGuide`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/bantuan/guide-panel.tsx src/app/dashboard/bantuan/bantuan-tabs.tsx
git commit -m "$(cat <<'EOF'
feat: add guide PDF list, inline preview, and admin upload

EOF
)"
```

---

### Task 10: Seed FAQ + integration authz tests

**Files:**

- Modify: `prisma/seed.ts`
- Create: `tests/integration/help-actions.test.ts` (follow skip-without-DB pattern from existing integration tests)

- [ ] **Step 1: Seed 2 FAQ**

After admin user exists:

```ts
await prisma.faqItem.createMany({
  data: [
    {
      question: "Bagaimana cara mulai sesi belajar?",
      answer:
        "Buka menu Sesi, pilih murid dan cerita yang sudah terbit, lalu mulai. Mode anak terbuka di /belajar.",
      sortOrder: 0,
      isPublished: true,
      createdById: admin.id,
    },
    {
      question: "Siapa yang bisa mengarsipkan murid?",
      answer: "Hanya Admin, dengan alasan arsip.",
      sortOrder: 1,
      isPublished: true,
      createdById: admin.id,
    },
  ],
});
```

Use upsert/skip if seed already re-runnable (match existing seed style).

- [ ] **Step 2: Integration tests**

Cases (mock session via existing test helpers if any):

1. Terapis `createFaq` → `ok: false` / AuthzError; no row.
2. Admin `createFaq` → ok; exactly one `auditLog` with `faq.create`.
3. Unpublished FAQ not returned by list for Terapis (create as admin unpublished, list as terapis).

If session mocking is heavy, keep unit coverage from Tasks 3–4 and document manual checklist.

- [ ] **Step 3: Run unit suite**

```bash
pnpm test:unit
```

Expected: new help tests pass; no regressions.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts tests/integration/help-actions.test.ts
git commit -m "$(cat <<'EOF'
feat: seed sample FAQs and add help authz integration tests

EOF
)"
```

---

### Task 11: Manual verification checklist

- [ ] **Step 1: Local smoke**

1. Login Admin → nav **Bantuan** muncul.
2. Tab FAQ: lihat seed; tambah/edit/hapus FAQ.
3. Tab Petunjuk: upload PDF kecil; preview iframe muncul; Unduh jalan.
4. Login Terapis: lihat FAQ + PDF; tidak ada kontrol upload/CRUD.
5. DevTools: response `/api/guides/[id]` returns signed URL (not permanent public path); bucket remains private.

- [ ] **Step 2: Responsive**

Cek ~375px (list → preview stack) dan ~1280px (split pane).

---

## Spec coverage (self-review)

| Spec requirement                    | Task        |
| ----------------------------------- | ----------- |
| FaqItem + GuideDocument models      | 1           |
| Private storage + signed URL        | 5           |
| Admin CRUD FAQ / upload PDF         | 4, 5, 8, 9  |
| All roles read published            | 3, 4, 5     |
| `/dashboard/bantuan` + tabs         | 7           |
| Inline preview + unduh              | 9           |
| Nav Bantuan                         | 6           |
| Audit mutations                     | 4, 5, 2     |
| Tests authz                         | 3, 4, 10    |
| Seed FAQ                            | 10          |
| Out of scope (role filter, non-PDF) | Not planned |

## Placeholder scan

No TBD / “implement later” left in tasks above.
