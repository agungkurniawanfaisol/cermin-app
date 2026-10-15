"use client";

import { DeleteStudentDialog } from "@/components/dashboard/delete-student-dialog";

export function ArchiveStudentButton({
  studentId,
  displayName,
}: {
  studentId: string;
  displayName: string;
}) {
  return (
    <DeleteStudentDialog
      studentId={studentId}
      displayName={displayName}
      redirectToList
      variant="full"
    />
  );
}
