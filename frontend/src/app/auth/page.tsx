"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Mail, Lock, Chrome } from "lucide-react";
import {
  AuthPendingVerificationError,
  getSession,
  isAuthEnabled,
  signInOrCreateWithPassword,
  signInWithGoogleRedirect,
} from "@/lib/auth";
import { getMyProfile } from "@/lib/api";

function friendlyError(error: unknown): string {
  if (error instanceof AuthPendingVerificationError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Authentication failed. Please try again.";
}

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    setAuthEnabled(isAuthEnabled());
    const session = getSession();
    if (session?.access_token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const submitDisabled = busy || !email.trim() || !password.trim() || !authEnabled;

  const heading = useMemo(() => {
    return authEnabled ? "Create an account" : "Authentication disabled";
  }, [authEnabled]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await signInOrCreateWithPassword(email.trim(), password);
      await getMyProfile().catch(() => null);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof AuthPendingVerificationError) {
        setInfo(err.message);
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleClick() {
    if (!authEnabled || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe9] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,171,112,0.2),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(253,201,130,0.16),transparent_35%),radial-gradient(circle_at_60%_85%,rgba(255,132,86,0.18),transparent_40%)]" />

      <section className="relative mx-auto flex w-full max-w-6xl overflow-hidden rounded-3xl border border-[#d7c7b8] bg-white shadow-[0_30px_70px_rgba(86,50,28,0.12)]">
        <div className="hidden w-[44%] flex-col justify-between bg-gradient-to-br from-[#f3d6cb] via-[#f7c59e] to-[#ed8f63] p-10 lg:flex">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[#3b2319]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cd612d]" />
              BRIGHTNEST
            </div>
            <div className="max-w-xs space-y-4 text-[#261810]">
              <p className="text-sm font-medium text-[#533429]">You can easily</p>
              <h1 className="text-4xl leading-tight font-semibold">
                Get access your personal hub for clarity and productivity.
              </h1>
            </div>
          </div>
          <div className="rounded-2xl border border-white/35 bg-white/30 p-4 text-sm text-[#4a2f24]">
            Measure your setup, save your profile, and continue from any device.
          </div>
        </div>

        <div className="w-full p-6 sm:p-8 lg:w-[56%] lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#f1ded1] bg-[#fff6f0] text-xl text-[#cd612d]">
              *
            </span>
            <h2 className="text-3xl font-semibold text-[#1a1a1a]">{heading}</h2>
            <p className="mt-2 text-sm text-[#6f6a65]">
              Access your tasks, notes, and projects anytime, anywhere, and keep everything flowing in one place.
            </p>

            {!authEnabled ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Auth is disabled. Set <code>NEXT_PUBLIC_ENABLE_AUTH=1</code> and Supabase keys to continue.
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#2d2b28]">Your email</span>
                <div className="flex items-center rounded-xl border border-[#e6ddd4] bg-[#fcfaf8] px-3">
                  <Mail className="h-4 w-4 text-[#9a8f85]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="satalia.bruk@komastudio.com"
                    className="h-11 w-full border-0 bg-transparent px-3 text-sm text-[#242220] outline-none"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#2d2b28]">Create password</span>
                <div className="flex items-center rounded-xl border border-[#e6ddd4] bg-[#fcfaf8] px-3">
                  <Lock className="h-4 w-4 text-[#9a8f85]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    className="h-11 w-full border-0 bg-transparent px-3 text-sm text-[#242220] outline-none"
                    autoComplete="current-password"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={submitDisabled}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#090f26] text-sm font-medium text-white shadow-[0_10px_24px_rgba(9,15,38,0.25)] transition hover:bg-[#121b3a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Working...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#e6ddd4]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[#9c938a]">or continue with</span>
              <div className="h-px flex-1 bg-[#e6ddd4]" />
            </div>

            <button
              type="button"
              onClick={onGoogleClick}
              disabled={!authEnabled || busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e6ddd4] bg-white text-sm font-medium text-[#22211f] transition hover:bg-[#faf7f4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Chrome className="h-4 w-4" />
              <span>Google</span>
            </button>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {info ? <p className="mt-4 text-sm text-cyan-700">{info}</p> : null}

            <p className="mt-6 text-sm text-[#837b73]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  if (busy) return;
                  setInfo("Use the same form. If your account exists, we sign you in. If not, we create it.");
                }}
                className="font-semibold text-[#cc6a34] hover:text-[#b95c2b]"
              >
                Register
              </button>
            </p>

            <p className="mt-4 text-xs text-[#9c938a]">
              By continuing, you agree to keep your profile synced across dashboard, settings, and recommendations.
            </p>

            <div className="mt-6 text-sm text-[#7a726b]">
              <Link href="/" className="hover:text-[#2c2b2a]">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


