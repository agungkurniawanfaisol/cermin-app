import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  MediaKind,
  PrismaClient,
  StoryStatus,
  StudentStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "better-auth/crypto";

config({ path: resolve(process.cwd(), ".env.local") });
config();

const MEDIA_BUCKET = "cermin-media";

/** Calm cover palettes (RGB) for seeded story thumbnails. */
const COVER_PALETTES: Array<[number, number, number]> = [
  [230, 242, 238], // accent-soft
  [200, 224, 214],
  [180, 210, 198],
  [216, 232, 226],
  [190, 218, 208],
  [210, 228, 220],
  [172, 204, 192],
  [222, 236, 230],
];

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Solid soft PNG cover (no sharp dependency). */
function solidCoverPng(
  width: number,
  height: number,
  rgb: [number, number, number],
): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      // Soft vertical gradient toward accent green
      const t = y / Math.max(1, height - 1);
      raw[i] = Math.round(rgb[0] * (1 - t * 0.12));
      raw[i + 1] = Math.round(rgb[1] * (1 - t * 0.08));
      raw[i + 2] = Math.round(rgb[2] * (1 - t * 0.1));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function getSeedSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Marker di storageKey: foto unduhan internet (bukan PNG solid lama). */
function isWebSeedKey(storageKey: string): boolean {
  return storageKey.includes("-seed-web-");
}

async function removeStorageObject(storageKey: string | null | undefined) {
  if (!storageKey) return;
  const supabase = getSeedSupabase();
  if (!supabase) return;
  try {
    await supabase.storage.from(MEDIA_BUCKET).remove([storageKey]);
  } catch {
    // ignore
  }
}

/**
 * Unduh foto dari internet (picsum deterministik / pravatar untuk portrait).
 * Fallback PNG solid jika fetch gagal.
 */
async function fetchSeedPhoto(opts: {
  width: number;
  height: number;
  seed: string;
  kind: "cover" | "illustration" | "portrait" | "category";
}): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const urls: string[] =
    opts.kind === "portrait"
      ? [
          // Wajah konsisten per seed (uji portrait murid)
          `https://i.pravatar.cc/${Math.max(opts.width, opts.height)}?u=${encodeURIComponent(opts.seed)}`,
          `https://picsum.photos/seed/${encodeURIComponent(opts.seed)}/${opts.width}/${opts.height}`,
        ]
      : [
          `https://picsum.photos/seed/${encodeURIComponent(opts.seed)}/${opts.width}/${opts.height}`,
          `https://picsum.photos/${opts.width}/${opts.height}?random=${encodeURIComponent(opts.seed)}`,
        ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { Accept: "image/jpeg,image/png,image/webp,*/*" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const contentType =
        (res.headers.get("content-type") ?? "image/jpeg").split(";")[0]!.trim() ||
        "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 500) continue;
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
      return { buffer, contentType, ext };
    } catch {
      // coba URL berikutnya
    }
  }

  const rgb =
    COVER_PALETTES[
      Math.abs(
        [...opts.seed].reduce((a, c) => a + c.charCodeAt(0), 0),
      ) % COVER_PALETTES.length
    ]!;
  console.warn("  ! fallback solid PNG:", opts.seed);
  return {
    buffer: solidCoverPng(opts.width, opts.height, rgb),
    contentType: "image/png",
    ext: "png",
  };
}

async function uploadSeedPhoto(opts: {
  storageKey: string;
  width: number;
  height: number;
  seed: string;
  kind: "cover" | "illustration" | "portrait" | "category";
}): Promise<
  { ok: true; byteSize: number; mimeType: string } | { ok: false }
> {
  const supabase = getSeedSupabase();
  if (!supabase) {
    console.warn("  ! skip media (Supabase env missing):", opts.storageKey);
    return { ok: false };
  }
  const photo = await fetchSeedPhoto({
    width: opts.width,
    height: opts.height,
    seed: opts.seed,
    kind: opts.kind,
  });
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(
    opts.storageKey,
    photo.buffer,
    { contentType: photo.contentType, upsert: true },
  );
  if (error) {
    console.warn("  ! upload failed:", opts.storageKey, error.message);
    return { ok: false };
  }
  return {
    ok: true,
    byteSize: photo.buffer.length,
    mimeType: photo.contentType,
  };
}

async function ensureStoryCover(opts: {
  storyId: string;
  title: string;
  createdById: string;
  paletteIndex: number;
}): Promise<boolean> {
  const existing = await prisma.mediaAsset.findFirst({
    where: {
      storyId: opts.storyId,
      pageId: null,
      kind: MediaKind.IMAGE,
      studentId: null,
    },
    select: { id: true, storageKey: true },
  });
  if (existing && isWebSeedKey(existing.storageKey)) return false;
  if (existing) {
    await removeStorageObject(existing.storageKey);
    await prisma.mediaAsset.delete({ where: { id: existing.id } });
  }

  const seed = `cover-${opts.storyId}-${opts.paletteIndex}`;
  const storageKey = `stories/${opts.storyId}/cover-seed-web-${randomUUID()}.jpg`;
  const uploaded = await uploadSeedPhoto({
    storageKey,
    width: 800,
    height: 450,
    seed,
    kind: "cover",
  });
  if (!uploaded.ok) return false;

  await prisma.mediaAsset.create({
    data: {
      storyId: opts.storyId,
      pageId: null,
      studentId: null,
      kind: MediaKind.IMAGE,
      storageBucket: MEDIA_BUCKET,
      storageKey,
      mimeType: uploaded.mimeType,
      byteSize: uploaded.byteSize,
      altText: `Gambar utama: ${opts.title}`,
      sortOrder: 0,
      createdById: opts.createdById,
    },
  });
  console.log("  + cover (web)", opts.title);
  return true;
}

