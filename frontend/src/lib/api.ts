import type { CurrentUser, Grip, Measurement, Mouse, Report, ThemeMode, UserProfile } from "./types";
import { getAccessToken, handleUnauthorizedSession } from "./auth";

declare global {
  interface Window {
    __MOUSEFIT_API_BASE__?: string;
    __MOUSEFIT_FLAGS__?: {
      USE_SERVER_REPORT_PIPELINE?: boolean;
      ENABLE_AUTH?: boolean;
    };
  }
}

function normalizeBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const runtime = window.__MOUSEFIT_API_BASE__;
    if (typeof runtime === "string" && runtime.trim()) return normalizeBase(runtime);
  }

  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof envBase === "string" && envBase.trim()) return normalizeBase(envBase);

  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:8000";

  return "https://api.mousefit.pro";
}

function joinUrl(base: string, path: string) {
  const baseTrimmed = base.replace(/\/+$/, "");
  const pathTrimmed = path.startsWith("/") ? path : `/${path}`;
  return `${baseTrimmed}${pathTrimmed}`;
}

function shouldForceSignOut(code: string | undefined): boolean {
  return (
    code === "auth_required" ||
    code === "auth_missing_token" ||
    code === "auth_invalid_token" ||
    code === "auth_invalid_claims"
  );
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiBase = getApiBase();
  const url = /^https?:\/\//.test(path) ? path : joinUrl(apiBase, path);

  const headers = new Headers(options.headers);
  if (options.body != null && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`API request failed (network error) for ${url}: ${message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const statusText = res.statusText ? ` ${res.statusText}` : "";
    let errorCode: string | undefined;
    let message = text || "(empty response body)";
    try {
      const parsed = JSON.parse(text || "{}") as { message?: string; code?: string };
      errorCode = parsed?.code;
      if (parsed?.message) message = parsed.message;
    } catch {
      // ignore JSON parse errors
    }
    if (res.status === 401 && shouldForceSignOut(errorCode)) {
      handleUnauthorizedSession();
    }
    throw new Error(`API request failed (${res.status}${statusText}): ${message}`);
  }

  return res;
}

export async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  return (await res.json()) as T;
}

export function getHealth(): Promise<{ ok: boolean }> {
  return apiJson("/api/health");
}

export function getMyProfile(): Promise<UserProfile> {
  return apiJson("/api/profile/me");
}

export function updateMyProfile(payload: {
  display_name?: string | null;
  theme?: ThemeMode;
}): Promise<UserProfile> {
  return apiJson("/api/profile/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(): Promise<CurrentUser> {
  return apiJson("/api/me");
}

export function completeSurvey(): Promise<CurrentUser> {
  return apiJson("/api/survey/complete", {
    method: "POST",
  });
}

export function dismissSurveyReminder(): Promise<CurrentUser> {
  return apiJson("/api/survey/dismiss", {
    method: "POST",
  });
}

export function getMice(): Promise<Mouse[]> {
  return apiJson("/api/mice");
}

export function getMouse(id: string): Promise<Mouse> {
  return apiJson(`/api/mice/${id}`);
}

export function saveMeasurement(payload: {
  session_id: string;
  length_mm: number;
  width_mm: number;
}): Promise<Measurement> {
  return apiJson("/api/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveGrip(payload: {
  session_id: string;
  grip: string;
  confidence?: number;
}): Promise<Grip> {
  return apiJson("/api/grip", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateReport(sessionId: string): Promise<Report> {
  const encoded = encodeURIComponent(sessionId);
  return apiJson(`/api/report/generate?session_id=${encoded}`, { method: "POST" });
}

export function getLatestReport(sessionId: string): Promise<Report> {
  const encoded = encodeURIComponent(sessionId);
  return apiJson(`/api/report/latest?session_id=${encoded}`);
}

export function chat(payload: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  temperature?: number;
}): Promise<{ reply: string; request_id?: string }> {
  return apiJson("/api/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

