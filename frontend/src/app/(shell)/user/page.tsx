"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Loader2,
  LogOut,
  Mail,
  Save,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/lib/api";
import {
  getAuthUser,
  getSession,
  isAuthEnabled,
  signOut,
  subscribeAuthChanges,
  type SupabaseUser,
} from "@/lib/auth";
import { useAuthState } from "@/hooks/useAuthState";
import { buildBestMouseFromStorage } from "@/lib/reportStore";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";
import { useTheme } from "@/lib/theme";
import type { ThemeMode, UserProfile } from "@/lib/types";

const LOCAL_PROFILE_KEY = "mf:profile:local";

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "U";
  return source
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function readMetadataString(user: SupabaseUser | null, keys: string[]): string | null {
  const metadata = user?.user_metadata;
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readLocalProfile(defaultTheme: ThemeMode): UserProfile {
  const now = new Date().toISOString();
  const fallback: UserProfile = {
    id: "local-user",
    email: null,
    display_name: "MouseFit User",
    avatar_url: null,
    theme: defaultTheme,
    created_at: now,
    updated_at: now,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) {
      window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(fallback));
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      id: parsed.id || fallback.id,
      email: parsed.email || fallback.email,
      display_name: parsed.display_name || fallback.display_name,
      avatar_url: parsed.avatar_url || fallback.avatar_url,
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : defaultTheme,
      created_at: parsed.created_at || fallback.created_at,
      updated_at: parsed.updated_at || fallback.updated_at,
    };
  } catch {
    return fallback;
  }
}

function writeLocalProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}

