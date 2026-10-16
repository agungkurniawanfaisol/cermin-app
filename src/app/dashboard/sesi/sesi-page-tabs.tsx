"use client";

import { useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type TabValue = "mulai" | "riwayat";

type Props = {
  initialTab: TabValue;
  mulai: ReactNode;
  riwayat: ReactNode;
};

export function SesiPageTabs({ initialTab, mulai, riwayat }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const raw = searchParams.get("tab");
  const current: TabValue =
    raw === "riwayat" || raw === "mulai" ? raw : initialTab;

  function onValueChange(next: string | number | null) {
    if (next == null) return;
    const value = String(next) as TabValue;
    if (value !== "mulai" && value !== "riwayat") return;
    if (value === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "mulai") params.delete("tab");
    else params.set("tab", value);
    // Riwayat punya filter sendiri; jangan bawa page saat balik ke mulai.
    if (value === "mulai") {
      params.delete("page");
      params.delete("q");
      params.delete("state");
      params.delete("studentId");
      params.delete("sort");
      params.delete("order");
    }
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <Tabs
      value={current}
      onValueChange={onValueChange}
      className="mt-4 w-full gap-3"
    >
      <TabsList
        variant="line"
        aria-label="Bagian sesi"
        className="h-auto w-fit max-w-full flex-wrap justify-start gap-0 rounded-none border-b border-[var(--cermin-border,#d9e2ec)] bg-transparent p-0"
        data-pending={pending ? "" : undefined}
      >
        <TabsTrigger
          value="mulai"
          className="h-9 min-h-9 flex-none rounded-none px-2.5 py-1.5 text-sm data-active:text-[var(--focus,#0b6e4f)] after:bg-[var(--cermin-accent,#3d7c6b)] group-data-horizontal/tabs:after:bottom-0"
        >
          Mulai
        </TabsTrigger>
        <TabsTrigger
          value="riwayat"
          className="h-9 min-h-9 flex-none rounded-none px-2.5 py-1.5 text-sm data-active:text-[var(--focus,#0b6e4f)] after:bg-[var(--cermin-accent,#3d7c6b)] group-data-horizontal/tabs:after:bottom-0"
        >
          Riwayat
        </TabsTrigger>
      </TabsList>
      <TabsContent value="mulai" className="mt-2 outline-none">
        {mulai}
      </TabsContent>
      <TabsContent value="riwayat" className="mt-2 outline-none">
        {riwayat}
      </TabsContent>
    </Tabs>
  );
}
