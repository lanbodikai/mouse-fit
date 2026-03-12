"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Save,
  Shield,
  User,
  UserCog,
} from "lucide-react";
import { getApiBase, getMyProfile, updateMyProfile } from "@/lib/api";
import {
  getAuthUser,
  getSession,
  isAuthEnabled,
  resetPasswordForEmail,
  signOut,
  subscribeAuthChanges,
  type SupabaseUser,
} from "@/lib/auth";
import { buildLoginUrl } from "@/lib/auth-intent";
import type { ThemeMode, UserProfile } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { buildBestMouseFromStorage, type BestMouse } from "@/lib/reportStore";

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

function ProfileAvatar({
  avatarUrl,
  initials,
}: {
  avatarUrl?: string | null;
  initials: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-16 w-16 rounded-full object-cover shadow-lg"
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className="flex h-16 w-16 select-none items-center justify-center rounded-full text-xl font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--accent-gamer) 0%, var(--accent-highlight) 100%)" }}
    >
      {initials}
    </div>
  );
}

function isAuthError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("(401");
}

function isApiConnectivityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("api request failed (network error)") || message.includes("failed to fetch");
}

function backendUnavailableMessage(): string {
  return `Profile sync is unavailable because the API is not reachable at ${getApiBase()}. Start the backend and retry.`;
}

const LOCAL_PROFILE_KEY = "mf:profile:local";
const USER_SIGN_IN_PATH = buildLoginUrl("/user");

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
    const t =
      parsed.theme === "light" || parsed.theme === "dark"
        ? parsed.theme
        : defaultTheme;
    const normalized: UserProfile = {
      id: parsed.id || "local-user",
      email: parsed.email || null,
      display_name: parsed.display_name || "MouseFit User",
      avatar_url: parsed.avatar_url || null,
      theme: t,
      created_at: parsed.created_at || now,
      updated_at: parsed.updated_at || now,
    };
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function writeLocalProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}

