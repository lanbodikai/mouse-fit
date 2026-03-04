"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, Mail, Moon, Save, Sun, User } from "lucide-react";
import { ShellNav } from "@/components/shell/ShellNav";
import { getMyProfile, updateMyProfile } from "@/lib/api";
import { getSession, isAuthEnabled, signOut, subscribeAuthChanges } from "@/lib/auth";
import type { ThemeMode, UserProfile } from "@/lib/types";
import { useTheme } from "@/lib/theme";

function isAuthError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("(401");
}

function displayError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Unable to update profile.";
}

export default function UserPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [themeDraft, setThemeDraft] = useState<ThemeMode>("dark");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const enabled = isAuthEnabled();
      if (!active) return;
      setAuthEnabled(enabled);
      setError(null);

      const session = getSession();
      if (!enabled || !session?.access_token) {
        if (!active) return;
        setSignedIn(false);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      setLoading(true);
      try {
        const data = await getMyProfile();
        if (!active) return;
        setProfile(data);
        setDisplayName(data.display_name || "");
        const resolvedTheme = (data.theme || theme) as ThemeMode;
        setThemeDraft(resolvedTheme);
        setTheme(resolvedTheme);
      } catch (err) {
        if (!active) return;
        if (isAuthError(err)) {
          signOut();
          setSignedIn(false);
          router.replace("/auth");
          return;
        }
        setError(displayError(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    const unsubscribe = subscribeAuthChanges(() => {
      void loadProfile();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, setTheme, theme]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    const normalizedName = displayName.trim();
    const profileName = (profile.display_name || "").trim();
    const profileTheme = (profile.theme || themeDraft) as ThemeMode;
    return normalizedName !== profileName || themeDraft !== profileTheme;
  }, [displayName, profile, themeDraft]);

  async function onSave() {
    if (!profile || saving || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile({
        display_name: displayName.trim() || null,
        theme: themeDraft,
      });
      setProfile(updated);
      setDisplayName(updated.display_name || "");
      if (updated.theme === "light" || updated.theme === "dark") {
        setTheme(updated.theme);
        setThemeDraft(updated.theme);
      }
    } catch (err) {
      if (isAuthError(err)) {
        signOut();
        router.replace("/auth");
        return;
      }
      setError(displayError(err));
    } finally {
      setSaving(false);
    }
  }

  function onSignOut() {
    signOut();
    router.push("/auth");
  }

  return (
    <>
      <ShellNav currentPage="user" />

      <div className="mx-auto max-w-3xl px-6 md:px-12 lg:px-20">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-light text-white md:text-4xl">Profile</h1>
          <p className="text-white/50">Manage your account and preferences.</p>
        </header>

        {!authEnabled ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
            Authentication is disabled. Set <code>NEXT_PUBLIC_ENABLE_AUTH=1</code> and Supabase keys to manage profiles.
          </section>
        ) : !signedIn ? (
          <section className="rounded-2xl p-8 backdrop-blur-sm mf-neon-card-soft">
            <h2 className="text-xl font-medium text-white">Sign in required</h2>
            <p className="mt-2 text-white/60">Sign in to create or edit your profile, then access Dashboard and Settings from your profile dropdown.</p>
            <Link
              href="/auth"
              className="mt-6 inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors mf-neon-btn"
            >
              Go to Sign In
            </Link>
          </section>
        ) : loading ? (
          <section className="flex items-center gap-3 rounded-2xl p-6 text-white/70 backdrop-blur-sm mf-neon-card-soft">
            <Loader2 className="h-5 w-5 animate-spin text-fuchsia-400" />
            <span>Loading profile...</span>
          </section>
        ) : profile ? (
          <div className="space-y-6">
            <section className="rounded-2xl p-8 backdrop-blur-sm mf-neon-card-soft">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/20">
                    <User className="h-7 w-7 text-fuchsia-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-white">{profile.display_name || "MouseFit user"}</h2>
                    <p className="flex items-center gap-2 text-sm text-white/50">
                      <Mail className="h-4 w-4" />
                      <span>{profile.email || "No email available"}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/85 transition-colors mf-neon-btn"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>

              <div className="mb-4 text-sm text-white/45">
                Member since{" "}
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-white/70">Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500/40"
                />
              </label>
            </section>

            <section className="rounded-2xl p-6 backdrop-blur-sm mf-neon-card-soft">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/45">Appearance</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setTheme("light");
                    setThemeDraft("light");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
                    themeDraft === "light"
                      ? "border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-300"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  <span>Light mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("dark");
                    setThemeDraft("dark");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
                    themeDraft === "dark"
                      ? "border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-300"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  <span>Dark mode</span>
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!dirty || saving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 mf-neon-btn"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saving ? "Saving..." : "Save profile"}</span>
                </button>
                {!dirty ? <span className="text-sm text-white/45">No unsaved changes</span> : null}
              </div>

              {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
            </section>
          </div>
        ) : (
          <section className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-red-200">
            Unable to load profile data right now.
          </section>
        )}
      </div>
    </>
  );
}


