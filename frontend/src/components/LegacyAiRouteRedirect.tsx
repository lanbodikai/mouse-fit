"use client";

import { useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LegacyAiRouteRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("assistant", "open");
    router.replace(`/database?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-black/10 bg-[#f7f3ed] px-5 py-4 text-sm text-black/62 shadow-[0_18px_36px_rgba(0,0,0,0.04)]">
        <Sparkles className="h-4 w-4 text-black/48" />
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening the database...
      </div>
    </div>
  );
}