function readAuthMetadataString(
  authUser: SupabaseUser | null,
  keys: string[],
): string | null {
  const metadata = authUser?.user_metadata;
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function getAuthDisplayName(authUser: SupabaseUser | null): string | null {
  return readAuthMetadataString(authUser, [
    "display_name",
    "full_name",
    "name",
    "user_name",
    "preferred_username",
  ]);
}

function getAuthAvatarUrl(authUser: SupabaseUser | null): string | null {
  return readAuthMetadataString(authUser, ["avatar_url", "picture"]);
}

function buildSignedInFallbackProfile(
  authUser: SupabaseUser,
  defaultTheme: ThemeMode,
  existingProfile?: UserProfile | null,
): UserProfile {
  const localProfile = readLocalProfile(defaultTheme);
  const now = new Date().toISOString();
  const baseProfile = existingProfile || localProfile;
  const preferredLocalName =
    baseProfile.display_name && baseProfile.display_name !== "MouseFit User"
      ? baseProfile.display_name
      : null;
  const displayName =
    preferredLocalName ||
    getAuthDisplayName(authUser) ||
    localProfile.display_name ||
    "MouseFit User";
  const avatarUrl =
    baseProfile.avatar_url ||
    getAuthAvatarUrl(authUser) ||
    localProfile.avatar_url ||
    null;

  return {
    id: authUser.id || baseProfile.id || "local-user",
    email: authUser.email || baseProfile.email || null,
    display_name: displayName,
    avatar_url: avatarUrl,
    theme:
      baseProfile.theme === "light" || baseProfile.theme === "dark"
        ? baseProfile.theme
        : localProfile.theme,
    created_at: authUser.created_at || baseProfile.created_at || now,
    updated_at: authUser.updated_at || baseProfile.updated_at || now,
  };
}

function profileSyncFallbackMessage(error: unknown): string {
  if (isApiConnectivityError(error)) {
    return `${backendUnavailableMessage()} Showing your signed-in profile with local fallback data.`;
  }
  if (error instanceof Error && error.message.trim()) {
    return `You're still signed in, but your server profile could not be loaded: ${error.message}`;
  }
  return "You're still signed in, but your server profile could not be loaded. Showing local fallback data.";
}

function formatGripLabel(grip: string): string {
  const value = grip.trim().toLowerCase();
  if (!value) return "Unknown";
  if (value === "fingertip") return "Fingertip";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatFitScore(score: number): string {
  if (!Number.isFinite(score)) return "N/A";
  if (score <= 1) return `${Math.round(score * 100)}% fit`;
  return `${Math.round(score)}% fit`;
}

type SidebarTab = "profile" | "account" | "security";

const SIDEBAR_ITEMS: { key: SidebarTab; label: string; icon: typeof User; accent: string; bg: string }[] = [
  { key: "profile", label: "Profile", icon: User, accent: "text-accent-gamer", bg: "bg-accent-gamer-soft" },
  { key: "account", label: "Account", icon: UserCog, accent: "text-accent-violet", bg: "bg-accent-violet-soft" },
  { key: "security", label: "Security", icon: Shield, accent: "text-accent-amber", bg: "bg-accent-amber-soft" },
];

/* ─── Sign-In Gate ─── */
function SignInGate() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-accent-gamer bg-accent-gamer-soft">
          <User className="h-10 w-10 text-accent-gamer" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            You&apos;re not signed in
          </h1>
          <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
            Sign in to access your profile, saved measurements, and personalized
            mouse recommendations.
          </p>
        </div>

        <Link
          href={USER_SIGN_IN_PATH}
          className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white mf-neon-btn transition-all hover:scale-[1.02]"
        >
          Sign in to your account
        </Link>

        <p className="text-xs text-white/35">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/sign-up?next=%2Fuser"
            className="font-medium text-accent-gamer hover-text-accent-gamer transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({
  profile,
  authUser,
  authEnabled,
  displayName,
  setDisplayName,
  dirty,
  saving,
  onSave,
  successMsg,
  error,
  bestFit,
}: {
  profile: UserProfile;
  authUser: SupabaseUser | null;
  authEnabled: boolean;
  displayName: string;
  setDisplayName: (v: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => Promise<boolean>;
  successMsg: string | null;
  error: string | null;
  bestFit: BestMouse | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const initials = getInitials(profile.display_name, profile.email);
  const avatarUrl = profile.avatar_url || null;
  const email = authEnabled
    ? profile.email || authUser?.email || ""
    : "Local profile (no account)";
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-white">Profile</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setDisplayName(profile.display_name || "");
              setIsEditing(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-accent-gamer bg-accent-gamer-soft px-4 py-2 text-sm font-medium text-accent-gamer-strong transition-colors hover-accent-gamer-strong"
          >
            <User className="h-4 w-4" />
            Edit profile
          </button>
        )}
      </div>

      {successMsg && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--tone-warning-line)", background: "var(--tone-warning-fill)", color: "var(--tone-warning-text)" }}>
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <ProfileAvatar avatarUrl={avatarUrl} initials={initials} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">
              {profile.display_name || "MouseFit User"}
            </p>
            <p className="truncate text-sm text-white/45">
              {email || "No email set"}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 border-l-2 border-l-[color:var(--accent-gamer-line)]">
              <p className="text-xs uppercase tracking-[0.12em] text-white/35">
                Display name
              </p>
              <p className="mt-1 text-sm font-medium text-white/85">
                {profile.display_name || "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 border-l-2 border-l-[color:var(--accent-violet-line)]">
              <p className="text-xs uppercase tracking-[0.12em] text-white/35">
                Member since
              </p>
              <p className="mt-1 text-sm font-medium text-white/85">
                {memberSince}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-white/70">
                Display name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-[color:var(--accent-gamer-line-strong)]"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-white/70">Email</span>
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
                <Mail className="h-4 w-4 shrink-0 text-white/25" />
                <span className="truncate">{email}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const saved = await onSave();
                  if (saved) {
                    setIsEditing(false);
                  }
                }}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:scale-[1.01] mf-neon-btn"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisplayName(profile.display_name || "");
                  setIsEditing(false);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              {!dirty && (
                <span className="text-xs text-white/30">No unsaved changes</span>
              )}
            </div>
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 border-t-2 border-t-[color:var(--accent-emerald-line)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent-emerald)]" />
            Best fitting peripherals
          </h3>
          <Link
            href="/report"
            className="text-sm font-medium text-accent-gamer transition-colors hover-text-accent-gamer"
          >
            View full report
          </Link>
        </div>

        {bestFit ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-accent-gamer bg-accent-gamer-soft p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.12em] text-white/45">
                  Top fit
                </p>
                <span className="rounded-full border border-accent-gamer bg-accent-gamer-soft px-2.5 py-1 text-xs font-semibold text-accent-gamer-strong">
                  {formatFitScore(bestFit.score)}
                </span>
              </div>
              <p className="text-base font-semibold text-white">{bestFit.name}</p>
              <p className="mt-1 text-xs text-white/45">
                Grip: {formatGripLabel(bestFit.recommendedGrip)} • Hand size:{" "}
                {String(bestFit.size || "unknown").toUpperCase()}
              </p>
              <p className="mt-3 text-sm text-white/55">{bestFit.notes}</p>
            </div>

            {bestFit.alternatives.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-white/35">
                  Alternatives
                </p>
                <div className="flex flex-wrap gap-2">
                  {bestFit.alternatives.map((alt, idx) => (
                    <span
                      key={`${alt}-${idx}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm text-white/55">
              No fit recommendations yet. Complete the fit flow to get your
              best matching peripherals.
            </p>
            <Link
              href="/survey"
              className="mt-3 inline-flex rounded-lg border border-accent-gamer bg-accent-gamer-soft px-3.5 py-2 text-sm font-medium text-accent-gamer-strong transition-colors hover-accent-gamer-strong"
            >
              Run MouseFit
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Account Tab ─── */
function AccountTab({
  profile,
  authUser,
  authEnabled,
  onSignOut,
}: {
  profile: UserProfile;
  authUser: SupabaseUser | null;
  authEnabled: boolean;
  onSignOut: () => void;
}) {
  const emailVerified = authUser?.email_confirmed_at != null;
  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );
  const userId = authEnabled ? authUser?.id || profile.id : profile.id;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">Account</h2>

      <div className="space-y-5">
        {/* Member since */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet-soft border border-accent-violet">
              <Calendar className="h-5 w-5 text-accent-violet" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Member since</p>
              <p className="text-sm text-white/45">{memberSince}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gamer-soft border border-accent-gamer">
              <User className="h-5 w-5 text-accent-gamer" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/80">User ID</p>
              <p className="text-xs font-mono text-white/35 truncate">
                {userId}
              </p>
            </div>
          </div>
        </div>

        {/* Email verification */}
        {authEnabled && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            {emailVerified ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15 border border-green-500/25">
                  <BadgeCheck className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">
                    Email verified
                  </p>
                  <p className="text-xs text-white/40">
                    Your email address has been confirmed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
                    <Mail className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      Verify your email
                    </p>
                    <p className="text-xs text-white/40">
                      Check your inbox for a verification link.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/auth/verify-email?email=${encodeURIComponent(profile.email || authUser?.email || "")}&next=${encodeURIComponent("/user")}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Verify email
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/55 transition-colors hover:opacity-80"
            style={{ ["--hover-border" as string]: "var(--tone-warning-line)" }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Security Tab ─── */
function SecurityTab({
  profile,
  authUser,
  authEnabled,
}: {
  profile: UserProfile;
  authUser: SupabaseUser | null;
  authEnabled: boolean;
}) {
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function onResetPassword() {
    const email = profile?.email || authUser?.email;
    if (!email || resetBusy) return;
    setResetBusy(true);
    setResetMsg(null);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/reset-password?next=${encodeURIComponent("/user")}`
          : undefined;
      await resetPasswordForEmail(email, redirectTo);
      setResetMsg("Password reset email sent. Check your inbox.");
    } catch (err) {
      setResetMsg(
        err instanceof Error ? err.message : "Could not send reset email.",
      );
    } finally {
      setResetBusy(false);
    }
  }

  if (!authEnabled) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Security
        </h2>
        <p className="text-sm text-white/45">
          Authentication is disabled. Security settings are not available for
          local profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">
        Security
      </h2>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/80">Password</p>
          <p className="text-xs text-white/40">
            Send a password reset link to your email address.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetPassword}
          disabled={resetBusy}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          {resetBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Reset password
        </button>

        {resetMsg && (
          <p className="text-sm text-white/50">{resetMsg}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function UserPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [authEnabledState, setAuthEnabledState] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bestFit, setBestFit] = useState<BestMouse | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const enabled = isAuthEnabled();
      if (!active) return;
      setAuthEnabledState(enabled);
      setError(null);

      if (!enabled) {
        const localProfile = readLocalProfile(theme);
        if (!active) return;
        setSignedIn(true);
        setProfile(localProfile);
        setDisplayName(localProfile.display_name || "");
        setLoading(false);
        return;
      }

      const session = getSession();
      if (!session?.access_token) {
        if (!active) return;
        setSignedIn(false);
        setAuthUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      setLoading(true);
      try {
        const user = await getAuthUser();
        if (!user?.id) {
          if (!active) return;
          signOut();
          setSignedIn(false);
          setAuthUser(null);
          setProfile(null);
          return;
        }

        if (!active) return;
        setAuthUser(user);

        try {
          const data = await getMyProfile();
          if (!active) return;
          setProfile(data);
          setDisplayName(data.display_name || "");
          if (data.theme === "light" || data.theme === "dark") {
            setTheme(data.theme);
          }
          return;
        } catch (err) {
          if (!active) return;
          const fallbackProfile = buildSignedInFallbackProfile(user, theme);
          setProfile(fallbackProfile);
          setDisplayName(fallbackProfile.display_name || "");
          if (fallbackProfile.theme === "light" || fallbackProfile.theme === "dark") {
            setTheme(fallbackProfile.theme);
          }
          setError(profileSyncFallbackMessage(err));
          return;
        }
      } catch (err) {
        if (!active) return;
        setError(isApiConnectivityError(err) ? backendUnavailableMessage() : err instanceof Error ? err.message : "Unable to load profile.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    const unsubscribe = subscribeAuthChanges(() => void loadProfile());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, setTheme, theme]);

  useEffect(() => {
    const syncBestFit = () => {
      setBestFit(buildBestMouseFromStorage());
    };

    syncBestFit();
    window.addEventListener("storage", syncBestFit);
    window.addEventListener("focus", syncBestFit);
    return () => {
      window.removeEventListener("storage", syncBestFit);
      window.removeEventListener("focus", syncBestFit);
    };
  }, []);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return (displayName.trim() || "") !== (profile.display_name?.trim() || "");
  }, [displayName, profile]);

  async function onSave(): Promise<boolean> {
    if (!profile || saving || !dirty) return false;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (!authEnabledState) {
        const updatedLocal: UserProfile = {
          ...profile,
          display_name: displayName.trim() || null,
          updated_at: new Date().toISOString(),
        };
        writeLocalProfile(updatedLocal);
        setProfile(updatedLocal);
        setDisplayName(updatedLocal.display_name || "");
        setSuccessMsg("Profile saved locally.");
        setTimeout(() => setSuccessMsg(null), 3000);
        return true;
      }
      const updated = await updateMyProfile({
        display_name: displayName.trim() || null,
      });
      setProfile(updated);
      setDisplayName(updated.display_name || "");
      setSuccessMsg("Profile saved.");
      setTimeout(() => setSuccessMsg(null), 3000);
      return true;
    } catch (err) {
      if (isAuthError(err)) {
        const user = authUser ?? (await getAuthUser().catch(() => null));
        if (!user?.id) {
          signOut();
          setSignedIn(false);
          setAuthUser(null);
          setProfile(null);
          return false;
        }
        const updatedLocal: UserProfile = {
          ...buildSignedInFallbackProfile(user, theme, profile),
          display_name: displayName.trim() || null,
          updated_at: new Date().toISOString(),
        };
        writeLocalProfile(updatedLocal);
        setAuthUser(user);
        setProfile(updatedLocal);
        setDisplayName(updatedLocal.display_name || "");
        setError(profileSyncFallbackMessage(err));
        setSuccessMsg("Profile saved locally while server sync is unavailable.");
        setTimeout(() => setSuccessMsg(null), 3000);
        return true;
      }
      setError(isApiConnectivityError(err) ? backendUnavailableMessage() : err instanceof Error ? err.message : "Unable to save profile.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function onSignOut() {
    if (!authEnabledState) {
      router.push("/dashboard");
      return;
    }
    signOut();
    router.push(buildLoginUrl("/user"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent-gamer" />
      </div>
    );
  }

  if (authEnabledState && !signedIn) {
    return <SignInGate />;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <p className="rounded-2xl border p-6 text-sm" style={{ borderColor: "var(--tone-warning-line)", background: "var(--tone-warning-fill)", color: "var(--tone-warning-text)" }}>
          {error || "Unable to load profile data. Please try refreshing the page."}
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">Account</h1>
      <div className="w-full max-w-5xl px-3 py-6 sm:px-5 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-12">
          {/* ─── Left Sidebar ─── */}
          <nav className="shrink-0 sm:sticky sm:top-6 sm:w-44">
            <ul className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <li key={item.key}>
                      <button
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap w-full text-left ${
                        isActive
                          ? `${item.accent} ${item.bg}`
                          : "text-white/50 hover:text-white/75 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ─── Divider ─── */}
          <div className="hidden sm:block w-px bg-white/10 self-stretch" />

          {/* ─── Content Area ─── */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <ProfileTab
                profile={profile}
                authUser={authUser}
                authEnabled={authEnabledState}
                displayName={displayName}
                setDisplayName={setDisplayName}
                dirty={dirty}
                saving={saving}
                onSave={onSave}
                successMsg={successMsg}
                error={error}
                bestFit={bestFit}
              />
            )}
            {activeTab === "account" && (
              <AccountTab
                profile={profile}
                authUser={authUser}
                authEnabled={authEnabledState}
                onSignOut={onSignOut}
              />
            )}
            {activeTab === "security" && (
              <SecurityTab
                profile={profile}
                authUser={authUser}
                authEnabled={authEnabledState}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
