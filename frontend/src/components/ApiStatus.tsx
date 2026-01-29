"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type ApiState =
  | { status: "checking" }
  | { status: "connected" }
  | { status: "disconnected"; error: string };

export function ApiStatus() {
  const [state, setState] = useState<ApiState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    apiJson<{ ok: boolean }>("/api/health")
      .then((data) => {
        if (cancelled) return;
        setState(data?.ok ? { status: "connected" } : { status: "disconnected", error: "Health check returned ok=false" });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: "disconnected", error: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "checking") {
    return <span className="text-xs text-white/50">API: Checking</span>;
  }

  if (state.status === "connected") {
    return <span className="text-xs text-green-400">API: Connected</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-400">API: Disconnected</span>
      <details className="group">
        <summary className="cursor-pointer select-none text-xs text-white/50 hover:text-white/70">
          Details
        </summary>
        <pre className="mt-2 max-w-[420px] whitespace-pre-wrap break-words rounded-md bg-black/40 p-2 text-[11px] text-white/70">
          {state.error}
        </pre>
      </details>
    </div>
  );
}

