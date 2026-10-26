export default function MuridLoading() {
  return (
    <main
      className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10"
      aria-busy="true"
      aria-label="Memuat daftar murid"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div
            className="h-8 w-32 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
            aria-hidden
          />
          <div
            className="h-4 w-72 max-w-full animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
            aria-hidden
          />
        </div>
        <div
          className="h-11 w-32 shrink-0 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div
          className="h-11 w-64 max-w-full animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
        <div
          className="h-11 w-full animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div className="mt-6 space-y-3" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
          />
        ))}
      </div>
      <span className="sr-only">Memuat data murid...</span>
    </main>
  );
}
