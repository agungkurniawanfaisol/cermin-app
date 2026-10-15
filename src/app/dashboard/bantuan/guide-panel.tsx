import type { ListedGuide } from "@/server/actions/guides";

export function GuidePanel({
  guides,
  isAdmin,
}: {
  guides: ListedGuide[];
  isAdmin: boolean;
}) {
  void isAdmin;
  return (
    <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
      Memuat panel petunjuk… ({guides.length} item)
    </p>
  );
}
