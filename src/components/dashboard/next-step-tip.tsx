import { Lightbulb } from "lucide-react";

type NextStepTipProps = {
  tip: string;
};

export function NextStepTip({ tip }: NextStepTipProps) {
  return (
    <aside
      className="flex gap-3 rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white/90 p-4 shadow-sm"
      aria-label="Saran langkah berikutnya"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)]">
        <Lightbulb className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--text,#1f2933)]">
          Langkah berikutnya
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
          {tip}
        </p>
      </div>
    </aside>
  );
}
