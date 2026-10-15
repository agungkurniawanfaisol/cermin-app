# Access Control — CERMIN

| Field       | Value                                 |
| ----------- | ------------------------------------- |
| Version     | 0.1                                   |
| Date        | 2026-10-15                            |
| Auth        | Better Auth (email/password + invite) |
| Enforcement | Server-side on every query/mutation   |

## 1. Principles

1. **Never trust the UI.** Hiding nav is not security.
2. **Role + relationship.** `TERAPIS`/`ORANG_TUA` scoped by assignment/link.
3. **Child has no account.** Child mode requires authenticated adult + `assertCanAccessStudent`.
4. **Deny by default.** Missing rule = forbidden.
5. **Media gated.** Authz check before signed URL / stream.
6. **Active only.** Disabled users and ended assignments/inactive links deny access.

## 2. Roles

| Role        | Description                       |
| ----------- | --------------------------------- |
| `ADMIN`     | Full lembaga administration       |
| `TERAPIS`   | Clinical staff; assigned students |
| `ORANG_TUA` | Parent/guardian; linked children  |

No `MURID` role in MVP.

## 3. Relationship rules

### TherapistAssignment

- Active if `ended_at IS NULL`.
- Terapis may access student resources only when active assignment exists.
- History rows (`ended_at` set) do **not** grant access.

### ParentLink

- Active if `is_active = true`.
- Ortu access only linked active students.
- Home observations only when explicitly permitted (flag on link or settings; default **allowed** for linked parents in MVP, document if tightened later).

## 4. Permission matrix

Legend: ✓ allow · — deny · ◐ limited

| Action                                      | Admin | Terapis            | Ortu                         |
| ------------------------------------------- | ----- | ------------------ | ---------------------------- |
| Login if ACTIVE                             | ✓     | ✓                  | ✓                            |
| Invite / manage users                       | ✓     | —                  | —                            |
| Disable user                                | ✓     | —                  | —                            |
| Create/update/archive student               | ✓     | —                  | —                            |
| Read student profile                        | ✓     | ◐ assigned         | ◐ linked                     |
| Assign/unassign therapist                   | ✓     | —                  | —                            |
| Link/unlink parent                          | ✓     | —                  | —                            |
| Manage categories                           | ✓     | —                  | —                            |
| Create story draft                          | ✓     | ✓                  | —                            |
| Edit own draft story                        | ✓     | ✓                  | —                            |
| Edit any story                              | ✓     | —                  | —                            |
| Submit review / approve / publish / archive | ✓     | submit review only | —                            |
| Read published stories (dashboard)          | ✓     | ✓                  | ◐ shared with linked child\* |
| Upload media for permitted story            | ✓     | ✓                  | —                            |
| Start learning session                      | ✓     | ◐ assigned         | ◐ linked                     |
| Record session observation                  | ✓     | ◐ assigned         | ◐ linked home                |
| View session history                        | ✓     | ◐ assigned         | ◐ linked                     |
| View audit logs                             | ✓     | —                  | —                            |
| Manage app settings                         | ✓     | —                  | —                            |

\*MVP: ortu dapat membaca cerita `published` yang digunakan dalam sesi anak linked; pembatasan “shared set” eksplisit bisa ditambah fase 2.

## 5. Server API surface (policy helpers)

```ts
requireSession(): SessionUser
requireActiveUser(): SessionUser
requireRole(...roles: Role[]): SessionUser
assertCanAccessStudent(user, studentId): void
assertCanMutateStory(user, storyId): void
assertCanPublishStory(user): void  // ADMIN
assertCanAccessMedia(user, mediaId): void
assertCanLeadSession(user, studentId): void
```

Setiap Server Action / Route Handler:

1. Validate input (Zod)
2. Resolve session
3. Call assert\*
4. Execute Prisma / Storage
5. Write AuditLog for sensitive actions

## 6. Story status transitions

```
draft → review → approved → published → archived
                ↘ draft (reject)
published → draft (new edit cycle; version snapshot on publish)
```

| Transition                | Who                             |
| ------------------------- | ------------------------------- |
| draft → review            | Admin, Terapis (creator/editor) |
| review → approved / draft | Admin                           |
| approved → published      | Admin                           |
| \* → archived             | Admin                           |

## 7. Media access flow

1. Client requests media via authenticated endpoint (`/api/media/[id]` or signed-url action).
2. Server loads `MediaAsset` + parent story/page.
3. `assertCanAccessMedia` based on story visibility + user relations.
4. Issue Supabase signed URL (TTL singkat, e.g. 60–300s) **or** stream bytes.
5. Never put permanent public bucket URL in HTML.

## 8. Child mode authorization

1. Adult authenticated.
2. `studentId` + `storyId` in request.
3. `assertCanLeadSession` + story status `published`.
4. Create `LearningSession` with `led_by_user_id`.
5. UI route `/belajar/...` still re-checks on each navigation/data fetch.

## 9. Invite security

- Token random, stored hashed, single use, expiry.
- Role embedded server-side (client cannot escalate).
- Email must match invite on accept.

## 10. Audit events (minimum)

- user.invite / user.disable
- student.create / student.update
- assignment.create / assignment.end
- parent_link.create / parent_link.deactivate
- story.publish / story.archive
- media.upload
- session.start / session.end

## 11. Threat notes

| Threat                              | Control                                |
| ----------------------------------- | -------------------------------------- |
| IDOR on studentId                   | assertCanAccessStudent                 |
| Privilege escalation via role field | role only set by Admin/invite          |
| Leaked media URL                    | private bucket + short TTL + authz     |
| Session fixation / CSRF             | Better Auth cookie defaults + SameSite |
| Enumeration                         | generic 404/403 messages               |
