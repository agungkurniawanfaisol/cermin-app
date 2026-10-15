import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[7.5rem] cursor-pointer flex-col rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-sm transition-colors duration-200 hover:border-[var(--cermin-accent,#3d7c6b)] hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)] transition-colors duration-200 group-hover:bg-white">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="mt-3 text-lg font-semibold text-[var(--text,#1f2933)]">
        {title}
      </span>
      <span className="mt-1 text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
        {description}
      </span>
    </Link>
  );
}
