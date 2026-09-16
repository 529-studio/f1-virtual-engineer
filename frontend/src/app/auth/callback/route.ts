import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Resolve the canonical origin for redirects. Behind some reverse-proxy
// setups Next sees a Host header of `0.0.0.0:3000` (the container's
// listen address) instead of the public domain — the user then gets
// bounced to `https://0.0.0.0:3000/?auth_error=…` after Google login,
// which is unreachable. Order of trust:
//   1. NEXT_PUBLIC_SITE_URL — explicit canonical override, set this in
//      prod compose to the public URL (e.g. https://f1.529studio.site).
//   2. X-Forwarded-Host + X-Forwarded-Proto — ONLY accepted when it matches
//      the hostname of NEXT_PUBLIC_SITE_URL (prevents open-redirect via
//      spoofed X-Forwarded-Host header).
//   3. request.url's origin — last resort; fine for local dev.
function resolveOrigin(request: Request): string {
  const override = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const canonicalOrigin = override?.replace(/\/$/, "");

  // If a canonical URL is configured, always use it — no header needed.
  if (canonicalOrigin) return canonicalOrigin;

  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  // Security: only trust X-Forwarded-Host when it resolves to the same
  // hostname as request.url, preventing host-header injection open redirects.
  if (host) {
    const requestHostname = new URL(request.url).hostname;
    if (host.split(":")[0] === requestHostname) {
      return `${proto}://${host}`;
    }
  }

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");

  const origin = resolveOrigin(request);

  // Only honour same-origin redirects to avoid open-redirect.
  const redirectPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/mission-control";

  if (!code) {
    return NextResponse.redirect(new URL(redirectPath, origin));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL(redirectPath, origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errorUrl = new URL("/", origin);
    errorUrl.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(errorUrl);
  }
  return NextResponse.redirect(new URL(redirectPath, origin));
}
