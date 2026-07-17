"use client";

import { useEffect, useState } from "react";
import { getSession, isAuthEnabled, subscribeAuthChanges, type AuthSession } from "@/lib/auth";

type AuthState = {
  ready: boolean;
  enabled: boolean;
  session: AuthSession | null;
  isAuthenticated: boolean;
};

function readAuthSnapshot(): Omit<AuthState, "ready"> {
  const enabled = isAuthEnabled();
  const session = enabled ? getSession() : null;

  return {
    enabled,
    session,
    isAuthenticated: Boolean(session?.access_token),
  };
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(() => ({
    ...readAuthSnapshot(),
    ready: false,
  }));

  useEffect(() => {
    const sync = () => {
      setState({
        ...readAuthSnapshot(),
        ready: true,
      });
    };

    sync();
    return subscribeAuthChanges(sync);
  }, []);

  return state;
}
