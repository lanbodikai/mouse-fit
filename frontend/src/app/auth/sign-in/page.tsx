"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
} from "lucide-react";
import {
  getSession,
  isAuthEnabled,
  signInWithPassword,
  signInWithGoogleRedirect,
} from "@/lib/auth";

const DEFAULT_POST_LOGIN_PATH = "/user";

function sanitizeNextPath(nextRaw: string | null): string {
  const next = (nextRaw || "").trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return DEFAULT_POST_LOGIN_PATH;
  if (next.startsWith("/auth/sign-in") || next.startsWith("/auth/callback")) return DEFAULT_POST_LOGIN_PATH;
  return next;
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid_grant")
    ) {
      return "Invalid email or password.";
    }
    if (msg.includes("email_not_confirmed")) {
      return "Please verify your email before signing in.";
    }
    return error.message;
  }
  return "Sign in failed. Please try again.";
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z"
        fill="#1877F2"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.13 4.53-3.74 4.25z" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    setAuthEnabled(isAuthEnabled());
    const session = getSession();
    if (session?.access_token) {
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  const canSubmit =
    !busy &&
    !googleBusy &&
    email.trim().length > 0 &&
    password.length > 0 &&
    authEnabled;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
      router.replace(nextPath);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleClick() {
    if (!authEnabled || busy || googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
        callbackUrl.searchParams.set("next", nextPath);
      }
      await signInWithGoogleRedirect(callbackUrl.toString());
    } catch (err) {
      setError(friendlyError(err));
      setGoogleBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <Image src="/auth/signin-sky.svg" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/25" />
      <div className="pointer-events-none absolute left-1/2 top-[58%] h-[440px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/50" />
      <div className="pointer-events-none absolute left-1/2 top-[58%] h-[500px] w-[1020px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/30" />

      <div className="relative z-10 w-full max-w-[350px]">
        <div className="rounded-[26px] border border-white/65 bg-white/65 p-6 shadow-[0_26px_70px_rgba(54,92,140,0.22)] backdrop-blur-xl sm:p-7">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300/60 bg-white/80 shadow-md">
            <LogIn className="h-5 w-5 text-slate-700" />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-[29px] font-semibold leading-tight text-slate-900">
              Sign in with email
            </h1>
            <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-slate-600">
              Access your measurements, recommendations, and preferences. All in one place.
            </p>
          </div>

          {!authEnabled && (
            <div className="mb-4 rounded-xl border border-amber-400/60 bg-amber-100 px-3.5 py-3 text-sm text-amber-900">
              Authentication is disabled. Set{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_ENABLE_AUTH=1</code>{" "}
              to continue.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-400"
              />
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-400"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="text-right">
              <Link
                href="/auth/sign-up"
                className="text-xs text-slate-600 transition-colors hover:text-slate-900"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[linear-gradient(180deg,#2d3754_0%,#121827_100%)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Get Started"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-dashed border-slate-300" />
            <span className="whitespace-nowrap text-[11px] text-slate-500">
              Or sign in with
            </span>
            <div className="flex-1 border-t border-dashed border-slate-300" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onGoogleClick}
              disabled={!authEnabled || busy || googleBusy}
              className="flex h-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Sign in with Google"
            >
              {googleBusy ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              disabled
              className="flex h-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 opacity-45 cursor-not-allowed"
              title="Facebook (coming soon)"
            >
              <FacebookIcon className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled
              className="flex h-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 opacity-45 cursor-not-allowed text-black/80"
              title="Apple (coming soon)"
            >
              <AppleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-center">
          <p className="text-sm text-slate-700">
            Don&apos;t have an account?{" "}
            <Link
              href={nextPath === DEFAULT_POST_LOGIN_PATH ? "/auth/sign-up" : `/auth/sign-up?next=${encodeURIComponent(nextPath)}`}
              className="font-medium text-sky-700 transition-colors hover:text-sky-900"
            >
              Create one
            </Link>
          </p>
          <Link
            href="/"
            className="inline-block text-xs text-slate-600 transition-colors hover:text-slate-900"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
