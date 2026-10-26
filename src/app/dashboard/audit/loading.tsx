export default function AuditLoading() {
  return (
    <main
      className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10"
      aria-busy="true"
      aria-label="Memuat log audit"
    >
      <div
        className="h-4 w-16 animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
        aria-hidden
      />
      <div className="mt-2 space-y-2">
        <div
          className="h-8 w-28 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
        <div
          className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div className="mt-6">
        <div
          className="h-11 w-full animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div className="mt-6 space-y-3" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-full animate-pulse rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
          />
        ))}
      </div>
      <span className="sr-only">Memuat data log audit...</span>
    </main>
  );
}
