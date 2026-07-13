import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { config as trackerConfig } from "@tracker/config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const enableAuth = trackerConfig.public.enableAuth;

  if (!enableAuth) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get("better-auth.session_token") || request.cookies.get("__Secure-better-auth.session_token");
    if (!session?.value) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Already logged in → redirect away from auth pages
  if (pathname.startsWith("/auth")) {
    const session = request.cookies.get("better-auth.session_token") || request.cookies.get("__Secure-better-auth.session_token");
    if (session?.value) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
