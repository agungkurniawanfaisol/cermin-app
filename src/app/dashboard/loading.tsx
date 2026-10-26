export default function DashboardLoading() {
  return (
    <main
      className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10"
      aria-busy="true"
      aria-label="Memuat dasbor"
    >
      <div className="flex flex-col gap-8">
        <div className="h-32 w-full animate-pulse rounded-2xl bg-[var(--accent-soft,#e6f2ee)]" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white" />
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white" />
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white" />
        </div>

        <div className="h-44 w-full animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white" />
      </div>
      <span className="sr-only">Memuat dasbor...</span>
    </main>
  );
}
