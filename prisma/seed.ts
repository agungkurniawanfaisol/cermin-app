import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  StoryStatus,
  StudentStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

config({ path: resolve(process.cwd(), ".env.local") });
config();

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
  const categories = [
    { name: "Bergiliran", description: "Antri dan bergiliran", sortOrder: 1 },
    {
      name: "Menerima Kemenangan dan Kekalahan",
      description: "Emosi menang/kalah",
      sortOrder: 2,
    },
    { name: "Menunggu", description: "Sabar menunggu giliran", sortOrder: 3 },
    {
      name: "Berbagi",
      description: "Berbagi mainan dan perhatian",
      sortOrder: 4,
    },
    {
      name: "Komunikasi",
      description: "Mengungkapkan kebutuhan",
      sortOrder: 5,
    },
    {
      name: "Rutin Harian",
      description: "Pagi, sekolah, tidur",
      sortOrder: 6,
    },
  ];

  const map = new Map<string, string>();
  for (const c of categories) {
    let row = await prisma.storyCategory.findFirst({ where: { name: c.name } });
    if (!row) {
      row = await prisma.storyCategory.create({ data: c });
      console.log("  + category", c.name);
    }
    map.set(c.name, row.id);
  }
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
    where: { title: seed.title, createdById },
    include: { pages: true },
  });
  if (found) {
    if (found.pages.length === 0) {
      await prisma.storyPage.createMany({
        data: seed.pages.map((bodyText, i) => ({
          storyId: found.id,
          sortOrder: i + 1,
          bodyText,
        })),
      });
    }
    return found;
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
      title: "Menunggu Antrian",
      category: "Menunggu",
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
      category: "Berbagi",
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
      title: "Bilang Mau Tolong",
      category: "Komunikasi",
      status: StoryStatus.PUBLISHED,
      description: "Meminta bantuan dengan kata-kata.",
      objectives: "Anak memakai kalimat 'tolong' saat butuh bantuan.",
      pages: [
        "Kadang aku butuh bantuan.",
        "Aku bisa bilang: 'Tolong, Bu.'",
        "Orang dewasa senang membantu.",
        "Meminta tolong itu baik.",
      ],
    },
    {
      title: "Pagi ke Sekolah",
      category: "Rutin Harian",
      status: StoryStatus.PUBLISHED,
      description: "Rutin pagi sebelum berangkat.",
      objectives: "Anak mengikuti langkah rutin pagi.",
      pages: [
        "Pagi hari aku bangun.",
        "Aku cuci muka dan memakai baju.",
        "Aku makan sarapan.",
        "Lalu aku siap pergi ke sekolah.",
      ],
    },
    {
      title: "Waktu Tidur",
      category: "Rutin Harian",
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
      category: "Komunikasi",
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
      category: "Menunggu",
      status: StoryStatus.APPROVED,
      description: "Siap dipublikasikan.",
      objectives: "Anak menunggu di luar toilet.",
      pages: [
        "Toilet sedang dipakai.",
        "Aku menunggu di luar.",
        "Ketika kosong, giliranku masuk.",
      ],
    },
    {
      title: "Main Lego Bersama",
      category: "Berbagi",
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

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.story.count(),
    prisma.learningSession.count(),
    prisma.parentLink.count({ where: { isActive: true } }),
    prisma.therapistAssignment.count({ where: { endedAt: null } }),
  ]);

  console.log("---");
  console.log("Users:", counts[0]);
  console.log("Students:", counts[1]);
  console.log("Stories:", counts[2]);
  console.log("Sessions:", counts[3]);
  console.log("Parent links:", counts[4]);
  console.log("Active assignments:", counts[5]);
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
