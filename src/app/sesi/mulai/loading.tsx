export default function MulaiSesiLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between border-b border-[var(--cermin-border,#d9e2ec)]/60 pb-5">
        <div
          className="h-6 w-32 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
        <div
          className="h-8 w-48 animate-pulse rounded-full bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <div
          className="h-8 w-60 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
        <div
          className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-7 lg:gap-10">
        <div
          className="h-56 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
          aria-hidden
        />
        <div
          className="h-56 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
          aria-hidden
        />
      </div>
    </div>
  );
}
