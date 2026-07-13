import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get("tribelinks_session");
    if (!session?.value) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Already logged in → redirect away from auth pages
  if (pathname.startsWith("/auth")) {
    const session = request.cookies.get("tribelinks_session");
    if (session?.value) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
