export const LOGIN_PATH = "/login";
export const SIGN_UP_PATH = "/auth/sign-up";
export const DEFAULT_POST_LOGIN_PATH = "/dashboard";
export const TRY_NOW_DESTINATION = "/dashboard";

export const AUTH_INTENT_COOKIE = "mousefit_auth_intent";
export const AUTH_STATE_COOKIE = "mousefit_auth_state";

const AUTH_PATH_PREFIXES = [
  "/auth",
  LOGIN_PATH,
  "/signup",
  "/forgot-password",
] as const;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthIntentReason = "try_now" | "auth_required" | "session_expired" | "password_reset";

export type AuthIntent = {
  destination: string;
  reason?: AuthIntentReason | string;
  createdAt: string;
};

export type AuthStateCookie = {
  expiresAt?: number;
  userId?: string;
};

function normalizePathname(value: string): string {
  return value.split("?")[0]?.split("#")[0] || "/";
}

export function isAuthPath(value: string): boolean {
  const normalized = normalizePathname(value);
  return AUTH_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export function sanitizeRedirectPath(nextRaw: string | null | undefined, fallback = DEFAULT_POST_LOGIN_PATH): string {
  const next = String(nextRaw || "").trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  if (isAuthPath(next)) {
    return fallback;
  }
  return next;
}

export function buildLoginUrl(nextRaw?: string | null, emailRaw?: string | null): string {
  const next = sanitizeRedirectPath(nextRaw, DEFAULT_POST_LOGIN_PATH);
  const email = String(emailRaw || "").trim();
  if ((!next || next === DEFAULT_POST_LOGIN_PATH) && !email) {
    return LOGIN_PATH;
  }
  const params = new URLSearchParams();
  if (next && next !== DEFAULT_POST_LOGIN_PATH) {
    params.set("next", next);
  }
  if (email) {
    params.set("email", email);
  }
  return `${LOGIN_PATH}?${params.toString()}`;
}

export function buildAuthIntent(destinationRaw: string, reason?: AuthIntentReason | string): AuthIntent {
  return {
    destination: sanitizeRedirectPath(destinationRaw, DEFAULT_POST_LOGIN_PATH),
    reason,
    createdAt: new Date().toISOString(),
  };
}

export function encodeCookiePayload(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

export function decodeCookiePayload<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return null;
  }
}

export function readCookieValue(name: string, cookieSource?: string): string | null {
  const source = cookieSource ?? (typeof document !== "undefined" ? document.cookie : "");
  if (!source) return null;

  const target = `${name}=`;
  for (const segment of source.split(";")) {
    const trimmed = segment.trim();
    if (trimmed.startsWith(target)) {
      return trimmed.slice(target.length);
    }
  }
  return null;
}

export function readAuthIntent(cookieSource?: string): AuthIntent | null {
  return decodeCookiePayload<AuthIntent>(readCookieValue(AUTH_INTENT_COOKIE, cookieSource));
}

export function persistAuthIntent(intent: AuthIntent): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_INTENT_COOKIE}=${encodeCookiePayload(intent)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAuthIntent(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_INTENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function resolvePostAuthDestination(nextRaw?: string | null, consume = true): string {
  const intent = readAuthIntent();
  const destination = intent?.destination
    ? sanitizeRedirectPath(intent.destination, DEFAULT_POST_LOGIN_PATH)
    : sanitizeRedirectPath(nextRaw, DEFAULT_POST_LOGIN_PATH);

  if (consume) {
    clearAuthIntent();
  }
  return destination;
}

export function readAuthStateCookie(cookieSource?: string): AuthStateCookie | null {
  return decodeCookiePayload<AuthStateCookie>(readCookieValue(AUTH_STATE_COOKIE, cookieSource));
}

export function hasValidAuthState(authState: AuthStateCookie | null, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!authState) return false;
  if (typeof authState.expiresAt === "number" && authState.expiresAt <= nowSeconds) {
    return false;
  }
  return true;
}

export function currentPathWithSearch(): string {
  if (typeof window === "undefined") return DEFAULT_POST_LOGIN_PATH;
  return sanitizeRedirectPath(`${window.location.pathname}${window.location.search}`, DEFAULT_POST_LOGIN_PATH);
}
