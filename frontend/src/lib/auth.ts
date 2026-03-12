import {
  AUTH_STATE_COOKIE,
  buildAuthIntent,
  buildLoginUrl,
  currentPathWithSearch,
  encodeCookiePayload,
  persistAuthIntent,
} from "./auth-intent";

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
  };
};

type AuthUser = AuthSession["user"];

type AuthRequestResult = {
  session: AuthSession | null;
  user?: AuthUser;
};

type AuthRequestOptions = {
  allowMissingSession?: boolean;
};

export const OAUTH_PROVIDERS = ["google", "github", "discord"] as const;

export type AuthOAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export type OAuthProviderAvailability = Record<AuthOAuthProvider, boolean>;

class AuthApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

export class AuthPendingVerificationError extends Error {
  constructor(message = "Account created. Check your email to verify before signing in.") {
    super(message);
    this.name = "AuthPendingVerificationError";
  }
}

declare global {
  interface Window {
    __MOUSEFIT_SUPABASE__?: {
      url?: string;
      anonKey?: string;
    };
    __MOUSEFIT_FLAGS__?: {
      ENABLE_AUTH?: boolean;
      USE_SERVER_REPORT_PIPELINE?: boolean;
    };
  }
}

const AUTH_SESSION_KEY = "mousefit:auth:session";
const AUTH_CHANGED_EVENT = "mousefit:auth:changed";
const OAUTH_PKCE_VERIFIER_KEY = "mousefit:auth:pkce:verifier";
const OAUTH_LAST_EXCHANGED_CODE_KEY = "mousefit:auth:oauth:last_code";
const OAUTH_LAST_PROVIDER_KEY = "mousefit:auth:oauth:last_provider";
const OAUTH_CALLBACK_PATH = "/auth/callback";
const AUTH_STATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
let oauthProviderAvailabilityCache: OAuthProviderAvailability | undefined;
let oauthProviderAvailabilityPromise: Promise<OAuthProviderAvailability | null> | null = null;

function authEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.__MOUSEFIT_FLAGS__?.ENABLE_AUTH);
}

export function isAuthEnabled(): boolean {
  return authEnabled();
}

function supabaseConfig(): { url: string; anonKey: string } {
  const runtime = typeof window !== "undefined" ? window.__MOUSEFIT_SUPABASE__ : undefined;
  const url = String(runtime?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const anonKey = String(runtime?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  return { url, anonKey };
}

export function getSupabaseCallbackUrl(): string | null {
  const { url } = supabaseConfig();
  if (!url) return null;
  return `${url}/auth/v1/callback`;
}

function requireSupabaseConfig(): { url: string; anonKey: string } {
  const config = supabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new Error("Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return config;
}

export function hasSupabaseAuthConfig(): boolean {
  const { url, anonKey } = supabaseConfig();
  return Boolean(url && anonKey);
}

function emitAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function syncAuthStateCookie(session: AuthSession | null): void {
  if (typeof document === "undefined") return;
  if (!session?.access_token) {
    document.cookie = `${AUTH_STATE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const maxAge =
    typeof session.expires_at === "number"
      ? Math.max(0, session.expires_at - nowSeconds)
      : AUTH_STATE_COOKIE_MAX_AGE;

  document.cookie = `${AUTH_STATE_COOKIE}=${encodeCookiePayload({
    expiresAt: session.expires_at,
    userId: session.user?.id,
  })}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function sessionExpired(session: AuthSession | null): boolean {
  return typeof session?.expires_at === "number" && session.expires_at <= Math.floor(Date.now() / 1000);
}

function setSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    syncAuthStateCookie(null);
    emitAuthChanged();
    return;
  }
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  syncAuthStateCookie(session);
  emitAuthChanged();
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (sessionExpired(session)) {
      setSession(null);
      return null;
    }
    syncAuthStateCookie(session);
    return session;
  } catch {
    setSession(null);
    return null;
  }
}

export function getAccessToken(): string | null {
  if (!authEnabled()) return null;
  const session = getSession();
  if (!session?.access_token) return null;
  return session.access_token;
}

export function subscribeAuthChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onAuthChanged = () => callback();
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_SESSION_KEY) callback();
  };

  window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.removeEventListener("storage", onStorage);
  };
}

