import { NextRequest, NextResponse } from "next/server";
import { ensureInit, pgPool } from "../../../server/database";
import { getShortLink } from "../../../server/models/short-link";
import { trackEvent } from "../../../server/models/event";
import logger from "../../../server/logger";
import { config } from "@tracker/config";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

interface ABRule {
  url: string;
  weight: number;
}

function resolveAB(abRules: ABRule[]): string | null {
  if (!abRules || abRules.length === 0) return null;
  const totalWeight = abRules.reduce((acc, r) => acc + (r.weight || 0), 0);
  if (totalWeight <= 0) return abRules[0].url;

  let r = Math.random() * totalWeight;
  for (const rule of abRules) {
    if (r < (rule.weight || 0)) {
      return rule.url;
    }
    r -= (rule.weight || 0);
  }
  return abRules[abRules.length - 1].url;
}

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const start = Date.now();
  const { key } = await context.params;
  logger.info(`[REDIRECT] Hit key: ${key}`);

  await ensureInit();

  const { searchParams } = new URL(req.url);
  const version = searchParams.get("v") || "default";

  const link = await getShortLink(key);
  if (!link) {
    return NextResponse.json({ error: `Short link '${key}' not found` }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
  const ua = req.headers.get("user-agent") || "";
  const geo = extractGeoMeta(ip, req);
  const device = parseUserAgent(ua);

  if (link.type === "pixel") {
    if (link.contact_id && link.campaign_id) {
      await pgPool.query(
        `UPDATE campaign_contacts 
         SET status = 'clicked' 
         WHERE campaign_id = $1 AND contact_id = $2`,
        [link.campaign_id, link.contact_id]
      );
      logger.success(`[REDIRECT-PIXEL] Contact ${link.contact_id} marked as clicked in campaign ${link.campaign_id}`);
    }

    await trackEvent({
      type: "pixel",
      name: "email_pixel_open",
      targetId: key,
      url: req.url,
      referrer: req.headers.get("referer") || "",
      userAgent: ua,
      ip,
      version: "default",
      metadata: {
        originalKey: key,
        contactId: link.contact_id || "",
        campaignId: link.campaign_id || "",
        ...geo,
        ...device,
      },
    });

    const PIXEL_BUFFER = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64"
    );
    return new Response(new Uint8Array(PIXEL_BUFFER), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }

  if (link.type === "qr" && searchParams.get("qr") === "true") {
    try {
      const shortUrl = `${config.server.baseUrl}/r/${key}`;
      const qrBuffer = await QRCode.toBuffer(shortUrl, {
        type: "png",
        margin: 2,
        width: 400,
      });
      logger.success(`[REDIRECT-QR] Generated QR code image for key ${key}`);
      return new Response(new Uint8Array(qrBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    } catch (err: any) {
      logger.error(`[REDIRECT-QR] Failed to generate QR code image:`, err);
    }
  }

  // Resolve target URL according to link rules
  let destination = link.url;
  let selectedRuleType = "none";

  if (link.rules) {
    try {
      const rules = typeof link.rules === "string" ? JSON.parse(link.rules) : link.rules;

      // 1. Geo-routing check
      if (rules.geo && geo.country && rules.geo[geo.country]) {
        destination = rules.geo[geo.country];
        selectedRuleType = "geo";
      }
      // 2. Device/OS-routing check
      else if (rules.device) {
        const deviceTarget = rules.device[device.os.toLowerCase()] || rules.device[device.device];
        if (deviceTarget) {
          destination = deviceTarget;
          selectedRuleType = "device";
        }
      }
      // 3. A/B Testing check
      else if (rules.ab && Array.isArray(rules.ab) && rules.ab.length > 0) {
        const abUrl = resolveAB(rules.ab);
        if (abUrl) {
          destination = abUrl;
          selectedRuleType = "ab";
        }
      }
    } catch (err) {
      console.error("Failed to resolve link rules:", err);
    }
  }

  const finalUrl =
    version !== "default"
      ? `${destination}${destination.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`
      : destination;

  const processingMs = Date.now() - start;

  // Check if this click came from a campaign contact, so we can mark their status as 'clicked'
  if (link.contact_id && link.campaign_id) {
    await pgPool.query(
      `UPDATE campaign_contacts 
       SET status = 'clicked' 
       WHERE campaign_id = $1 AND contact_id = $2`,
      [link.campaign_id, link.contact_id]
    );
    logger.info(`[REDIRECT] Campaign contact linked: Campaign=${link.campaign_id}, Contact=${link.contact_id} marked as clicked`);
  }

  const queryParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  await trackEvent({
    type: "redirect",
    name: "link_redirect",
    targetId: key,
    url: finalUrl,
    referrer: req.headers.get("referer") || "",
    userAgent: ua,
    ip,
    version,
    metadata: {
      originalKey: key,
      contactId: link.contact_id || "",
      campaignId: link.campaign_id || "",
      ruleApplied: selectedRuleType,
      processingMs: String(processingMs),
      ...geo,
      ...device,
      ...queryParams,
    },
  });

  logger.success(`[REDIRECT] Redirection success: Key '${key}' -> ${finalUrl} (Rule: ${selectedRuleType}, ${processingMs}ms)`);
  return NextResponse.redirect(finalUrl, 302);
}