function buildFallbackProfile(
  authUser: SupabaseUser | null,
  localProfile: UserProfile,
  theme: ThemeMode,
): UserProfile {
  const now = new Date().toISOString();
  return {
    id: authUser?.id || localProfile.id,
    email: authUser?.email || localProfile.email,
    display_name:
      localProfile.display_name ||
      readMetadataString(authUser, ["display_name", "full_name", "name", "preferred_username"]) ||
      "MouseFit User",
    avatar_url:
      localProfile.avatar_url || readMetadataString(authUser, ["avatar_url", "picture"]) || null,
    theme: localProfile.theme || theme,
    created_at: authUser?.created_at || localProfile.created_at || now,
    updated_at: authUser?.updated_at || localProfile.updated_at || now,
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mf-glass-pill inline-flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-[var(--shell-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading account...
      </div>
    </div>
  );
}

export default function UserPage() {
  const { ready: authReady } = useAuthState();
  const router = useRouter();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadProfile() {
      const localProfile = readLocalProfile(theme);

      if (!isAuthEnabled() || !getSession()?.access_token) {
        if (!cancelled) {
          setProfile(localProfile);
          setDisplayName(localProfile.display_name ?? "");
          setLoading(false);
        }
        return;
      }

      const [authUserResult, profileResult] = await Promise.allSettled([getAuthUser(), getMyProfile()]);
      if (cancelled) return;

      const authUser = authUserResult.status === "fulfilled" ? authUserResult.value : null;
      const remoteProfile = profileResult.status === "fulfilled" ? profileResult.value : null;
      const nextProfile = remoteProfile ?? buildFallbackProfile(authUser, localProfile, theme);

      writeLocalProfile(nextProfile);
      setProfile(nextProfile);
      setDisplayName(nextProfile.display_name ?? "");

      if (profileResult.status === "rejected") {
        setStatus(
          profileResult.reason instanceof Error
            ? `Using saved local profile. ${profileResult.reason.message}`
            : `Using saved local profile. Start the backend server to sync your account.`,
        );
      }

      setLoading(false);
    }

    void loadProfile();
    const unsubscribe = subscribeAuthChanges(() => {
      void loadProfile();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, theme]);

  const bestMouse = useMemo(() => buildBestMouseFromStorage(), []);
  const initials = getInitials(profile?.display_name, profile?.email);

  function formatFitScore(score: number): string {
    return `${score <= 1 ? Math.round(score * 100) : Math.round(score)}%`;
  }

  async function handleSave() {
    if (!profile) return;

    const normalizedName = displayName.trim() || "MouseFit User";
    const nextLocalProfile: UserProfile = {
      ...profile,
      display_name: normalizedName,
      theme,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    setStatus(null);

    try {
      writeLocalProfile(nextLocalProfile);

      if (isAuthEnabled() && getSession()?.access_token) {
        const updated = await updateMyProfile({ display_name: normalizedName, theme });
        const mergedProfile = { ...nextLocalProfile, ...updated };
        writeLocalProfile(mergedProfile);
        setProfile(mergedProfile);
      } else {
        setProfile(nextLocalProfile);
      }

      setStatus("Profile saved.");
    } catch (saveError) {
      setProfile(nextLocalProfile);
      setStatus(
        saveError instanceof Error
          ? `Saved on this device. ${saveError.message}`
          : "Saved on this device. Start the backend server to sync your account.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!authReady || loading) {
    return <LoadingPage />;
  }

  return (
    <ShellPage
      title="Account"
      description="Edit your profile, review account status, and see the latest fit saved to this device."
      actions={
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="mf-glass-button mf-glass-button-primary inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save profile
        </button>
      }
    >
      {status ? (
        <ShellPanel title="Status" description={status} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ShellPanel title="Profile" description="">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="shell-accent-surface flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">Signed in as</p>
                <p className="mt-2 truncate text-lg font-semibold text-[var(--shell-text-primary)]">
                  {profile?.email || "Local profile"}
                </p>
                <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">
                  {isAuthEnabled() ? "Authenticated profile" : "Local development profile"}
                </p>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-[var(--shell-text-tertiary)]">
                Display name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mf-glass-input mt-2 w-full rounded-md px-4 py-3 text-sm outline-none placeholder:text-[var(--shell-text-tertiary)]"
                placeholder="MouseFit User"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="shell-surface-soft rounded-md px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">Theme</p>
                <p className="mt-2 text-sm text-[var(--shell-text-primary)]">{theme === "dark" ? "Dark" : "Light"}</p>
              </div>

              <div className="shell-surface-soft rounded-md px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">Member Since</p>
                <p className="mt-2 text-sm text-[var(--shell-text-primary)]">{formatDate(profile?.created_at)}</p>
              </div>
            </div>
          </div>
        </ShellPanel>

        <div className="space-y-5">
          <ShellPanel title="Account Snapshot" description="">
            <div className="space-y-3">
              <div className="shell-surface-soft rounded-md px-4 py-4">
                <div className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
                <p className="mt-2 text-sm text-[var(--shell-text-primary)]">{profile?.email || "Not set"}</p>
              </div>

              <div className="shell-surface-soft rounded-md px-4 py-4">
                <div className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Latest Fit
                </div>
                <p className="mt-2 text-sm text-[var(--shell-text-primary)]">
                  {bestMouse ? `${bestMouse.name} · ${formatFitScore(bestMouse.score)}` : "No stored report yet"}
                </p>
              </div>

              <div className="shell-surface-soft rounded-md px-4 py-4">
                <div className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
                  <Shield className="h-3.5 w-3.5" />
                  Mode
                </div>
                <p className="mt-2 text-sm text-[var(--shell-text-primary)]">
                  {isAuthEnabled() ? "Server-backed account" : "Local development profile"}
                </p>
              </div>
            </div>
          </ShellPanel>

          <ShellPanel title="Security" description="">
            <div className="space-y-3">
              <div className="shell-surface-soft rounded-md px-4 py-4">
                <p className="text-sm font-semibold text-[var(--shell-text-primary)]">OAuth-only account</p>
                <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">
                  MouseFit now uses Google, Discord, and GitHub sign-in only. Username and password are not used in this account flow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.push("/dashboard");
                }}
                className="flex w-full items-center justify-between rounded-md border border-[rgba(187,88,104,0.24)] bg-[rgba(187,88,104,0.08)] px-4 py-4 text-left transition hover:bg-[rgba(187,88,104,0.12)]"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--tone-danger-text)]">Sign out</p>
                  <p className="mt-1 text-sm text-[var(--tone-danger-text)] opacity-80">End the current session and return to the shell.</p>
                </div>
                <LogOut className="h-4 w-4 text-[var(--tone-danger-text)]" />
              </button>
            </div>
          </ShellPanel>
        </div>
      </div>
    </ShellPage>
  );
}
