# CERMIN Platform Design

| Field   | Value                                                                              |
| ------- | ---------------------------------------------------------------------------------- |
| Date    | 2026-10-15                                                                         |
| Status  | Approved in brainstorming dialogue; awaiting doc review before implementation plan |
| Product | CERMIN (CERita MIRip Aku)                                                          |

## Context

Greenfield repo (empty). Web app for social-story learning for autistic children. Single lembaga. Adults (Admin, Terapis, Orang Tua) manage students, stories, media, guided sessions. Children have **no login**.

## Decisions

| Topic        | Choice                                |
| ------------ | ------------------------------------- |
| Child usage  | Guided session only                   |
| Auth         | Better Auth (email/password + invite) |
| Data         | Supabase Postgres + private Storage   |
| ORM          | Prisma                                |
| Architecture | Modular monolith — Next.js App Router |
| UI language  | Bahasa Indonesia only                 |
| MVP          | Learning core                         |
| Tenancy      | Single organization                   |

## Architecture

Next.js UI → Server Actions/Route Handlers → Zod → Better Auth session → policy (role + relationship) → Prisma / Supabase Storage → Vercel deploy.

Surfaces: `/dashboard/*` (adults), `/belajar/*` (child mode).

UUID entities. Media metadata in DB; files in private bucket; short-lived signed URLs after authz.

## Data model

See [docs/ERD.md](../../ERD.md): M:N therapist/student with history; M:N parent/student; categories→stories→pages; many media; evaluations/items; many sessions with observations/responses; audit; invites; preferences.

## Access control

See [docs/ACCESS-CONTROL.md](../../ACCESS-CONTROL.md). Server enforcement on every operation. Publish governance Admin. Media gated.

## UI

See [docs/UI-DESIGN-SYSTEM.md](../../UI-DESIGN-SYSTEM.md). Calm light UI; Comic Sans MS in child mode; no autoplay; no punishment scores; configurable text/audio prefs.

## Testing & rollout

See [docs/TEST-PLAN.md](../../TEST-PLAN.md) and [docs/ROADMAP.md](../../ROADMAP.md). Supabase setup steps documented in ROADMAP §3.

## Planning docs set

- [BRD](../../BRD.md)
- [PRD](../../PRD.md)
- [ERD](../../ERD.md)
- [ACCESS-CONTROL](../../ACCESS-CONTROL.md)
- [UI-DESIGN-SYSTEM](../../UI-DESIGN-SYSTEM.md)
- [ROADMAP](../../ROADMAP.md)
- [TEST-PLAN](../../TEST-PLAN.md)

## Out of scope (MVP)

Multi-tenant, child accounts, EN i18n, full evaluation/version UIs (schema ready), native apps.

## Next step

User reviews planning docs → on approval, invoke **writing-plans** for implementation plan → then scaffold.
