"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, isAuthEnabled, subscribeAuthChanges } from "@/lib/auth";
import { buildAuthIntent, buildLoginUrl, currentPathWithSearch, persistAuthIntent } from "@/lib/auth-intent";

export function useRequireAuth(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ensureAuth = () => {
      if (!isAuthEnabled()) {
        setReady(true);
        return;
      }

      const session = getSession();
      if (session?.access_token) {
        setReady(true);
        return;
      }

      setReady(false);
      const destination = currentPathWithSearch();
      persistAuthIntent(buildAuthIntent(destination, "auth_required"));
      router.replace(buildLoginUrl(destination));
    };

    ensureAuth();
    return subscribeAuthChanges(ensureAuth);
  }, [router]);

  return ready;
}
