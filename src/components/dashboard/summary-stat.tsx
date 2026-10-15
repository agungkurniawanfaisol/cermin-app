type SummaryStatProps = {
  label: string;
  value: number;
  hint?: string;
};

export function SummaryStat({ label, value, hint }: SummaryStatProps) {
  return (
    <div className="rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white/90 p-4 shadow-sm">
      <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--text,#1f2933)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--cermin-muted,#5c6b73)]">{hint}</p>
      ) : null}
    </div>
  );
}
