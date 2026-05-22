"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { getLastOAuthProvider, handleAuthCallback, isAuthEnabled, signOut } from "@/lib/auth";
import { buildLoginUrl, DEFAULT_POST_LOGIN_PATH, resolvePostAuthDestination, sanitizeRedirectPath } from "@/lib/auth-intent";

function readErrorMessage(error: unknown, provider: "github" | "google" | "discord" | null): string {
  if (error instanceof Error && error.message.trim()) {
    const message = error.message.trim();
    const lower = message.toLowerCase();
    if (lower.includes("redirect_uri_mismatch")) {
      return "Sign in could not finish. Start sign-in again, or contact support if it keeps happening.";
    }
    if (lower.includes("invalid flow state")) {
      return "This sign-in link expired. Start sign-in again.";
    }
    if (lower.includes("error getting user profile from external provider")) {
      return provider
        ? `Could not read your ${provider} profile. Try signing in again.`
        : "Could not read your profile. Try signing in again.";
    }
    return message;
  }
  return "Unable to complete sign in. Please try again.";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const nextPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH),
    [searchParams],
  );

  useEffect(() => {
    let active = true;

    async function run() {
      if (!isAuthEnabled()) {
        if (!active) return;
        setError("Sign in is not available right now. Start the app server, then try again.");
        return;
      }

      try {
        await handleAuthCallback();
        router.replace(resolvePostAuthDestination(nextPath));
      } catch (err) {
        const provider = getLastOAuthProvider();
        signOut();
        if (!active) return;
        setError(readErrorMessage(err, provider));
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [nextPath, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f1eb] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e3d5c6] bg-white p-8 shadow-[0_25px_60px_rgba(95,62,37,0.15)]">
        {error ? (
          <div className="space-y-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold text-[#1f1e1c]">Sign in failed</h1>
            <p className="text-sm text-[#6d665f]">{error}</p>
            <div className="flex gap-3">
              <Link
                href={buildLoginUrl(nextPath)}
                className="rounded-xl bg-[#1f2a44] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#243155]"
              >
                Back to sign in
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-[#dbd0c5] px-4 py-2 text-sm font-medium text-[#2a2825] transition hover:bg-[#f9f6f2]"
              >
                Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-[#2b4eae]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-[#1f1e1c]">Completing sign in</h1>
            <p className="text-sm text-[#6d665f]">Please wait while we finalize your session and load your profile.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6f1eb] px-6">
          <div className="w-full max-w-md rounded-2xl border border-[#e3d5c6] bg-white p-8 shadow-[0_25px_60px_rgba(95,62,37,0.15)]">
            <div className="space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-[#2b4eae]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <h1 className="text-xl font-semibold text-[#1f1e1c]">Completing sign in</h1>
              <p className="text-sm text-[#6d665f]">Please wait while we finalize your session and load your profile.</p>
            </div>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
