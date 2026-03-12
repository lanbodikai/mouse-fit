import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_STATE_COOKIE,
  hasValidAuthState,
  readAuthStateCookie,
} from "./src/lib/auth-intent";

const AUTH_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_AUTH ?? "1").trim().toLowerCase() === "1";

export function middleware(request: NextRequest) {
  if (!AUTH_ENABLED) {
    return NextResponse.next();
  }

  const authState = readAuthStateCookie(request.cookies.get(AUTH_STATE_COOKIE)?.value);
  if (hasValidAuthState(authState)) {
    return NextResponse.next();
  }

  // Avoid server-side redirect loops after OAuth callbacks.
  // This app's primary auth session is client-side (localStorage), which middleware cannot read.
  // Protected pages enforce auth on the client via useRequireAuth().
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/survey/:path*", "/schedules/:path*", "/mousefit/:path*"],
};
