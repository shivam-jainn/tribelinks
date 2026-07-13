import { NextRequest, NextResponse } from "next/server";

/**
 * Generic proxy handler: /api/proxy/[...path]
 * Forwards requests to the local Next.js API endpoints.
 */
async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(req.url);
  
  // Forward to our local Next.js api routes
  const localUrl = `${url.origin}/api/${path.join("/")}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, name) => {
    headers.set(name, value);
  });

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text().catch(() => undefined);
  }

  const res = await fetch(localUrl, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  }).catch((err) => {
    console.error("Local API proxy failed:", err);
    return null;
  });

  if (!res) {
    return NextResponse.json({ error: "Local API unreachable" }, { status: 502 });
  }

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

export { handler as GET, handler as POST, handler as DELETE, handler as PUT, handler as PATCH };
