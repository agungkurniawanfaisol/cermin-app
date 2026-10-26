export default function CeritaLoading() {
  return (
    <main
      className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10"
      aria-busy="true"
      aria-label="Memuat daftar cerita"
    >
      <div
        className="h-4 w-16 animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
        aria-hidden
      />
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div
            className="h-8 w-36 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
            aria-hidden
          />
          <div
            className="h-4 w-80 max-w-full animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
            aria-hidden
          />
        </div>
        <div
          className="h-11 w-32 shrink-0 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div className="mt-6">
        <div
          className="h-11 w-full animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-64 flex-col justify-between rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-5 animate-pulse"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 rounded bg-[var(--accent-soft,#e6f2ee)]" />
                <div className="h-6 w-16 rounded bg-[var(--accent-soft,#e6f2ee)]" />
              </div>
              <div className="h-6 w-3/4 rounded bg-[var(--accent-soft,#e6f2ee)]" />
              <div className="h-4 w-full rounded bg-[var(--accent-soft,#e6f2ee)]" />
            </div>
            <div className="h-10 w-full rounded-lg bg-[var(--accent-soft,#e6f2ee)]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat data cerita...</span>
    </main>
  );
}
