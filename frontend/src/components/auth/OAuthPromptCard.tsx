"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Github, Loader2, Sparkles, X } from "lucide-react";
import { DiscordIcon, GoogleIcon } from "@/components/auth/OAuthIcons";
import {
  getOAuthProviderAvailability,
  hasSupabaseAuthConfig,
  isAuthEnabled,
  oauthProviderLabel,
  OAUTH_PROVIDERS,
  signInWithOAuthRedirect,
  type AuthOAuthProvider,
} from "@/lib/auth";
import { buildAuthIntent, persistAuthIntent, type AuthIntentReason } from "@/lib/auth-intent";

type OAuthPromptCardProps = {
  nextPath: string;
  title: string;
  description: string;
  reason?: AuthIntentReason | string;
  onClose?: () => void;
  showHomeLink?: boolean;
};

const providerIconClassName =
  "flex h-12 items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45";

function providerIcon(provider: AuthOAuthProvider) {
  switch (provider) {
    case "google":
      return <GoogleIcon className="h-4 w-4" />;
    case "github":
      return <Github className="h-4 w-4" />;
    case "discord":
      return <DiscordIcon className="h-4 w-4" />;
  }
}

function friendlyOAuthError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not start sign in. Please try again.";
}

export function OAuthPromptCard({
  nextPath,
  title,
  description,
  reason = "auth_required",
  onClose,
  showHomeLink = false,
}: OAuthPromptCardProps) {
  const [runtime, setRuntime] = useState({
    authReady: false,
    authEnabled: false,
    authConfigured: false,
  });
  const [providersReady, setProvidersReady] = useState(false);
  const [providerAvailability, setProviderAvailability] = useState<Record<AuthOAuthProvider, boolean> | null>(null);
  const [busyProvider, setBusyProvider] = useState<AuthOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncRuntime = useEffectEvent(() => {
    setRuntime({
      authReady: true,
      authEnabled: isAuthEnabled(),
      authConfigured: hasSupabaseAuthConfig(),
    });
  });

  useEffect(() => {
    syncRuntime();
  }, []);

  const { authReady, authEnabled, authConfigured } = runtime;

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      if (!authReady) return;

      if (!authEnabled || !authConfigured) {
        if (!cancelled) {
          setProviderAvailability(null);
          setProvidersReady(true);
        }
        return;
      }

      if (!cancelled) {
        setProvidersReady(false);
      }

      const availability = await getOAuthProviderAvailability().catch(() => null);
      if (!cancelled) {
        setProviderAvailability(availability);
        setProvidersReady(true);
      }
    }

    void loadProviders();
    return () => {
      cancelled = true;
    };
  }, [authConfigured, authEnabled, authReady]);

  const visibleProviders = useMemo(
    () => OAUTH_PROVIDERS.filter((provider) => providerAvailability?.[provider] !== false),
    [providerAvailability],
  );
  const socialDisabled =
    !authReady || !providersReady || busyProvider !== null || !authEnabled || !authConfigured;

  async function handleProviderClick(provider: AuthOAuthProvider) {
    if (socialDisabled) return;

    setBusyProvider(provider);
    setError(null);

    try {
      persistAuthIntent(buildAuthIntent(nextPath, reason));
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      await signInWithOAuthRedirect(provider, callbackUrl.toString());
    } catch (oauthError) {
      setBusyProvider(null);
      setError(friendlyOAuthError(oauthError));
    }
  }

  return (
    <div className="relative w-full rounded-[30px] border border-white/70 bg-white/78 p-6 shadow-[0_28px_80px_rgba(41,64,94,0.18)] backdrop-blur-2xl sm:p-7">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in prompt"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-500 transition hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      <div className="pr-12">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-800 shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-[1.9rem] font-semibold leading-tight tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 max-w-[34ch] text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="mt-6 grid gap-3">
        {visibleProviders.map((provider) => {
          const label = oauthProviderLabel(provider);
          return (
            <button
              key={provider}
              type="button"
              onClick={() => void handleProviderClick(provider)}
              disabled={socialDisabled}
              className={providerIconClassName}
            >
              {busyProvider === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : providerIcon(provider)}
              Continue with {label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {authReady && !authEnabled ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sign in is not available right now. Start the app server, then try again.
          </div>
        ) : null}

        {authReady && authEnabled && !authConfigured ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            OAuth setup is not ready yet. Start the backend server, then try again.
          </div>
        ) : null}

        {providersReady && visibleProviders.length === 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Google, GitHub, and Discord sign-in are not available right now.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <p className="text-sm leading-6 text-slate-500">
          MouseFit uses social sign-in only. Username and password are not part of this flow.
        </p>

        {showHomeLink ? (
          <Link href="/" className="inline-flex text-sm font-medium text-slate-700 transition hover:text-slate-950">
            Back to home
          </Link>
        ) : null}
      </div>
    </div>
  );
}