/** Shared story illustration on a page (studentId null). */
async function ensurePageIllustration(opts: {
  storyId: string;
  pageId: string;
  createdById: string;
  paletteIndex: number;
  label: string;
}): Promise<boolean> {
  const existing = await prisma.mediaAsset.findFirst({
    where: {
      pageId: opts.pageId,
      kind: MediaKind.IMAGE,
      studentId: null,
    },
    select: { id: true, storageKey: true },
  });
  if (existing && isWebSeedKey(existing.storageKey)) return false;
  if (existing) {
    await removeStorageObject(existing.storageKey);
    await prisma.mediaAsset.delete({ where: { id: existing.id } });
  }

  const seed = `illust-${opts.pageId}-${opts.paletteIndex}`;
  const storageKey = `stories/${opts.storyId}/pages/${opts.pageId}/illustration-seed-web-${randomUUID()}.jpg`;
  const uploaded = await uploadSeedPhoto({
    storageKey,
    width: 800,
    height: 500,
    seed,
    kind: "illustration",
  });
  if (!uploaded.ok) return false;

  try {
    await prisma.mediaAsset.create({
      data: {
        storyId: opts.storyId,
        pageId: opts.pageId,
        studentId: null,
        kind: MediaKind.IMAGE,
        storageBucket: MEDIA_BUCKET,
        storageKey,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
        altText: `Ilustrasi: ${opts.label}`,
        sortOrder: 0,
        createdById: opts.createdById,
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
  return true;
}

/** Personalized portrait for a page + student. */
async function ensurePagePortrait(opts: {
  storyId: string;
  pageId: string;
  studentId: string;
  studentName: string;
  createdById: string;
  paletteIndex: number;
}): Promise<boolean> {
  const existing = await prisma.mediaAsset.findFirst({
    where: {
      pageId: opts.pageId,
      kind: MediaKind.IMAGE,
      studentId: opts.studentId,
    },
    select: { id: true, storageKey: true },
  });
  if (existing && isWebSeedKey(existing.storageKey)) return false;
  if (existing) {
    await removeStorageObject(existing.storageKey);
    await prisma.mediaAsset.delete({ where: { id: existing.id } });
  }

  const seed = `portrait-${opts.studentId}-${opts.pageId}`;
  const storageKey = `stories/${opts.storyId}/pages/${opts.pageId}/students/${opts.studentId}/portrait-seed-web-${randomUUID()}.jpg`;
  const uploaded = await uploadSeedPhoto({
    storageKey,
    width: 480,
    height: 640,
    seed,
    kind: "portrait",
  });
  if (!uploaded.ok) return false;

  try {
    await prisma.mediaAsset.create({
      data: {
        storyId: opts.storyId,
        pageId: opts.pageId,
        studentId: opts.studentId,
        kind: MediaKind.IMAGE,
        storageBucket: MEDIA_BUCKET,
        storageKey,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
        altText: `Foto ${opts.studentName}`,
        sortOrder: 0,
        createdById: opts.createdById,
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
  return true;
}

async function ensureCategoryCover(opts: {
  categoryId: string;
  name: string;
  paletteIndex: number;
}): Promise<boolean> {
  const row = await prisma.storyCategory.findUnique({
    where: { id: opts.categoryId },
    select: { imageKey: true },
  });
  if (row?.imageKey && isWebSeedKey(row.imageKey)) return false;
  if (row?.imageKey) {
    await removeStorageObject(row.imageKey);
  }

  const seed = `category-${opts.categoryId}-${opts.paletteIndex}`;
  const storageKey = `categories/${opts.categoryId}/cover-seed-web-${randomUUID()}.jpg`;
  const uploaded = await uploadSeedPhoto({
    storageKey,
    width: 960,
    height: 540,
    seed,
    kind: "category",
  });
  if (!uploaded.ok) return false;

  await prisma.storyCategory.update({
    where: { id: opts.categoryId },
    data: { imageKey: storageKey },
  });
  console.log("  + category cover (web)", opts.name);
  return true;
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
  throw new Error(
    "Refusing to seed in production (set ALLOW_SEED=true to override)",
  );
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (needed for seed)");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Shared password for all seeded demo accounts (see DataPenting.md). */
export const SEED_DEMO_PASSWORD =
  process.env.SEED_DEMO_PASSWORD ?? "CerminDemo@2026";

type SeedUser = {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
};

async function ensureUser(spec: SeedUser): Promise<{ id: string; email: string }> {
  const password = spec.password ?? SEED_DEMO_PASSWORD;
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
    include: {
      accounts: { where: { providerId: "credential" } },
      preference: true,
    },
  });

  if (!existing) {
    const hashed = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: spec.email,
          name: spec.name,
          role: spec.role,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          preference: { create: {} },
        },
      });
      await tx.account.create({
        data: {
          userId: created.id,
          accountId: created.id,
          providerId: "credential",
          password: hashed,
        },
      });
      return created;
    });
    console.log("  + user", spec.email, `(${spec.role})`);
    return { id: user.id, email: user.email };
  }

  if (existing.accounts.length === 0) {
    const hashed = await hashPassword(password);
    await prisma.account.create({
      data: {
        userId: existing.id,
        accountId: existing.id,
        providerId: "credential",
        password: hashed,
      },
    });
  }
  if (!existing.preference) {
    await prisma.userPreference.create({ data: { userId: existing.id } });
  }
  if (existing.role !== spec.role || existing.status !== UserStatus.ACTIVE) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: spec.role, status: UserStatus.ACTIVE, name: spec.name },
    });
  }
  return { id: existing.id, email: existing.email };
}

