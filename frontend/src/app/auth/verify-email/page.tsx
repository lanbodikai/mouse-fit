"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DEFAULT_POST_LOGIN_PATH, sanitizeRedirectPath } from "@/lib/auth-intent";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH);
    const params = new URLSearchParams();
    if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
      params.set("next", nextPath);
    }
    router.replace(params.size > 0 ? `/auth/sign-in?${params.toString()}` : "/auth/sign-in");
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-primary">
      <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-theme-primary">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
