import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_STATE_COOKIE,
  DEFAULT_POST_LOGIN_PATH,
  hasValidAuthState,
  readAuthStateCookie,
  sanitizeRedirectPath,
} from "./src/lib/auth-intent";

const AUTH_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_AUTH ?? "1").trim().toLowerCase() === "1";
const REDIRECT_IF_AUTHENTICATED_PATHS = new Set(["/", "/auth", "/auth/sign-in", "/login"]);

function redirectAuthenticatedRequest(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (!REDIRECT_IF_AUTHENTICATED_PATHS.has(pathname)) {
    return null;
  }

  const nextPath = sanitizeRedirectPath(request.nextUrl.searchParams.get("next"), DEFAULT_POST_LOGIN_PATH);
  const destination = pathname === "/" ? DEFAULT_POST_LOGIN_PATH : nextPath;
  return NextResponse.redirect(new URL(destination, request.url));
}

export function middleware(request: NextRequest) {
  if (!AUTH_ENABLED) {
    return NextResponse.next();
  }

  const authState = readAuthStateCookie(request.cookies.get(AUTH_STATE_COOKIE)?.value);
  if (hasValidAuthState(authState)) {
    return redirectAuthenticatedRequest(request) ?? NextResponse.next();
  }

  // Avoid server-side redirect loops after OAuth callbacks.
  // This app's primary auth session is client-side (localStorage), which middleware cannot read.
  // Shell pages enforce auth on the client via ShellAuthBoundary.
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth", "/auth/sign-in", "/login"],
};
