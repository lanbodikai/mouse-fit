"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { buildLoginUrl } from "@/lib/auth-intent";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next");
    const email = searchParams.get("email");
    router.replace(buildLoginUrl(next, email));
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-primary">
      <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
    </main>
  );
}
