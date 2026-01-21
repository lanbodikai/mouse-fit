import { useEffect, useState } from "react";

const SESSION_KEY = "mousefit:v2:session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
  window.localStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

export function useSessionId(): string {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  return sessionId;
}
