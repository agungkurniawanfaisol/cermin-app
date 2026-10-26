export default function PenggunaLoading() {
  return (
    <main
      className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10"
      aria-busy="true"
      aria-label="Memuat daftar pengguna"
    >
      <div
        className="h-4 w-16 animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
        aria-hidden
      />
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div
            className="h-8 w-40 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
            aria-hidden
          />
          <div
            className="h-4 w-80 max-w-full animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
            aria-hidden
          />
        </div>
        <div
          className="h-11 w-36 shrink-0 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
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
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
          />
        ))}
      </div>
      <span className="sr-only">Memuat data pengguna...</span>
    </main>
  );
}
