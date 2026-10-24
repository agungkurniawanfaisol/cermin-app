export default function SesiLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-1.5">
        <div
          className="h-8 w-44 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
        <div
          className="h-4 w-72 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
          aria-hidden
        />
      </div>
      <div className="mt-2 space-y-4">
        <div
          className="h-11 w-64 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
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
