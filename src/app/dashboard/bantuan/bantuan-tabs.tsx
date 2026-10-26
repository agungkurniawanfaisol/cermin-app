"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ListedFaq } from "@/server/actions/faqs";
import type { ListedGuide } from "@/server/actions/guides";
import { FaqPanel } from "./faq-panel";
import { GuidePanel } from "./guide-panel";

type TabValue = "faq" | "petunjuk";

type Props = {
  initialTab: TabValue;
  faqs: ListedFaq[];
  guides: ListedGuide[];
  isAdmin: boolean;
};

const TAB_OPTIONS: { value: TabValue; label: string }[] = [
  { value: "faq", label: "FAQ" },
  { value: "petunjuk", label: "Petunjuk" },
];

export function BantuanTabs({
  initialTab,
  faqs,
  guides,
  isAdmin,
}: Props) {
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState<TabValue>(() => {
    const raw = searchParams.get("tab");
    return raw === "petunjuk" || raw === "faq" ? raw : initialTab;
  });

  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get("tab");
      setCurrent(raw === "petunjuk" || raw === "faq" ? raw : initialTab);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialTab]);

  function onValueChange(next: string | number | null) {
    if (next == null) return;
    const value = String(next) as TabValue;
    if (value !== "faq" && value !== "petunjuk") return;
    if (value === current) return;
    setCurrent(value);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (value === "faq") params.delete("tab");
      else params.set("tab", value);
      const qs = params.toString();
      const href = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname;
      window.history.replaceState(null, "", href);
    }
  }
  return (
    <Tabs
      value={current}
      onValueChange={onValueChange}
      className="w-full gap-4"
    >
      <TabsList
        variant="line"
        aria-label="Bagian bantuan"
        className="h-auto min-h-11 w-full flex-wrap justify-start gap-0 rounded-none border-b border-[var(--cermin-border,#d9e2ec)] bg-transparent p-0"

      >
        {TAB_OPTIONS.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            className="min-h-11 shrink-0 rounded-none px-3 py-2 text-sm sm:px-4 data-active:text-[var(--focus,#0b6e4f)] after:bg-[var(--cermin-accent,#3d7c6b)] group-data-horizontal/tabs:after:bottom-0"
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="faq" className="mt-4 outline-none">
        <FaqPanel faqs={faqs} isAdmin={isAdmin} />
      </TabsContent>
      <TabsContent value="petunjuk" className="mt-4 outline-none">
        <GuidePanel guides={guides} isAdmin={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}
