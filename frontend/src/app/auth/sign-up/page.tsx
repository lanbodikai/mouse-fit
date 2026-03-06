"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DEFAULT_POST_LOGIN_PATH, sanitizeRedirectPath } from "@/lib/auth-intent";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH);
    const email = searchParams.get("email")?.trim();

    const params = new URLSearchParams();
    params.set("mode", "signup");
    if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
      params.set("next", nextPath);
    }
    if (email) {
      params.set("email", email);
    }

    router.replace(`/auth/sign-in?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-primary">
      <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
    </main>
  );
}
