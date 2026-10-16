export function SessionListSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Memuat riwayat sesi"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] sm:h-16"
        />
      ))}
    </div>
  );
}
