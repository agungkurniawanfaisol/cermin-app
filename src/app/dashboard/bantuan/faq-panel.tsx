import type { ListedFaq } from "@/server/actions/faqs";

export function FaqPanel({
  faqs,
  isAdmin,
}: {
  faqs: ListedFaq[];
  isAdmin: boolean;
}) {
  void isAdmin;
  return (
    <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
      Memuat panel FAQ… ({faqs.length} item)
    </p>
  );
}
