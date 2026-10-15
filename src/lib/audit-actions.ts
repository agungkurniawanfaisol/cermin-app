/**
 * Katalog aksi audit minimum (ACCESS-CONTROL.md §10) + alias yang dipakai kode.
 * Tes memastikan mutasi sensitif menulis salah satu string ini.
 */
export const REQUIRED_AUDIT_ACTIONS = [
  // ACCESS-CONTROL §10 (nama kanonik / alias kode)
  "invite.create", // user.invite
  "invite.accept",
  "user.disable",
  "student.create",
  "student.update",
  "student.archive",
  "assignment.assign", // assignment.create
  "assignment.end",
  "parent.link", // parent_link.create
  "parent.unlink", // parent_link.deactivate
  "story.publish",
  "story.archive",
  "media.upload",
  "session.start",
  "session.end",
] as const;

export type RequiredAuditAction = (typeof REQUIRED_AUDIT_ACTIONS)[number];

export const OPTIONAL_AUDIT_ACTIONS = [
  "story.create",
  "story.update",
  "story.page.create",
  "story.page.delete",
  "story.status_transition",
  "preference.update",
  "user.avatar.upload",
  "student.avatar.upload.murid",
  "student.avatar.upload.ayah",
  "student.avatar.upload.ibu",
  "faq.create",
  "faq.update",
  "faq.delete",
  "guide.upload",
  "guide.update",
  "guide.delete",
] as const;
