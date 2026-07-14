import { NextRequest, NextResponse } from "next/server";
import { ensureInit } from "../../server/database";
import { trackEvent } from "../../server/models/event";

export const dynamic = "force-dynamic";

function extractGeoMeta(ip: string, req: NextRequest): Record<string, string> {
  const get = (h: string) => req.headers.get(h) || "";
  
  const country = get("cf-ipcountry") || get("x-vercel-ip-country");
  const city = get("cf-ipcity") || get("x-vercel-ip-city");
  const region = get("cf-ipregion") || get("x-vercel-ip-country-region");
  const latitude = get("cf-iplatitude") || get("x-vercel-ip-latitude");
  const longitude = get("cf-iplongitude") || get("x-vercel-ip-longitude");
  const timezone = get("cf-timezone") || get("x-vercel-ip-timezone") || "UTC";

  if (country) {
    return {
      country,
      city: city || "Unknown",
      region: region || "Unknown",
      latitude: latitude || "",
      longitude: longitude || "",
      timezone,
      forwardedFor: get("x-forwarded-for") || ip,
    };
  }

  let lookupIp = ip;
  if (ip.includes("::ffff:")) {
    lookupIp = ip.split("::ffff:")[1];
  }
  if (lookupIp === "127.0.0.1" || lookupIp === "::1") {
    return {
      country: "LOCAL",
      city: "Localhost",
      region: "Localhost",
      latitude: "",
      longitude: "",
      timezone,
      forwardedFor: get("x-forwarded-for") || ip,
    };
  }

  let lookup: any = null;
  try {
    const geoip = require("geoip-lite");
    lookup = geoip.lookup(lookupIp);
  } catch (err) {
    console.error("GeoIP lookup failed:", err);
  }

  return {
    country: lookup?.country || "Unknown",
    city: lookup?.city || "Unknown",
    region: lookup?.region || "Unknown",
    latitude: lookup?.ll?.[0] ? String(lookup.ll[0]) : "",
    longitude: lookup?.ll?.[1] ? String(lookup.ll[1]) : "",
    timezone: lookup?.timezone || timezone,
    forwardedFor: get("x-forwarded-for") || ip,
  };
}

function parseUserAgent(ua: string): Record<string, string> {
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  const os =
    /windows/i.test(ua) ? "Windows" :
    /mac os x/i.test(ua) ? "macOS" :
    /android/i.test(ua) ? "Android" :
    /iphone|ipad/i.test(ua) ? "iOS" :
    /linux/i.test(ua) ? "Linux" : "Unknown";
  const browser =
    /firefox\//i.test(ua) ? "Firefox" :
    /edg\//i.test(ua) ? "Edge" :
    /chrome\//i.test(ua) ? "Chrome" :
    /safari\//i.test(ua) ? "Safari" : "Unknown";

  return { device: mobile ? "mobile" : "desktop", os, browser };
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  await ensureInit();

  const { searchParams } = new URL(req.url);
  const encodedDest = searchParams.get("dest");
  const version = searchParams.get("v") || "default";
  const targetId = searchParams.get("id") || "dynamic";

  if (!encodedDest) {
    return NextResponse.json({ error: "Missing required query param: dest" }, { status: 400 });
  }

  let destination: string;
  try {
    destination = Buffer.from(encodedDest, "base64").toString("utf-8");
    new URL(destination);
  } catch {
    return NextResponse.json({ error: "Invalid base64 encoded destination URL" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
  const ua = req.headers.get("user-agent") || "";
  const geo = extractGeoMeta(ip, req);
  const device = parseUserAgent(ua);
  const processingMs = Date.now() - start;

  const queryParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  await trackEvent({
    type: "redirect",
    name: "dynamic_redirect",
    targetId,
    url: destination,
    referrer: req.headers.get("referer") || "",
    userAgent: ua,
    ip,
    version,
    metadata: {
      processingMs: String(processingMs),
      ...geo,
      ...device,
      ...queryParams,
    },
  });

  return NextResponse.redirect(destination, 302);
}
