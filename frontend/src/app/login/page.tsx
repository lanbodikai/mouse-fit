"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next");
    const email = searchParams.get("email")?.trim();
    const params = new URLSearchParams();
    if (next) {
      params.set("next", next);
    }
    if (email) {
      params.set("email", email);
    }

    router.replace(params.size > 0 ? `/auth/sign-in?${params.toString()}` : "/auth/sign-in");
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-primary">
      <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
    </main>
  );
}