async function ensureCategories(): Promise<Map<string, string>> {
  const activeCategories = [
    {
      name: "Bergiliran",
      description: "Antri dan bergiliran saat bermain bersama teman sebaya",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Menerima Kemenangan dan Kekalahan",
      description: "Mengelola emosi dan merespons hasil permainan secara positif",
      sortOrder: 2,
      isActive: true,
    },
  ];

  const map = new Map<string, string>();
  for (const c of activeCategories) {
    let row = await prisma.storyCategory.findFirst({ where: { name: c.name } });
    if (!row) {
      row = await prisma.storyCategory.create({ data: c });
      console.log("  + category", c.name);
    } else {
      row = await prisma.storyCategory.update({
        where: { id: row.id },
        data: {
          description: c.description,
          sortOrder: c.sortOrder,
          isActive: true,
        },
      });
    }
    map.set(c.name, row.id);
  }

  // Pastikan seluruh kategori lain nonaktif di database.
  const activeNames = activeCategories.map((c) => c.name);
  await prisma.storyCategory.updateMany({
    where: { name: { notIn: activeNames } },
    data: { isActive: false },
  });

  return map;
}

async function ensureStudent(opts: {
  displayName: string;
  fullName: string;
  dob?: string;
  homeAddress: string;
  rt: string;
  rw: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  homeLanguage: string;
  preferQuiet?: boolean;
  preferDimLight?: boolean;
  sensoryNotes?: string;
  allergies?: string;
}) {
  const profile = {
    fullName: opts.fullName,
    homeAddress: opts.homeAddress,
    rt: opts.rt,
    rw: opts.rw,
    phone: opts.phone,
    emergencyContactName: opts.emergencyContactName,
    emergencyContactPhone: opts.emergencyContactPhone,
    homeLanguage: opts.homeLanguage,
    preferQuiet: opts.preferQuiet ?? false,
    preferDimLight: opts.preferDimLight ?? false,
    sensoryNotes: opts.sensoryNotes ?? null,
    allergies: opts.allergies ?? null,
  };

  const found = await prisma.student.findFirst({
    where: { displayName: opts.displayName, adminNotes: { contains: "[seed]" } },
  });
  if (found) {
    if (!found.fullName || !found.emergencyContactName) {
      return prisma.student.update({
        where: { id: found.id },
        data: profile,
      });
    }
    return found;
  }
  const created = await prisma.student.create({
    data: {
      displayName: opts.displayName,
      dateOfBirth: opts.dob ? new Date(opts.dob) : null,
      ...profile,
      adminNotes: "[seed] Data uji coba lokal.",
      status: StudentStatus.ACTIVE,
    },
  });
  console.log("  + student", opts.displayName);
  return created;
}

async function ensureAssignment(
  therapistId: string,
  studentId: string,
  assignedById: string,
) {
  const active = await prisma.therapistAssignment.findFirst({
    where: { therapistId, studentId, endedAt: null },
  });
  if (active) return active;
  return prisma.therapistAssignment.create({
    data: { therapistId, studentId, assignedById },
  });
}

async function ensureParentLink(
  parentId: string,
  studentId: string,
  relationLabel: string,
) {
  const existing = await prisma.parentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (existing) {
    if (!existing.isActive) {
      return prisma.parentLink.update({
        where: { id: existing.id },
        data: { isActive: true, relationLabel },
      });
    }
    return existing;
  }
  return prisma.parentLink.create({
    data: { parentId, studentId, relationLabel },
  });
}

type StorySeed = {
  title: string;
  category: string;
  status: StoryStatus;
  description: string;
  objectives: string;
  pages: string[];
};

async function ensureStory(
  seed: StorySeed,
  categoryId: string,
  createdById: string,
) {
  const found = await prisma.story.findFirst({
    where: { title: seed.title },
    include: { pages: true },
  });
  if (found) {
    const updated = await prisma.story.update({
      where: { id: found.id },
      data: {
        categoryId,
        description: seed.description,
        learningObjectives: seed.objectives,
        status: seed.status,
        publishedAt:
          seed.status === StoryStatus.PUBLISHED
            ? (found.publishedAt ?? new Date())
            : null,
      },
      include: { pages: true },
    });
    if (updated.pages.length === 0) {
      await prisma.storyPage.createMany({
        data: seed.pages.map((bodyText, i) => ({
          storyId: updated.id,
          sortOrder: i + 1,
          bodyText,
        })),
      });
    }
    return updated;
  }

  const story = await prisma.story.create({
    data: {
      title: seed.title,
      categoryId,
      description: seed.description,
      learningObjectives: seed.objectives,
      status: seed.status,
      createdById,
      publishedAt: seed.status === StoryStatus.PUBLISHED ? new Date() : null,
      pages: {
        create: seed.pages.map((bodyText, i) => ({
          sortOrder: i + 1,
          bodyText,
        })),
      },
      versions: {
        create: {
          versionNo: 1,
          snapshotJson: { title: seed.title, pages: seed.pages },
          createdById,
        },
      },
    },
  });
  console.log("  + story", seed.title, `(${seed.status})`);
  return story;
}

type McqChoiceSeed = { key: string; labelText: string };

