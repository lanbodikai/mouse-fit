"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuthGate } from "./AuthGateProvider";
import { useAuthState } from "@/hooks/useAuthState";
import { currentPathWithSearch } from "@/lib/auth-intent";

export default function ShellAuthBoundary({ children }: { children: ReactNode }) {
  const { ready, enabled, isAuthenticated } = useAuthState();
  const { openAuthModal } = useAuthGate();
  const modalRequested = useRef(false);

  useEffect(() => {
    if (!ready || !enabled || isAuthenticated) {
      if (isAuthenticated) modalRequested.current = false;
      return;
    }
    if (modalRequested.current) return;

    modalRequested.current = true;
    openAuthModal({
      next: currentPathWithSearch(),
      reason: "try_now",
      title: "Create your MouseFit account",
      description: "Sign up to enter MStudio and use the MouseFit services, catalog, and AI guidance.",
    });
  }, [enabled, isAuthenticated, openAuthModal, ready]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--shell-bg)] text-sm text-[var(--shell-text-secondary)]">
        Loading MouseFit...
      </div>
    );
  }

  if (!enabled || isAuthenticated) return <>{children}</>;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--shell-bg)] px-6 text-center text-[var(--shell-text-primary)]">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--shell-accent-strong)]">MStudio</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sign up to continue</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--shell-text-secondary)]">
          Create an account to enter the MouseFit workspace and move between services.
        </p>
        <button
          type="button"
          onClick={() =>
            openAuthModal({
              next: currentPathWithSearch(),
              reason: "try_now",
              title: "Create your MouseFit account",
              description: "Sign up to enter MStudio and use the MouseFit services, catalog, and AI guidance.",
            })
          }
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[var(--shell-accent)] px-5 text-sm font-semibold text-[var(--shell-text-inverse)]"
        >
          Sign up to continue
        </button>
      </div>
    </div>
  );
}
