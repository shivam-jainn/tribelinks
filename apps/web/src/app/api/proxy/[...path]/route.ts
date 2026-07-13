import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Generic proxy handler: /api/proxy/[...path]
 * Reads the httpOnly session cookie server-side, adds it as Authorization
 * header, and forwards the request to the Fastify backend.
 */
async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("tribelinks_session");

  const { path } = await params;
  const backendPath = "/" + path.join("/");

  // Forward query string
  const url = new URL(req.url);
  const backendUrl = `${API_URL}${backendPath}${url.search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.value) {
    headers["Authorization"] = `Bearer ${session.value}`;
  }

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text().catch(() => undefined);
  }

  const res = await fetch(backendUrl, {
    method: req.method,
    headers,
    body,
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

export { handler as GET, handler as POST, handler as DELETE, handler as PUT, handler as PATCH };
