"use client";

import { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { OAuthPromptCard } from "@/components/auth/OAuthPromptCard";
import { currentPathWithSearch, DEFAULT_POST_LOGIN_PATH, sanitizeRedirectPath, type AuthIntentReason } from "@/lib/auth-intent";
import { useAuthState } from "@/hooks/useAuthState";

type AuthModalOptions = {
  next?: string;
  reason?: AuthIntentReason | string;
  title?: string;
  description?: string;
};

type AuthModalRequest = Required<Pick<AuthModalOptions, "title" | "description">> & {
  nextPath: string;
  reason: AuthIntentReason | string;
};

type AuthGateContextValue = {
  isAuthReady: boolean;
  isAuthenticated: boolean;
  openAuthModal: (options?: AuthModalOptions) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void, options?: AuthModalOptions) => boolean;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

function buildRequest(options?: AuthModalOptions): AuthModalRequest {
  const currentPath = currentPathWithSearch();
  const nextPath = sanitizeRedirectPath(options?.next ?? currentPath, DEFAULT_POST_LOGIN_PATH);

  return {
    nextPath,
    reason: options?.reason ?? "auth_required",
    title: options?.title ?? "Create your MouseFit account",
    description:
      options?.description ??
      "Continue with Google, Discord, or GitHub to unlock surveys, AI guidance, and full mouse details.",
  };
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { ready, enabled, isAuthenticated } = useAuthState();
  const [request, setRequest] = useState<AuthModalRequest | null>(null);
  const closeResolvedRequest = useEffectEvent(() => {
    setRequest(null);
  });

  useEffect(() => {
    if (isAuthenticated && request) {
      closeResolvedRequest();
    }
  }, [isAuthenticated, request]);

  const closeAuthModal = useCallback(() => {
    setRequest(null);
  }, []);

  const openAuthModal = useCallback((options?: AuthModalOptions) => {
    if (!enabled) return;
    setRequest(buildRequest(options));
  }, [enabled]);

  const requireAuth = useCallback(
    (action: () => void, options?: AuthModalOptions) => {
      if (!enabled || isAuthenticated) {
        action();
        return true;
      }

      setRequest(buildRequest(options));
      return false;
    },
    [enabled, isAuthenticated],
  );

  const value = useMemo<AuthGateContextValue>(
    () => ({
      isAuthReady: ready,
      isAuthenticated,
      openAuthModal,
      closeAuthModal,
      requireAuth,
    }),
    [closeAuthModal, isAuthenticated, openAuthModal, ready, requireAuth],
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}

      {request ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close sign in dialog"
            onClick={closeAuthModal}
            className="absolute inset-0 bg-[rgba(10,16,30,0.48)] backdrop-blur-[10px]"
          />
          <div className="relative z-10 w-full max-w-[440px]">
            <OAuthPromptCard
              nextPath={request.nextPath}
              reason={request.reason}
              title={request.title}
              description={request.description}
              onClose={closeAuthModal}
            />
          </div>
        </div>
      ) : null}
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateContextValue {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error("useAuthGate must be used within AuthGateProvider.");
  }
  return context;
}