function extractUser(data: Record<string, unknown>): AuthUser | undefined {
  if (typeof data.user !== "object" || !data.user) return undefined;
  const raw = data.user as Record<string, unknown>;
  return {
    id: String(raw.id || ""),
    email: typeof raw.email === "string" ? raw.email : undefined,
  };
}

function extractSession(data: Record<string, unknown>): AuthSession | null {
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!accessToken) return null;
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    expires_at: typeof data.expires_at === "number" ? data.expires_at : undefined,
    user: extractUser(data),
  };
  return session;
}

function authErrorCode(data: Record<string, unknown>): string | undefined {
  const candidates = [data.error_code, data.code, data.error];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

function authErrorMessage(data: Record<string, unknown>): string {
  const candidates = [data.error_description, data.msg, data.message, data.error];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "Authentication failed";
}

function extractOAuthProviderAvailability(data: Record<string, unknown>): OAuthProviderAvailability | null {
  if (typeof data.external !== "object" || !data.external) return null;
  const external = data.external as Record<string, unknown>;
  return {
    google: external.google === true,
    github: external.github === true,
    discord: external.discord === true,
  };
}

export function oauthProviderLabel(provider: AuthOAuthProvider): string {
  switch (provider) {
    case "github":
      return "GitHub";
    case "discord":
      return "Discord";
    case "google":
      return "Google";
  }
}

export async function getOAuthProviderAvailability(): Promise<OAuthProviderAvailability | null> {
  if (oauthProviderAvailabilityCache !== undefined) {
    return oauthProviderAvailabilityCache;
  }
  if (oauthProviderAvailabilityPromise) {
    return oauthProviderAvailabilityPromise;
  }

  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  oauthProviderAvailabilityPromise = fetch(`${url}/auth/v1/settings`, {
    headers: {
      apikey: anonKey,
    },
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const availability = extractOAuthProviderAvailability(data);
      if (availability) {
        oauthProviderAvailabilityCache = availability;
      }
      return availability;
    })
    .catch(() => null)
    .finally(() => {
      oauthProviderAvailabilityPromise = null;
    });

  return oauthProviderAvailabilityPromise;
}

async function supabaseAuthRequest(
  path: string,
  payload: Record<string, unknown>,
  options: AuthRequestOptions = {},
): Promise<AuthRequestResult> {
  const { url, anonKey } = requireSupabaseConfig();

  const res = await fetch(`${url}/auth/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new AuthApiError(authErrorMessage(data), res.status, authErrorCode(data));
  }

  const session = extractSession(data);
  const user = extractUser(data);
  if (!session && !options.allowMissingSession) {
    throw new Error("Authentication response did not include access_token.");
  }
  if (session) setSession(session);
  return { session, user };
}

async function triggerWelcomeEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const res = await fetch("/api/auth/welcome", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: normalizedEmail }),
    keepalive: true,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(authErrorMessage(data));
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const result = await supabaseAuthRequest("/token?grant_type=password", { email, password });
  if (!result.session) throw new Error("Authentication response did not include access_token.");
  return result.session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ session: AuthSession | null; requiresEmailVerification: boolean }> {
  const normalizedEmail = email.trim();
  const result = await supabaseAuthRequest("/signup", { email: normalizedEmail, password }, { allowMissingSession: true });
  void triggerWelcomeEmail(normalizedEmail).catch((error) => {
    console.error("Welcome email trigger failed:", error);
  });
  return {
    session: result.session,
    requiresEmailVerification: !result.session,
  };
}

function isCredentialFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password") ||
    message.includes("invalid_grant")
  ) {
    return true;
  }
  if (error instanceof AuthApiError) {
    return ["invalid_grant", "invalid_credentials", "email_not_confirmed"].includes(String(error.code || ""));
  }
  return false;
}

function isAlreadyRegisteredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("already exists")) return true;
  if (error instanceof AuthApiError) {
    return ["user_already_exists", "email_exists"].includes(String(error.code || ""));
  }
  return false;
}

export async function signInOrCreateWithPassword(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = email.trim();
  const normalizedPassword = password;
  try {
    return await signInWithPassword(normalizedEmail, normalizedPassword);
  } catch (signInErr) {
    if (!isCredentialFailure(signInErr)) throw signInErr;
    try {
      const signUpResult = await signUpWithPassword(normalizedEmail, normalizedPassword);
      if (signUpResult.session) return signUpResult.session;
      throw new AuthPendingVerificationError();
    } catch (signUpErr) {
      if (signUpErr instanceof AuthPendingVerificationError) throw signUpErr;
      if (isAlreadyRegisteredError(signUpErr)) {
        if (signInErr instanceof Error) throw signInErr;
        throw new Error("Invalid email or password.");
      }
      throw signUpErr;
    }
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) {
    raw += String.fromCharCode(bytes[i]);
  }
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBytes(length: number): Uint8Array {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Browser crypto APIs are unavailable.");
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function pkceChallenge(verifier: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Browser crypto APIs are unavailable.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function signInWithOAuthRedirect(provider: AuthOAuthProvider, redirectTo?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const { url } = requireSupabaseConfig();
  const availability = await getOAuthProviderAvailability();
  if (availability && availability[provider] === false) {
    throw new Error(`${oauthProviderLabel(provider)} sign in is not enabled for this project.`);
  }
  const verifier = encodeBase64Url(randomBytes(64));
  const challenge = await pkceChallenge(verifier);
  const callbackUrl = redirectTo || `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
  window.localStorage.setItem(OAUTH_PKCE_VERIFIER_KEY, verifier);
  window.localStorage.setItem(OAUTH_LAST_PROVIDER_KEY, provider);

  const authUrl = new URL(`${url}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("redirect_to", callbackUrl);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "s256");
  authUrl.searchParams.set("flow_type", "pkce");
  if (provider === "github") {
    authUrl.searchParams.set("scopes", "read:user user:email");
  }

  window.location.assign(authUrl.toString());
}

export async function signInWithGoogleRedirect(redirectTo?: string): Promise<void> {
  await signInWithOAuthRedirect("google", redirectTo);
}

export async function signInWithGithubRedirect(redirectTo?: string): Promise<void> {
  await signInWithOAuthRedirect("github", redirectTo);
}

function parseHashSession(hashParams: URLSearchParams): AuthSession | null {
  const accessToken = hashParams.get("access_token");
  if (!accessToken) return null;
  const refreshToken = hashParams.get("refresh_token");
  const expiresAtRaw = hashParams.get("expires_at");
  const expiresInRaw = hashParams.get("expires_in");
  let expiresAt: number | undefined;
  if (expiresAtRaw) {
    const parsed = Number(expiresAtRaw);
    if (!Number.isNaN(parsed)) expiresAt = parsed;
  } else if (expiresInRaw) {
    const parsed = Number(expiresInRaw);
    if (!Number.isNaN(parsed)) {
      expiresAt = Math.floor(Date.now() / 1000) + parsed;
    }
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken || undefined,
    expires_at: expiresAt,
  };
}

export async function exchangeOAuthCodeForSession(code: string): Promise<AuthSession> {
  if (typeof window === "undefined") {
    throw new Error("OAuth exchange requires a browser environment.");
  }
  const normalizedCode = code.trim();
  if (!normalizedCode) {
    throw new Error("OAuth callback did not include an authorization code.");
  }
  const lastExchangedCode = window.localStorage.getItem(OAUTH_LAST_EXCHANGED_CODE_KEY);
  if (lastExchangedCode === normalizedCode) {
    const existingSession = getSession();
    if (existingSession?.access_token) {
      return existingSession;
    }
  }
  const verifier = window.localStorage.getItem(OAUTH_PKCE_VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Missing OAuth verifier. Please restart sign in.");
  }

  try {
    const result = await supabaseAuthRequest("/token?grant_type=pkce", {
      auth_code: normalizedCode,
      code_verifier: verifier,
    });
    if (!result.session) {
      throw new Error("OAuth callback did not return an access token.");
    }
    window.localStorage.setItem(OAUTH_LAST_EXCHANGED_CODE_KEY, normalizedCode);
    return result.session;
  } finally {
    window.localStorage.removeItem(OAUTH_PKCE_VERIFIER_KEY);
  }
}

export async function handleAuthCallback(currentUrl?: string): Promise<AuthSession> {
  if (typeof window === "undefined") {
    throw new Error("OAuth callback requires a browser environment.");
  }
  const callbackUrl = new URL(currentUrl || window.location.href);
  const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));

  const errorMessage =
    callbackUrl.searchParams.get("error_description") ||
    callbackUrl.searchParams.get("error") ||
    hashParams.get("error_description") ||
    hashParams.get("error");
  if (errorMessage) {
    throw new Error(decodeURIComponent(errorMessage));
  }

  const hashSession = parseHashSession(hashParams);
  if (hashSession) {
    setSession(hashSession);
    window.localStorage.removeItem(OAUTH_PKCE_VERIFIER_KEY);
    return hashSession;
  }

  const code = callbackUrl.searchParams.get("code");
  if (!code) {
    throw new Error("OAuth callback did not include an authorization code.");
  }

  return exchangeOAuthCodeForSession(code);
}

export function signOut(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(OAUTH_PKCE_VERIFIER_KEY);
    window.localStorage.removeItem(OAUTH_LAST_EXCHANGED_CODE_KEY);
    window.localStorage.removeItem(OAUTH_LAST_PROVIDER_KEY);
  }
  setSession(null);
}

export function getLastOAuthProvider(): AuthOAuthProvider | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(OAUTH_LAST_PROVIDER_KEY);
  if (!value) return null;
  return OAUTH_PROVIDERS.includes(value as AuthOAuthProvider) ? (value as AuthOAuthProvider) : null;
}

export function handleUnauthorizedSession(reason = "session_expired"): void {
  if (typeof window === "undefined") {
    signOut();
    return;
  }

  const destination = currentPathWithSearch();
  persistAuthIntent(buildAuthIntent(destination, reason));
  signOut();
  window.location.assign(buildLoginUrl(destination));
}

export type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  user_metadata?: Record<string, unknown>;
};

export async function getAuthUser(): Promise<SupabaseUser | null> {
  const session = getSession();
  if (!session?.access_token) return null;

  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) return null;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
  });

  if (res.status === 401) {
    handleUnauthorizedSession();
    return null;
  }
  if (!res.ok) return null;
  return (await res.json()) as SupabaseUser;
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase auth is not configured.");
  }

  const res = await fetch(`${url}/auth/v1/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({ type: "signup", email }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new AuthApiError(authErrorMessage(data), res.status, authErrorCode(data));
  }
}

export async function resetPasswordForEmail(email: string, redirectTo?: string): Promise<void> {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase auth is not configured.");
  }

  const payload: Record<string, string> = { email };
  if (redirectTo) payload.redirect_to = redirectTo;

  const res = await fetch(`${url}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new AuthApiError(authErrorMessage(data), res.status, authErrorCode(data));
  }
}

export async function updatePassword(password: string): Promise<void> {
  const session = getSession();
  if (!session?.access_token) {
    throw new Error("No active recovery session. Restart the password reset flow.");
  }

  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase auth is not configured.");
  }

  const res = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ password }),
  });

  if (res.status === 401) {
    handleUnauthorizedSession();
    return;
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new AuthApiError(authErrorMessage(data), res.status, authErrorCode(data));
  }
}
