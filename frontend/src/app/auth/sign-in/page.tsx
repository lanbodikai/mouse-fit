"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Github,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";
import { DiscordIcon, GoogleIcon } from "@/components/auth/OAuthIcons";
import {
  AuthOAuthProvider,
  getSession,
  getOAuthProviderAvailability,
  hasSupabaseAuthConfig,
  isAuthEnabled,
  OAUTH_PROVIDERS,
  oauthProviderLabel,
  signInWithPassword,
  signInWithOAuthRedirect,
  signUpWithPassword,
} from "@/lib/auth";
import { DEFAULT_POST_LOGIN_PATH, resolvePostAuthDestination, sanitizeRedirectPath } from "@/lib/auth-intent";
import styles from "./page.module.css";

function isCredentialFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("invalid login credentials") || msg.includes("invalid_grant");
}

type AuthMode = "signin" | "signup";

function resolveAuthMode(modeRaw: string | null): AuthMode {
  return modeRaw?.toLowerCase() === "signup" ? "signup" : "signin";
}

function friendlySignInError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid_grant")
    ) {
      return "Incorrect email or password.";
    }
    if (msg.includes("email_not_confirmed")) {
      return "Please verify your email before signing in.";
    }
    return error.message;
  }
  return "Sign in failed. Please try again.";
}

