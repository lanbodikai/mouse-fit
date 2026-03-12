"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { getSession, resetPasswordForEmail } from "@/lib/auth";
import { buildLoginUrl, DEFAULT_POST_LOGIN_PATH, resolvePostAuthDestination, sanitizeRedirectPath } from "@/lib/auth-intent";

function buildResetRedirectUrl(nextPath: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const url = new URL("/auth/reset-password", window.location.origin);
  if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH),
    [searchParams],
  );
  const emailParam = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);

  const [email, setEmail] = useState(emailParam);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const signInHref = useMemo(() => buildLoginUrl(nextPath, email.trim() || null), [email, nextPath]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    const session = getSession();
    if (session?.access_token) {
      router.replace(resolvePostAuthDestination(nextPath));
    }
  }, [nextPath, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await resetPasswordForEmail(email.trim(), buildResetRedirectUrl(nextPath));
      setMessage("Password reset link sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_35%),#07080b]" />

      <div className="relative z-10 w-full max-w-[360px] rounded-[26px] border border-white/12 bg-white/8 p-6 shadow-[0_26px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          <KeyRound className="h-5 w-5 text-fuchsia-300" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-[29px] font-semibold leading-tight text-white">
            Reset password
          </h1>
          <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-white/55">
            Enter your email and we&apos;ll send you a secure reset link.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/50"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl border border-green-500/25 bg-green-500/10 px-3.5 py-3 text-sm text-green-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="w-full rounded-xl bg-[linear-gradient(180deg,#2d3754_0%,#121827_100%)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center">
          <Link
            href={signInHref}
            className="inline-block text-sm text-white/60 transition-colors hover:text-white"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