type McqExampleSeed = {
  prompt: string;
  correctKey: string;
  choices: McqChoiceSeed[];
};

/** Contoh soal tenang — teks saja (tanpa gambar) agar seed tidak butuh Storage. */
function mcqExampleForPage(
  storyTitle: string,
  sortOrder: number,
  bodyText: string,
): McqExampleSeed {
  const titled: Record<string, McqExampleSeed[]> = {
    "Giliran Bermain": [
      {
        prompt: "Apa yang dilakukan saat bermain bersama teman?",
        correctKey: "B",
        choices: [
          { key: "A", labelText: "Merebut mainan" },
          { key: "B", labelText: "Bermain bersama" },
          { key: "C", labelText: "Pergi sendirian" },
          { key: "D", labelText: "Berteriak keras" },
        ],
      },
      {
        prompt: "Jika belum giliran, apa yang bisa dilakukan?",
        correctKey: "A",
        choices: [
          { key: "A", labelText: "Menunggu dengan tenang" },
          { key: "B", labelText: "Merebut giliran" },
          { key: "C", labelText: "Meninggalkan teman" },
          { key: "D", labelText: "Menangis keras" },
        ],
      },
      {
        prompt: "Menunggu giliran itu…",
        correctKey: "C",
        choices: [
          { key: "A", labelText: "Tidak perlu" },
          { key: "B", labelText: "Sulit dan salah" },
          { key: "C", labelText: "Bisa dilakukan dengan tenang" },
          { key: "D", labelText: "Hanya untuk orang dewasa" },
        ],
      },
      {
        prompt: "Ketika giliran datang, apa yang terjadi?",
        correctKey: "B",
        choices: [
          { key: "A", labelText: "Harus marah" },
          { key: "B", labelText: "Boleh bermain dengan senang" },
          { key: "C", labelText: "Harus diam saja" },
          { key: "D", labelText: "Mainan diambil orang lain" },
        ],
      },
    ],
    "Mengikuti permainan sesuai aturan": [
      {
        prompt: "Saat bermain, aturan permainan berguna untuk apa?",
        correctKey: "B",
        choices: [
          { key: "A", labelText: "Membuat semua orang bingung" },
          { key: "B", labelText: "Agar bermain adil dan aman" },
          { key: "C", labelText: "Supaya tidak boleh bermain" },
          { key: "D", labelText: "Hanya untuk wasit" },
        ],
      },
      {
        prompt: "Jika teman sedang menunggu giliran, apa yang baik dilakukan?",
        correctKey: "A",
        choices: [
          { key: "A", labelText: "Menghormati giliran teman" },
          { key: "B", labelText: "Mendorong teman" },
          { key: "C", labelText: "Mengambil mainan paksa" },
          { key: "D", labelText: "Berteriak ke teman" },
        ],
      },
      {
        prompt: "Mengikuti aturan permainan membuat…",
        correctKey: "C",
        choices: [
          { key: "A", labelText: "Teman sedih" },
          { key: "B", labelText: "Permainan berantakan" },
          { key: "C", labelText: "Bermain lebih tenang bersama" },
          { key: "D", labelText: "Harus berhenti bermain" },
        ],
      },
    ],
  };

  const byTitle = titled[storyTitle];
  if (byTitle && byTitle[sortOrder - 1]) {
    return byTitle[sortOrder - 1]!;
  }

  const snippet = bodyText.replace(/\s+/g, " ").trim().slice(0, 48);
  return {
    prompt: snippet
      ? `Dari cerita ini: apa yang paling tepat?`
      : `Apa yang baik dilakukan di halaman ${sortOrder}?`,
    correctKey: "A",
    choices: [
      { key: "A", labelText: "Tenang dan mengikuti alur cerita" },
      { key: "B", labelText: "Berteriak dan marah" },
      { key: "C", labelText: "Meninggalkan teman" },
      { key: "D", labelText: "Merebut giliran" },
    ],
  };
}

async function ensurePageMcqExample(opts: {
  pageId: string;
  storyTitle: string;
  sortOrder: number;
  bodyText: string;
}): Promise<boolean> {
  const existing = await prisma.pageMcq.findUnique({
    where: { pageId: opts.pageId },
    select: { id: true },
  });
  if (existing) return false;

  const seed = mcqExampleForPage(
    opts.storyTitle,
    opts.sortOrder,
    opts.bodyText,
  );
  await prisma.pageMcq.create({
    data: {
      pageId: opts.pageId,
      prompt: seed.prompt,
      correctKey: seed.correctKey,
      choices: {
        create: seed.choices.map((c) => ({
          key: c.key,
          labelText: c.labelText,
        })),
      },
    },
  });
  return true;
}

async function ensureSession(opts: {
  studentId: string;
  storyId: string;
  ledByUserId: string;
  daysAgo: number;
  ended: boolean;
  note?: string;
}) {
  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - opts.daysAgo);
  startedAt.setHours(9 + (opts.daysAgo % 5), 15, 0, 0);
  startedAt.setMilliseconds(0);

  const existing = await prisma.learningSession.findFirst({
    where: {
      studentId: opts.studentId,
      storyId: opts.storyId,
      ledByUserId: opts.ledByUserId,
      startedAt,
    },
  });
  if (existing) return existing;

  const session = await prisma.learningSession.create({
    data: {
      studentId: opts.studentId,
      storyId: opts.storyId,
      ledByUserId: opts.ledByUserId,
      startedAt,
      endedAt: opts.ended
        ? new Date(startedAt.getTime() + 25 * 60 * 1000)
        : null,
    },
  });

  if (opts.note) {
    await prisma.sessionObservation.create({
      data: {
        sessionId: session.id,
        recordedById: opts.ledByUserId,
        note: opts.note,
        recordedAt: new Date(startedAt.getTime() + 10 * 60 * 1000),
      },
    });
  }
  return session;
}