function friendlySignUpError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return "An account with this email already exists. Try signing in instead.";
    }
    return error.message;
  }
  return "Could not create your account. Please try again.";
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next"), DEFAULT_POST_LOGIN_PATH),
    [searchParams],
  );
  const authMode = useMemo(() => resolveAuthMode(searchParams.get("mode")), [searchParams]);
  const isSignUpMode = authMode === "signup";
  const emailParam = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<AuthOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [oauthProvidersReady, setOauthProvidersReady] = useState(false);
  const [oauthProviderAvailability, setOauthProviderAvailability] = useState<Record<AuthOAuthProvider, boolean> | null>(null);
  const buildModeHref = useMemo(
    () => (mode: AuthMode) => {
      const params = new URLSearchParams();
      if (mode === "signup") {
        params.set("mode", "signup");
      }
      if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
        params.set("next", nextPath);
      }
      if (email.trim()) {
        params.set("email", email.trim());
      }
      return params.size > 0 ? `/auth/sign-in?${params.toString()}` : "/auth/sign-in";
    },
    [email, nextPath],
  );
  const forgotPasswordHref = useMemo(() => {
    const params = new URLSearchParams();
    if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
      params.set("next", nextPath);
    }
    if (email.trim()) {
      params.set("email", email.trim());
    }
    return params.size > 0 ? `/auth/forgot-password?${params.toString()}` : "/auth/forgot-password";
  }, [email, nextPath]);
  const createAccountHref = useMemo(() => buildModeHref("signup"), [buildModeHref]);
  const signInHref = useMemo(() => buildModeHref("signin"), [buildModeHref]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    setError(null);
    setCredentialError(false);
    setBusy(false);
    setOauthBusy(null);
    if (!isSignUpMode) {
      setConfirm("");
    }
  }, [isSignUpMode]);

  useEffect(() => {
    setAuthEnabled(isAuthEnabled());
    setAuthConfigured(hasSupabaseAuthConfig());
    setAuthReady(true);
    const session = getSession();
    if (session?.access_token) {
      router.replace(resolvePostAuthDestination(nextPath));
    }
  }, [nextPath, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadOAuthProviderAvailability() {
      if (!authReady) return;
      if (!authEnabled || !authConfigured) {
        if (!cancelled) {
          setOauthProviderAvailability(null);
          setOauthProvidersReady(true);
        }
        return;
      }

      if (!cancelled) {
        setOauthProvidersReady(false);
      }
      const availability = await getOAuthProviderAvailability().catch(() => null);
      if (!cancelled) {
        setOauthProviderAvailability(availability);
        setOauthProvidersReady(true);
      }
    }

    void loadOAuthProviderAvailability();
    return () => {
      cancelled = true;
    };
  }, [authConfigured, authEnabled, authReady]);

  const visibleOAuthProviders = useMemo(
    () => OAUTH_PROVIDERS.filter((provider) => oauthProviderAvailability?.[provider] !== false),
    [oauthProviderAvailability],
  );
  const socialProvidersKnown = oauthProvidersReady && oauthProviderAvailability !== null;
  const socialDisabled = !authReady || !oauthProvidersReady || busy || oauthBusy !== null || !authEnabled || !authConfigured;
  const validation = useMemo(() => {
    if (!isSignUpMode) return { password: "", confirm: "" };
    return {
      password: password.length > 0 && password.length < 8 ? "Must be at least 8 characters" : "",
      confirm: confirm.length > 0 && password !== confirm ? "Passwords do not match" : "",
    };
  }, [confirm, isSignUpMode, password]);
  const canSubmit =
    authReady &&
    !busy &&
    oauthBusy == null &&
    email.trim().length > 0 &&
    (isSignUpMode ? password.length >= 8 && password === confirm : password.length > 0) &&
    authEnabled &&
    authConfigured;
  const socialGridClassName =
    visibleOAuthProviders.length === 1
      ? "grid-cols-1"
      : visibleOAuthProviders.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setCredentialError(false);
    try {
      if (isSignUpMode) {
        const result = await signUpWithPassword(email.trim(), password);
        if (result.requiresEmailVerification) {
          const params = new URLSearchParams({ email: email.trim() });
          if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
            params.set("next", nextPath);
          }
          router.push(`/auth/verify-email?${params.toString()}`);
          return;
        }
      } else {
        await signInWithPassword(email.trim(), password);
      }
      router.replace(resolvePostAuthDestination(nextPath));
    } catch (err) {
      if (isSignUpMode) {
        setCredentialError(false);
        setError(friendlySignUpError(err));
      } else {
        setCredentialError(isCredentialFailure(err));
        setError(friendlySignInError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onOAuthClick(provider: AuthOAuthProvider) {
    if (busy || oauthBusy || !authEnabled || !authConfigured) return;
    setOauthBusy(provider);
    setError(null);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
        callbackUrl.searchParams.set("next", nextPath);
      }
      await signInWithOAuthRedirect(provider, callbackUrl.toString());
    } catch (err) {
      setError(isSignUpMode ? friendlySignUpError(err) : friendlySignInError(err));
      setOauthBusy(null);
    }
  }

  return (
    <main className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 ${styles.pageTransition}`}>
      <Image src="/auth/signin-sky.svg" alt="" fill className={`object-cover ${styles.skyIntro}`} priority />
      <div className={`absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/25 ${styles.overlayIntro}`} />
      <div className={`pointer-events-none absolute left-1/2 top-[58%] h-[440px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/50 ${styles.ringIntro}`} />
      <div className={`pointer-events-none absolute left-1/2 top-[58%] h-[500px] w-[1020px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/30 ${styles.ringIntroDelayed}`} />

      <div className="relative z-10 w-full max-w-[350px]">
        <div className={`rounded-[26px] border border-white/65 bg-white/65 p-6 shadow-[0_26px_70px_rgba(54,92,140,0.22)] backdrop-blur-xl sm:p-7 ${styles.cardIntro}`}>
          <div className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300/60 bg-white/80 shadow-md ${styles.iconIntro}`}>
            {isSignUpMode ? (
              <UserPlus className="h-5 w-5 text-slate-700" />
            ) : (
              <LogIn className="h-5 w-5 text-slate-700" />
            )}
          </div>

          <div className={`mb-6 text-center ${styles.copyIntro}`}>
            <h1 className="text-[29px] font-semibold leading-tight text-slate-900">
              {isSignUpMode ? "Join Us" : "Sign in with email"}
            </h1>
            <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-slate-600">
              {isSignUpMode
                ? "Save your profile and preferences."
                : "Access your saved profile and settings."}
            </p>
          </div>

          <div className={`mb-4 grid grid-cols-2 rounded-xl border border-slate-200/80 bg-white/65 p-1 ${styles.modeSwitchIntro}`}>
            <Link
              href={signInHref}
              className={`${styles.modeSwitchTab} ${!isSignUpMode ? styles.modeSwitchTabActive : ""}`}
            >
              Sign in
            </Link>
            <Link
              href={createAccountHref}
              className={`${styles.modeSwitchTab} ${isSignUpMode ? styles.modeSwitchTabActive : ""}`}
            >
              Create account
            </Link>
          </div>

          {authReady && !authEnabled && (
            <div className="mb-4 rounded-xl border border-amber-400/60 bg-amber-100 px-3.5 py-3 text-sm text-amber-900">
              Authentication is disabled. Set{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_ENABLE_AUTH=1</code>{" "}
              to continue.
            </div>
          )}
          {authReady && authEnabled && !authConfigured && (
            <div className="mb-4 rounded-xl border border-amber-400/60 bg-amber-100 px-3.5 py-3 text-sm text-amber-900">
              Supabase auth is not configured. Set{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </div>
          )}

          <form onSubmit={onSubmit} className={`space-y-4 ${styles.formIntro}`}>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className={`w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-400 ${styles.inputMotion}`}
              />
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUpMode ? "Create password (min 8 characters)" : "Password"}
                autoComplete={isSignUpMode ? "new-password" : "current-password"}
                className={`w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-400 ${styles.inputMotion}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {isSignUpMode && validation.password && (
              <p className="text-xs text-red-700">{validation.password}</p>
            )}

            {isSignUpMode && (
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={`w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-400 ${styles.inputMotion}`}
                />
              </div>
            )}
            {isSignUpMode && validation.confirm && (
              <p className="text-xs text-red-700">{validation.confirm}</p>
            )}

            {!isSignUpMode && (
              <div className="text-right">
                <Link
                  href={forgotPasswordHref}
                  className="text-xs text-slate-600 transition-colors hover:text-slate-900"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                <p>{error}</p>
                {credentialError && !isSignUpMode && (
                  <p className="mt-2 text-slate-700">
                    Don&apos;t have an account?{" "}
                    <Link
                      href={createAccountHref}
                      className="font-semibold text-sky-700 underline underline-offset-2 transition-colors hover:text-sky-900"
                    >
                      Create one
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-xl bg-[linear-gradient(180deg,#2d3754_0%,#121827_100%)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${styles.primaryButtonMotion}`}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSignUpMode ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                isSignUpMode ? "Create account" : "Get Started"
              )}
            </button>
          </form>

          {visibleOAuthProviders.length > 0 && (
            <>
              <div className={`my-5 flex items-center gap-3 ${styles.socialIntro}`}>
                <div className="flex-1 border-t border-dashed border-slate-300" />
                <span className="whitespace-nowrap text-[11px] text-slate-500">
                  {isSignUpMode ? "Or continue with" : "Or sign in with"}
                </span>
                <div className="flex-1 border-t border-dashed border-slate-300" />
              </div>

              <div className={`grid ${socialGridClassName} gap-2`}>
                {visibleOAuthProviders.map((provider) => {
                  const title = `${isSignUpMode ? "Continue with" : "Sign in with"} ${oauthProviderLabel(provider)}`;
                  const className =
                    provider === "google"
                      ? "flex h-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      : provider === "github"
                        ? "flex h-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        : "flex h-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-[#5865F2] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";

                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => void onOAuthClick(provider)}
                      disabled={socialDisabled}
                      className={`${className} ${styles.socialButton}`}
                      title={title}
                      aria-label={title}
                    >
                      {oauthBusy === provider ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      ) : provider === "google" ? (
                        <GoogleIcon className="h-4 w-4" />
                      ) : provider === "github" ? (
                        <Github className="h-4 w-4" />
                      ) : (
                        <DiscordIcon className="h-4 w-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {socialProvidersKnown && visibleOAuthProviders.length === 0 && (
            <p className="mt-5 rounded-xl border border-amber-400/60 bg-amber-100 px-3.5 py-3 text-sm text-amber-900">
              Social auth is not enabled for this Supabase project yet. Use email and password for now, or enable Google, GitHub, or Discord in Supabase Auth.
            </p>
          )}
        </div>

        <div className={`mt-5 space-y-2 text-center ${styles.footerIntro}`}>
          <p className="text-sm text-slate-700">
            {isSignUpMode ? "Already have an account? " : "Don't have an account? "}
            {isSignUpMode ? (
              <Link
                href={signInHref}
                className="font-medium text-sky-700 transition-colors hover:text-sky-900"
              >
                Sign in
              </Link>
            ) : (
              <Link
                href={createAccountHref}
                className="font-medium text-sky-700 transition-colors hover:text-sky-900"
              >
                Create one
              </Link>
            )}
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 ${styles.pageTransition}`}>
          <Image src="/auth/signin-sky.svg" alt="" fill className={`object-cover ${styles.skyIntro}`} priority />
          <div className={`absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/25 ${styles.overlayIntro}`} />
          <div className={`relative z-10 w-full max-w-[350px] rounded-[26px] border border-white/65 bg-white/65 p-6 shadow-[0_26px_70px_rgba(54,92,140,0.22)] backdrop-blur-xl sm:p-7 ${styles.cardIntro}`}>
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            </div>
          </div>
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
