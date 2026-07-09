import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight edge middleware:
 *  - issues a per-request CSP nonce and applies a strict, nonce-based CSP
 *  - applies the remaining security headers to every response
 *  - performs a cheap auth-cookie redirect for /dashboard and /admin
 *
 * Authoritative auth + RBAC + ban checks live in lib/session.ts, which every
 * protected page and API route calls. This middleware is only a fast gate.
 */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token"
];

const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Production CSP: `script-src` uses a per-request nonce + 'strict-dynamic', so
 * only scripts carrying the nonce (Next's own scripts + this app's bundle) and
 * the scripts they programmatically load (e.g. Razorpay checkout.js, injected by
 * the trusted React bundle) execute - no 'unsafe-inline'. Modern browsers ignore
 * the trailing host source under 'strict-dynamic'; it is a fallback for older ones.
 *
 * Development CSP: Next's dev server (Fast Refresh / HMR) relies on inline
 * scripts, eval and a websocket, which a nonce/'strict-dynamic' policy blocks -
 * so dev relaxes script-src to 'unsafe-inline' 'unsafe-eval' (no nonce token, so
 * the browser actually honours 'unsafe-inline') and allows the HMR websocket.
 */
function buildCsp(nonce: string): string {
  const scriptSrc = IS_DEV
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com`;

  const connectSrc = IS_DEV
    ? "connect-src 'self' ws: wss: https://api.razorpay.com https://lumberjack.razorpay.com"
    : "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com";

  return [
    "default-src 'self'",
    // Scoped instead of a blanket `https:` wildcard. Razorpay hosts kept for
    // any checkout branding rendered outside its iframe.
    "img-src 'self' data: https://*.razorpay.com",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    connectSrc,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Auto-upgrade http subresources to https (defends first-visit/mixed content).
    // PRODUCTION ONLY — in dev the site is served over http://localhost, so this
    // would upgrade the CSS/JS asset requests to https and break local loading.
    ...(IS_DEV ? [] : ["upgrade-insecure-requests"])
  ].join("; ");
}

/** Edge-safe (Web Crypto) base64 nonce. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtected) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "auth_required");
      loginUrl.searchParams.set("next", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
    }
  }

  // Forward the nonce + CSP on the request so Next.js stamps the nonce onto the
  // framework's own inline scripts during rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, csp);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
