export default function PengaturanLoading() {
  return (
    <main
      className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10"
      aria-busy="true"
      aria-label="Memuat pengaturan"
    >
      <div
        className="h-4 w-16 animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
        aria-hidden
      />
      <div className="mt-2 space-y-2">
        <div
          className="h-8 w-44 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
        <div
          className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>

      <div className="mt-8 space-y-8" aria-hidden>
        <div className="h-56 w-full animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-6" />
        <div className="h-56 w-full animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-6" />
      </div>
      <span className="sr-only">Memuat halaman pengaturan...</span>
    </main>
  );
}
