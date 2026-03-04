"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { getMyProfile } from "@/lib/api";
import { handleAuthCallback, isAuthEnabled, signOut } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Unable to complete sign in. Please try again.";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!isAuthEnabled()) {
        if (!active) return;
        setError("Auth is disabled. Set NEXT_PUBLIC_ENABLE_AUTH=1 and retry.");
        return;
      }

      try {
        await handleAuthCallback();
        const profile = await getMyProfile();
        if (profile.theme === "light" || profile.theme === "dark") {
          setTheme(profile.theme);
        }
        router.replace("/dashboard");
      } catch (err) {
        signOut();
        if (!active) return;
        setError(readErrorMessage(err));
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [router, setTheme]);

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
                href="/auth"
                className="rounded-xl bg-[#1f2a44] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#243155]"
              >
                Back to auth
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

