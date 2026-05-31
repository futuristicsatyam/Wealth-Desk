import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight edge middleware:
 *  - applies security headers + CSP to every response
 *  - performs a cheap auth-cookie redirect for /dashboard and /admin
 *
 * Authoritative auth + RBAC + ban checks live in lib/session.ts, which every
 * protected page and API route calls. This middleware is only a fast gate.
 */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token"
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtected) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "auth_required");
      loginUrl.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
