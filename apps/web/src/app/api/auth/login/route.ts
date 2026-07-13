import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * POST /api/auth/login
 * Accepts { email, password } or { sessionToken } in body.
 * Validates against backend, then sets an httpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password, sessionToken } = body;

  let token = sessionToken;
  let user = null;

  if (token) {
    // Validate session token by checking user profile
    const res = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);

    if (!res || !res.ok) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }
    user = await res.json();
  } else {
    // Standard email/password login
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({ error: "Invalid credentials" }));
      return NextResponse.json({ error: err.error || "Invalid email or password" }, { status: 401 });
    }

    const loginData = await res.json();
    token = loginData.sessionToken;
    user = loginData.user;
  }

  // Set httpOnly session cookie — contains the validated session token
  const response = NextResponse.json({ ok: true, user });
  response.cookies.set("tribelinks_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

/**
 * DELETE /api/auth/login → logout, clears session cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("tribelinks_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

