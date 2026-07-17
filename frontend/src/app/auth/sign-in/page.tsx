"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OAuthPromptCard } from "@/components/auth/OAuthPromptCard";
import { useAuthState } from "@/hooks/useAuthState";
import { DEFAULT_POST_LOGIN_PATH, resolvePostAuthDestination, sanitizeRedirectPath } from "@/lib/auth-intent";
import styles from "./page.module.css";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, isAuthenticated } = useAuthState();
  const nextPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH),
    [searchParams],
  );

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    router.replace(resolvePostAuthDestination(nextPath));
  }, [isAuthenticated, nextPath, ready, router]);

  return (
    <main className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 ${styles.pageTransition}`}>
      <Image src="/auth/signin-sky.svg" alt="" fill className={`object-cover ${styles.skyIntro}`} priority />
      <div className={`absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/25 ${styles.overlayIntro}`} />
      <div className={`pointer-events-none absolute left-1/2 top-[58%] h-[440px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/50 ${styles.ringIntro}`} />
      <div className={`pointer-events-none absolute left-1/2 top-[58%] h-[500px] w-[1020px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/30 ${styles.ringIntroDelayed}`} />

      <div className="relative z-10 w-full max-w-[430px]">
        {ready && isAuthenticated ? (
          <div className="rounded-[30px] border border-white/70 bg-white/78 p-6 text-center shadow-[0_28px_80px_rgba(41,64,94,0.18)] backdrop-blur-2xl sm:p-7">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-700" />
          </div>
        ) : (
          <OAuthPromptCard
            nextPath={nextPath}
            reason="auth_required"
            title="Create your MouseFit account"
            description="Continue with Google, Discord, or GitHub. Username and password are not part of the new flow."
            showHomeLink
          />
        )}
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 ${styles.pageTransition}`}>
          <Image src="/auth/signin-sky.svg" alt="" fill className={`object-cover ${styles.skyIntro}`} priority />
          <div className={`absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/25 ${styles.overlayIntro}`} />
          <div className="relative z-10 rounded-[30px] border border-white/70 bg-white/78 p-6 shadow-[0_28px_80px_rgba(41,64,94,0.18)] backdrop-blur-2xl sm:p-7">
            <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
          </div>
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
