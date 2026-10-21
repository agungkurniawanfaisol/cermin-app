"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import type { PublicFaq } from "@/server/queries/faqs-public";

type Props = {
  faqs: PublicFaq[];
};

export function LandingFaq({ faqs }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  if (faqs.length === 0) {
    return (
      <p className="mx-auto max-w-2xl text-center text-sm text-[var(--cermin-muted)]">
        Belum ada pertanyaan yang dipublikasikan.
      </p>
    );
  }

  return (
    <ul className="mx-auto w-full max-w-3xl space-y-2">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        const panelId = `${baseId}-panel-${faq.id}`;
        const buttonId = `${baseId}-btn-${faq.id}`;
        return (
          <li
            key={faq.id}
            className="overflow-hidden rounded-xl border border-[var(--cermin-border)] bg-[var(--surface)]"
          >
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left sm:px-5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]",
                )}
              >
                <span className="text-base font-semibold text-[var(--text)] sm:text-lg">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-[var(--cermin-accent)] transition-transform duration-200 motion-reduce:transition-none",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="border-t border-[var(--cermin-border)] px-4 py-3 sm:px-5 sm:py-4"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--cermin-muted)] sm:text-base">
                {faq.answer}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
