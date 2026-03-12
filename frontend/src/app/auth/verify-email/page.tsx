"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import {
  getAuthUser,
  getSession,
  resendVerificationEmail,
} from "@/lib/auth";
import { buildLoginUrl, DEFAULT_POST_LOGIN_PATH, resolvePostAuthDestination, sanitizeRedirectPath } from "@/lib/auth-intent";

const RESEND_COOLDOWN_MS = 60_000;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const nextPath = sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH);
  const signInHref = useMemo(
    () => buildLoginUrl(nextPath, emailParam || null),
    [emailParam, nextPath],
  );
  const signUpHref = useMemo(() => {
    if (nextPath === DEFAULT_POST_LOGIN_PATH) return "/auth/sign-up";
    return `/auth/sign-up?next=${encodeURIComponent(nextPath)}`;
  }, [nextPath]);

  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const checkVerification = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const session = getSession();
      if (!session?.access_token) {
        router.replace(signInHref);
        return;
      }

      const user = await getAuthUser();
      if (user?.email_confirmed_at) {
        setVerified(true);
        setTimeout(() => router.replace(resolvePostAuthDestination(nextPath)), 1500);
      } else {
        setError("Email not yet verified. Check your inbox and try again.");
      }
    } catch {
      setError("Could not check verification status. Please try again.");
    } finally {
      setChecking(false);
    }
  }, [nextPath, router, signInHref]);

  async function handleResend() {
    if (resending || resendCooldown > 0 || !emailParam) return;
    setResending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await resendVerificationEmail(emailParam);
      setSuccessMsg("Verification email sent! Check your inbox.");
      setResendCooldown(RESEND_COOLDOWN_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend email.";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit")) {
        setError("Too many requests. Please wait a moment before trying again.");
        setResendCooldown(RESEND_COOLDOWN_MS);
      } else {
        setError(msg);
      }
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-theme-primary px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 border border-green-500/30">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Email verified</h1>
          <p className="text-sm text-white/60">Redirecting to your account...</p>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-fuchsia-400" />
        </div>
      </main>
    );
  }

  const cooldownSeconds = Math.ceil(resendCooldown / 1000);

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-primary px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/30">
            <Mail className="h-8 w-8 text-fuchsia-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-sm text-white/60 max-w-sm mx-auto">
            We sent a verification link to{" "}
            {emailParam ? (
              <span className="font-medium text-white/80">{emailParam}</span>
            ) : (
              "your email address"
            )}
            . Click the link to activate your account.
          </p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 backdrop-blur-sm mf-neon-card-soft space-y-5">
          {error && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {successMsg}
            </p>
          )}

          <button
            type="button"
            onClick={checkVerification}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 mf-neon-btn transition-colors"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {checking ? "Checking..." : "I've verified my email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0 || !emailParam}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {resending
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend in ${cooldownSeconds}s`
                : "Resend verification email"}
          </button>
        </div>

        <div className="text-center space-y-3">
          <p className="text-sm text-white/50">
            Wrong email?{" "}
            <Link
              href={signUpHref}
              className="font-medium text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
            >
              Try a different one
            </Link>
          </p>
          <p className="text-sm text-white/40">
            Already verified?{" "}
            <Link
              href={signInHref}
              className="font-medium text-white/60 hover:text-white/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
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