async function main() {
  console.log("CERMIN seed — demo data");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cermin.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-strong";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrator";

  const admin = await ensureUser({
    email: adminEmail,
    name: adminName,
    role: UserRole.ADMIN,
    password: adminPassword,
  });

  const therapistsSpec: SeedUser[] = [
    { email: "terapis1@cermin.local", name: "Sari Terapis", role: UserRole.TERAPIS },
    { email: "terapis2@cermin.local", name: "Budi Terapis", role: UserRole.TERAPIS },
    { email: "terapis3@cermin.local", name: "Dewi Terapis", role: UserRole.TERAPIS },
    { email: "terapis4@cermin.local", name: "Andi Terapis", role: UserRole.TERAPIS },
  ];

  const parentsSpec: SeedUser[] = [
    { email: "ortu.alya@cermin.local", name: "Ibu Alya", role: UserRole.ORANG_TUA },
    { email: "ortu.raya@cermin.local", name: "Ayah Raya", role: UserRole.ORANG_TUA },
    { email: "ortu.nisa@cermin.local", name: "Ibu Nisa", role: UserRole.ORANG_TUA },
    { email: "ortu.dimas@cermin.local", name: "Ayah Dimas", role: UserRole.ORANG_TUA },
    { email: "ortu.kira@cermin.local", name: "Ibu Kira", role: UserRole.ORANG_TUA },
    { email: "ortu.fino@cermin.local", name: "Ayah Fino", role: UserRole.ORANG_TUA },
    { email: "ortu.mira@cermin.local", name: "Ibu Mira", role: UserRole.ORANG_TUA },
    { email: "ortu.zada@cermin.local", name: "Wali Zada", role: UserRole.ORANG_TUA },
  ];

  const therapists = [];
  for (const t of therapistsSpec) therapists.push(await ensureUser(t));
  const parents = [];
  for (const p of parentsSpec) parents.push(await ensureUser(p));

  const categories = await ensureCategories();

  const studentNames = [
    {
      name: "Alya",
      fullName: "Alya Putri Santoso",
      dob: "2018-03-12",
      homeAddress: "Jl. Melati No. 12, Bandung",
      rt: "003",
      rw: "005",
      phone: "081234560001",
    },
    {
      name: "Raya",
      fullName: "Raya Aditya Pratama",
      dob: "2017-11-02",
      homeAddress: "Jl. Kenanga No. 4, Bandung",
      rt: "001",
      rw: "002",
      phone: "081234560002",
    },
    {
      name: "Nisa",
      fullName: "Annisa Rahmawati",
      dob: "2019-01-20",
      homeAddress: "Jl. Anggrek No. 8, Cimahi",
      rt: "007",
      rw: "001",
      phone: "081234560003",
    },
    {
      name: "Dimas",
      fullName: "Dimas Nugroho",
      dob: "2018-07-08",
      homeAddress: "Jl. Mawar No. 21, Bandung",
      rt: "002",
      rw: "004",
      phone: "081234560004",
    },
    {
      name: "Kira",
      fullName: "Kira Amelia",
      dob: "2016-09-15",
      homeAddress: "Jl. Dahlia No. 3, Bandung",
      rt: "005",
      rw: "003",
      phone: "081234560005",
    },
    {
      name: "Fino",
      fullName: "Fino Wijaya",
      dob: "2019-05-30",
      homeAddress: "Jl. Flamboyan No. 9, Bandung",
      rt: "004",
      rw: "006",
      phone: "081234560006",
    },
    {
      name: "Mira",
      fullName: "Mira Kusuma",
      dob: "2017-02-14",
      homeAddress: "Jl. Cempaka No. 15, Bandung",
      rt: "006",
      rw: "002",
      phone: "081234560007",
    },
    {
      name: "Zada",
      fullName: "Zada Harun",
      dob: "2018-12-01",
      homeAddress: "Jl. Teratai No. 2, Bandung",
      rt: "008",
      rw: "001",
      phone: "081234560008",
    },
    {
      name: "Omar",
      fullName: "Omar Farhan",
      dob: "2016-04-22",
      homeAddress: "Jl. Sakura No. 11, Bandung",
      rt: "001",
      rw: "007",
      phone: "081234560009",
    },
    {
      name: "Luna",
      fullName: "Luna Safira",
      dob: "2019-08-09",
      homeAddress: "Jl. Bougenville No. 6, Cimahi",
      rt: "003",
      rw: "003",
      phone: "081234560010",
    },
    {
      name: "Galih",
      fullName: "Galih Prasetyo",
      dob: "2017-06-18",
      homeAddress: "Jl. Cemara No. 18, Bandung",
      rt: "009",
      rw: "004",
      phone: "081234560011",
    },
    {
      name: "Salsa",
      fullName: "Salsa Bilqis",
      dob: "2018-10-25",
      homeAddress: "Jl. Pinus No. 7, Bandung",
      rt: "002",
      rw: "008",
      phone: "081234560012",
    },
  ];

  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const s = studentNames[i]!;
    students.push(
      await ensureStudent({
        displayName: s.name,
        fullName: s.fullName,
        dob: s.dob,
        homeAddress: s.homeAddress,
        rt: s.rt,
        rw: s.rw,
        phone: s.phone,
        emergencyContactName: `Kontak ${s.name}`,
        emergencyContactPhone: `08129876${String(1000 + i).slice(-4)}`,
        homeLanguage: i % 3 === 0 ? "Sunda" : "Indonesia",
        preferQuiet: i % 2 === 0,
        preferDimLight: i % 4 === 0,
        sensoryNotes:
          i % 2 === 0 ? "Hindari suara mendadak; bicara pelan." : undefined,
        allergies: i === 0 ? "Tidak ada alergi diketahui." : undefined,
      }),
    );
  }

  // Assignments: cycle therapists across students
  for (let i = 0; i < students.length; i++) {
    const therapist = therapists[i % therapists.length]!;
    await ensureAssignment(therapist.id, students[i]!.id, admin.id);
  }

  // Parent links for first 8 students (1:1 with parents)
  for (let i = 0; i < parents.length; i++) {
    const relations = ["Ibu", "Ayah", "Ibu", "Ayah", "Ibu", "Ayah", "Ibu", "Wali"];
    await ensureParentLink(parents[i]!.id, students[i]!.id, relations[i]!);
  }
  // Extra: second parent for Alya
  await ensureParentLink(parents[1]!.id, students[0]!.id, "Ayah");

  const storySeeds: StorySeed[] = [
    {
      title: "Giliran Bermain",
      category: "Bergiliran",
      status: StoryStatus.PUBLISHED,
      description: "Belajar menunggu giliran saat bermain bersama.",
      objectives: "Anak menunggu giliran tanpa merebut mainan.",
      pages: [
        "Hari ini aku bermain bersama teman.",
        "Kadang aku harus menunggu giliran.",
        "Aku bisa menunggu dengan tenang.",
        "Ketika giliran datang, aku bermain dengan senang.",
      ],
    },
    {
      title: "Menunggu Antrian",
      category: "Bergiliran",
      status: StoryStatus.PUBLISHED,
      description: "Antri di kantin atau toilet.",
      objectives: "Anak berdiri di antrian dengan aman.",
      pages: [
        "Di sekolah ada antrian.",
        "Aku berdiri di belakang teman.",
        "Aku menunggu sampai giliranku.",
        "Menunggu itu bagian dari hari yang baik.",
      ],
    },
    {
      title: "Berbagi Mainan",
      category: "Bergiliran",
      status: StoryStatus.PUBLISHED,
      description: "Berbagi mainan favorit.",
      objectives: "Anak menawarkan mainan kepada teman.",
      pages: [
        "Aku punya mainan yang aku suka.",
        "Teman juga ingin mencoba.",
        "Aku bisa berbagi untuk beberapa menit.",
        "Berbagi membuat bermain lebih menyenangkan.",
      ],
    },
    {
      title: "Main Lego Bersama",
      category: "Bergiliran",
      status: StoryStatus.PUBLISHED,
      description: "Membangun bersama teman.",
      objectives: "Anak bergiliran mengambil balok.",
      pages: [
        "Kami membangun menara lego.",
        "Aku mengambil satu balok.",
        "Teman mengambil balok berikutnya.",
        "Menara kami jadi tinggi bersama.",
      ],
    },
    {
      title: "Giliran Bicara",
      category: "Bergiliran",
      status: StoryStatus.PUBLISHED,
      description: "Menunggu giliran berbicara di lingkaran kelas.",
      objectives: "Anak menunggu gilirannya berbicara tanpa memotong.",
      pages: [
        "Kami duduk melingkar di kelas.",
        "Setiap anak punya giliran bicara.",
        "Aku mendengarkan teman sampai selesai.",
        "Ketika giliranku, aku bicara dengan tenang.",
      ],
    },
    {
      title: "Antri di Ayunan",
      category: "Bergiliran",
      status: StoryStatus.PUBLISHED,
      description: "Bergiliran memakai ayunan di halaman.",
      objectives: "Anak menunggu di luar ayunan lalu naik saat giliran.",
      pages: [
        "Ayunan sedang dipakai teman.",
        "Aku berdiri di antrian ayunan.",
        "Aku menunggu dengan tenang.",
        "Ketika kosong, giliranku naik ayunan.",
      ],
    },
    {
      title: "Menang dan Kalah",
      category: "Menerima Kemenangan dan Kekalahan",
      status: StoryStatus.PUBLISHED,
      description: "Menerima hasil permainan dengan tenang.",
      objectives: "Anak menerima menang/kalah tanpa tantrum.",
      pages: [
        "Kami bermain permainan yang seru.",
        "Kadang aku menang. Kadang aku kalah.",
        "Jika kalah, aku boleh sedih sebentar.",
        "Lalu aku bilang: 'Selamat!' kepada teman.",
      ],
    },
    {
      title: "Ucapkan Selamat",
      category: "Menerima Kemenangan dan Kekalahan",
      status: StoryStatus.PUBLISHED,
      description: "Mengucapkan selamat saat teman menang.",
      objectives: "Anak mengucapkan selamat tanpa marah.",
      pages: [
        "Teman menang dalam permainan.",
        "Aku merasa sedikit kecewa.",
        "Aku menarik napas pelan.",
        "Aku bilang: 'Selamat, ya!'",
      ],
    },
    {
      title: "Main Lagi Besok",
      category: "Menerima Kemenangan dan Kekalahan",
      status: StoryStatus.PUBLISHED,
      description: "Tetap semangat bermain lagi setelah kalah.",
      objectives: "Anak mau bermain lagi di kesempatan berikutnya.",
      pages: [
        "Hari ini aku kalah.",
        "Itu tidak apa-apa.",
        "Besok aku bisa bermain lagi.",
        "Bermain itu menyenangkan bersama teman.",
      ],
    },
    {
      title: "Napas Saat Kecewa",
      category: "Menerima Kemenangan dan Kekalahan",
      status: StoryStatus.PUBLISHED,
      description: "Tenangkan diri saat hasil permainan mengecewakan.",
      objectives: "Anak memakai napas pelan saat kecewa.",
      pages: [
        "Aku merasa kecewa.",
        "Aku meletakkan tangan di dada.",
        "Aku menarik napas pelan tiga kali.",
        "Tubuhku lebih tenang, siap lanjut bermain.",
      ],
    },
    {
      title: "Piala untuk Semua",
      category: "Menerima Kemenangan dan Kekalahan",
      status: StoryStatus.PUBLISHED,
      description: "Semua pemain berharga, bukan hanya yang menang.",
      objectives: "Anak menghargai usaha diri dan teman.",
      pages: [
        "Ada yang menang hari ini.",
        "Semua sudah berusaha dengan baik.",
        "Aku bangga sudah ikut bermain.",
        "Kita semua boleh senang bersama.",
      ],
    },
    {
      title: "Waktu Tidur",
      category: "Bergiliran",
      status: StoryStatus.DRAFT,
      description: "Draft: rutin malam.",
      objectives: "Anak tenang menjelang tidur.",
      pages: [
        "Malam hari aku bersiap tidur.",
        "Aku menyikat gigi.",
        "Aku berbaring di tempat tidur.",
      ],
    },
    {
      title: "Suara Keras di Kelas",
      category: "Menerima Kemenangan dan Kekalahan",
      status: StoryStatus.REVIEW,
      description: "Review: mengatur suara.",
      objectives: "Anak memakai suara pelan di kelas.",
      pages: [
        "Di kelas, suara pelan membantu teman belajar.",
        "Jika terlalu keras, aku bisa mengecilkan suara.",
      ],
    },
    {
      title: "Antri di Toilet",
      category: "Bergiliran",
      status: StoryStatus.APPROVED,
      description: "Siap dipublikasikan.",
      objectives: "Anak menunggu di luar toilet.",
      pages: [
        "Toilet sedang dipakai.",
        "Aku menunggu di luar.",
        "Ketika kosong, giliranku masuk.",
      ],
    },
  ];

  const stories = [];
  const published = [];
  for (const s of storySeeds) {
    const catId = categories.get(s.category);
    if (!catId) continue;
    const creator =
      s.status === StoryStatus.DRAFT || s.status === StoryStatus.REVIEW
        ? therapists[0]!
        : admin;
    const story = await ensureStory(s, catId, creator.id);
    stories.push(story);
    if (s.status === StoryStatus.PUBLISHED) published.push(story);
  }

  if (published.length === 0) {
    throw new Error("Seed failed: no published stories");
  }

  let coverCount = 0;
  for (let i = 0; i < published.length; i++) {
    const story = published[i]!;
    const ok = await ensureStoryCover({
      storyId: story.id,
      title: story.title,
      createdById: admin.id,
      paletteIndex: i,
    });
    if (ok) coverCount += 1;
  }
  console.log("  covers seeded/ensured this run:", coverCount);

  // Category covers (Bergiliran + Menerima Kemenangan dan Kekalahan)
  let categoryCoverCount = 0;
  let catIdx = 0;
  for (const [name, id] of categories) {
    const ok = await ensureCategoryCover({
      categoryId: id,
      name,
      paletteIndex: catIdx + 3,
    });
    if (ok) categoryCoverCount += 1;
    catIdx += 1;
  }
  console.log("  category covers this run:", categoryCoverCount);

  // Page illustrations + student portraits for published stories
  const publishedPages = await prisma.storyPage.findMany({
    where: { storyId: { in: published.map((s) => s.id) } },
    orderBy: [{ storyId: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      storyId: true,
      sortOrder: true,
      bodyText: true,
      story: { select: { title: true } },
    },
  });

  // Portrait: murid yang dipakai sesi terbuka di seed (6 pertama) — cukup uji /belajar.
  const portraitStudents = students.slice(0, 6);

  let illustrationCount = 0;
  let portraitCount = 0;
  for (let pi = 0; pi < publishedPages.length; pi++) {
    const page = publishedPages[pi]!;
    const illOk = await ensurePageIllustration({
      storyId: page.storyId,
      pageId: page.id,
      createdById: admin.id,
      paletteIndex: pi + 1,
      label: `${page.story.title} h.${page.sortOrder}`,
    });
    if (illOk) illustrationCount += 1;

    const portraitResults = await Promise.all(
      portraitStudents.map((student, si) =>
        ensurePagePortrait({
          storyId: page.storyId,
          pageId: page.id,
          studentId: student.id,
          studentName: student.displayName,
          createdById: admin.id,
          paletteIndex: pi + si + 2,
        }),
      ),
    );
    portraitCount += portraitResults.filter(Boolean).length;

    if ((pi + 1) % 5 === 0 || pi === publishedPages.length - 1) {
      console.log(
        `  … media pages ${pi + 1}/${publishedPages.length} (illust+${illustrationCount}, port+${portraitCount})`,
      );
    }
  }
  console.log("  page illustrations this run:", illustrationCount);
  console.log("  page portraits this run:", portraitCount);

  // Contoh soal MCQ per halaman (idempotent) — semua cerita PUBLISHED di DB
  // (termasuk yang dibuat manual, bukan hanya daftar storySeeds).
  const allPublishedPages = await prisma.storyPage.findMany({
    where: { story: { status: StoryStatus.PUBLISHED } },
    orderBy: [{ storyId: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      sortOrder: true,
      bodyText: true,
      story: { select: { title: true } },
    },
  });
  let mcqCount = 0;
  for (const page of allPublishedPages) {
    const created = await ensurePageMcqExample({
      pageId: page.id,
      storyTitle: page.story.title,
      sortOrder: page.sortOrder,
      bodyText: page.bodyText,
    });
    if (created) mcqCount += 1;
  }
  console.log(
    "  page MCQ examples this run:",
    mcqCount,
    `(of ${allPublishedPages.length} published pages)`,
  );

  // Many sessions across students / therapists / parents
  let sessionCount = 0;
  for (let i = 0; i < students.length; i++) {
    const student = students[i]!;
    const therapist = therapists[i % therapists.length]!;
    const story = published[i % published.length]!;
    await ensureSession({
      studentId: student.id,
      storyId: story.id,
      ledByUserId: therapist.id,
      daysAgo: (i % 6) + 1,
      ended: true,
      note: `[seed] ${student.displayName} fokus mengikuti cerita dengan baik.`,
    });
    sessionCount++;

    if (i < 6) {
      const story2 = published[(i + 1) % published.length]!;
      await ensureSession({
        studentId: student.id,
        storyId: story2.id,
        ledByUserId: therapist.id,
        daysAgo: 0,
        ended: false,
        note: `[seed] Sesi berlangsung — fokus menunggu giliran.`,
      });
      sessionCount++;
    }
  }

  // Parent-led home sessions for linked parents
  for (let i = 0; i < Math.min(parents.length, 5); i++) {
    const story = published[i % published.length]!;
    await ensureSession({
      studentId: students[i]!.id,
      storyId: story.id,
      ledByUserId: parents[i]!.id,
      daysAgo: 2 + i,
      ended: true,
      note: `[seed] Observasi rumah: anak tenang saat dibacakan cerita.`,
    });
    sessionCount++;
  }

  // FAQ terbit — tampil di landing + Bantuan (idempotent by question)
  const faqSeeds = [
    {
      question: "Apa itu CERMIN?",
      answer:
        "CERMIN (CERita MIRip Aku) adalah platform lembaga untuk social story yang tenang. Terapis dan orang tua mendampingi anak autistik lewat cerita privat, sesi dipandu, dan observasi — tanpa akun login untuk anak.",
      sortOrder: 0,
    },
    {
      question: "Apakah anak perlu punya akun sendiri?",
      answer:
        "Tidak. Anak tidak punya akun. Orang dewasa yang berwenang (admin, terapis, atau orang tua) membuka mode belajar /belajar dan memandu bersama anak.",
      sortOrder: 1,
    },
    {
      question: "Bagaimana cara masuk ke dasbor?",
      answer:
        "Akun dibuat lewat undangan lembaga, bukan daftar mandiri. Setelah menerima undangan dan membuat kata sandi, masuk lewat halaman Masuk.",
      sortOrder: 2,
    },
    {
      question: "Bagaimana cara mulai sesi belajar?",
      answer:
        "Buka menu Sesi di dasbor, pilih murid dan cerita yang sudah terbit, lalu mulai. Mode anak terbuka di /belajar dengan teks besar dan kontrol tenang.",
      sortOrder: 3,
    },
    {
      question: "Apakah media cerita aman?",
      answer:
        "Ya. Gambar dan audio disimpan di bucket privat. Akses hanya setelah otorisasi, lewat URL bertanda tangan berumur pendek — bukan tautan publik permanen.",
      sortOrder: 4,
    },
    {
      question: "Siapa yang bisa melihat data murid?",
      answer:
        "Admin lembaga, terapis yang ditugaskan ke murid tersebut, dan orang tua yang tertaut. Aturan akses ditegakkan di server, bukan hanya di tampilan.",
      sortOrder: 5,
    },
    {
      question: "Siapa yang bisa mengarsipkan murid?",
      answer: "Hanya Admin, dengan alasan arsip yang tercatat.",
      sortOrder: 6,
    },
  ];

  for (const f of faqSeeds) {
    const existing = await prisma.faqItem.findFirst({
      where: { question: f.question },
    });
    if (!existing) {
      await prisma.faqItem.create({
        data: {
          ...f,
          isPublished: true,
          createdById: admin.id,
        },
      });
    } else if (
      existing.sortOrder !== f.sortOrder ||
      existing.answer !== f.answer ||
      !existing.isPublished
    ) {
      await prisma.faqItem.update({
        where: { id: existing.id },
        data: {
          answer: f.answer,
          sortOrder: f.sortOrder,
          isPublished: true,
        },
      });
    }
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.story.count(),
    prisma.learningSession.count(),
    prisma.parentLink.count({ where: { isActive: true } }),
    prisma.therapistAssignment.count({ where: { endedAt: null } }),
    prisma.pageMcq.count(),
  ]);

  console.log("---");
  console.log("Users:", counts[0]);
  console.log("Students:", counts[1]);
  console.log("Stories:", counts[2]);
  console.log("Sessions:", counts[3]);
  console.log("Parent links:", counts[4]);
  console.log("Active assignments:", counts[5]);
  console.log("Page MCQs:", counts[6]);
  console.log("Sessions touched this run ~", sessionCount);
  console.log("Demo password (non-admin):", SEED_DEMO_PASSWORD);
  console.log("Admin:", admin.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
