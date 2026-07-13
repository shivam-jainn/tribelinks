import { NextRequest, NextResponse } from "next/server";
import { ensureInit } from "../../../server/database";
import { trackEvent } from "../../../server/models/event";

export const dynamic = "force-dynamic";

const PIXEL_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const PIXEL_HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  await ensureInit();

  const { slug = [] } = await context.params;
  if (slug.length === 0) {
    return NextResponse.json({ error: "Missing pixel ID" }, { status: 400 });
  }

  const pixelId = slug[0];
  const rawVersion = slug[1] || undefined;

  const { searchParams } = new URL(req.url);

  // Strip trailing .png extension from version or pixelId
  const version = rawVersion?.endsWith(".png")
    ? rawVersion.slice(0, -4)
    : rawVersion;
  const cleanPixelId = !version && pixelId.endsWith(".png")
    ? pixelId.slice(0, -4)
    : pixelId;

  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
  const queryParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  await trackEvent({
    type: "pixel",
    name: "pixel_open",
    targetId: cleanPixelId,
    url: req.url,
    referrer: req.headers.get("referer") || "",
    userAgent: req.headers.get("user-agent") || "",
    ip,
    version: version || searchParams.get("v") || "default",
    metadata: { ...queryParams },
  });

  return new Response(PIXEL_BUFFER, {
    status: 200,
    headers: PIXEL_HEADERS,
  });
}
