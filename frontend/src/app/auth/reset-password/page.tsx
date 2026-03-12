"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { getSession, handleAuthCallback, updatePassword } from "@/lib/auth";
import { buildLoginUrl, DEFAULT_POST_LOGIN_PATH, resolvePostAuthDestination, sanitizeRedirectPath } from "@/lib/auth-intent";

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not reset your password.";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH),
    [searchParams],
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      const session = getSession();
      if (session?.access_token) {
        if (active) setReady(true);
        return;
      }

      try {
        await handleAuthCallback();
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
        if (active) setReady(true);
      } catch (err) {
        if (!active) return;
        setError(friendlyError(err));
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || password.length < 8 || password !== confirm) return;

    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      router.replace(resolvePostAuthDestination(nextPath));
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_38%),#07080b]" />

      <div className="relative z-10 w-full max-w-[360px] rounded-[26px] border border-white/12 bg-white/8 p-6 shadow-[0_26px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          <KeyRound className="h-5 w-5 text-cyan-300" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-[29px] font-semibold leading-tight text-white">
            Choose a new password
          </h1>
          <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-white/55">
            Finish your reset and continue back into MouseFit.
          </p>
        </div>

        {!ready && !error ? (
          <div className="flex items-center justify-center py-6 text-sm text-white/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying reset link...
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/70"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-cyan-400/50"
            />

            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-red-300">Password must be at least 8 characters.</p>
            )}
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-red-300">Passwords do not match.</p>
            )}
            {error && (
              <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!ready || busy || password.length < 8 || password !== confirm}
              className="w-full rounded-xl bg-[linear-gradient(180deg,#2d3754_0%,#121827_100%)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}

        <div className="mt-5 space-y-2 text-center">
          <Link
            href={buildLoginUrl(nextPath)}
            className="inline-block text-sm text-white/60 transition-colors hover:text-white"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
