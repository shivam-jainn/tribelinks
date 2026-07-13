import { NextRequest, NextResponse } from "next/server";
import { ensureInit, pgPool, getAnalyticsStore } from "../../../server/database";
import logger from "../../../server/logger";

export const dynamic = "force-dynamic";
import {
  getUserByApiKey,
  getUserBySessionToken,
  createApiKey,
  listApiKeys,
  createUser,
  authenticateUser,
  createSession,
  deleteSessionToken,
  User,
} from "../../../server/models/user";
import { createContact, listContacts, deleteContact } from "../../../server/models/contact";
import {
  createShortLink,
  listShortLinks,
  deleteShortLink,
  updateShortLink,
} from "../../../server/models/short-link";
import { trackEvent } from "../../../server/models/event";
import { config } from "@tracker/config";
import { randomUUID } from "crypto";
import { auth } from "../../../lib/auth";

const ENABLE_SIGNUP = config.server.enableSignup;
const ENABLE_AUTH = config.server.enableAuth;

// Helper to authenticate request
async function getAuthenticatedUser(req: NextRequest): Promise<User | null> {
  await ensureInit();

  if (!ENABLE_AUTH) {
    try {
      const result = await pgPool.query<User>("SELECT id, name, email, created_at FROM users LIMIT 1");
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}
    return {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Default User",
      email: "admin@example.com",
      created_at: new Date(),
    };
  }

  // 1. Try Better Auth verification first (handles cookies, sessions)
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (session?.user) {
      return {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        created_at: new Date(session.user.createdAt),
      };
    }
  } catch (e) {
    console.error("Better Auth session validation failed:", e);
  }

  // 2. Fall back to custom token / API key lookup
  const authHeader = req.headers.get("authorization") || "";
  let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    const sessionCookie = req.cookies.get("better-auth.session_token") || req.cookies.get("__Secure-better-auth.session_token");
    token = sessionCookie?.value || null;
  }

  if (!token) return null;

  if (token.startsWith("sess_") || !token.startsWith("ak_")) {
    return getUserBySessionToken(token);
  } else {
    return getUserByApiKey(token);
  }
}

// Catch-all request handler
async function handleInternal(
  req: NextRequest,
  path: string[],
  method: string
) {
  await ensureInit();

  try {
    // ─── POST /api/signup ─────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "signup" && method === "POST") {
      if (!ENABLE_SIGNUP) {
        return NextResponse.json({ error: "Signups are currently disabled." }, { status: 403 });
      }
      const body = await req.json().catch(() => ({}));
      if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
        return NextResponse.json({ error: "Missing required fields: name, email, password" }, { status: 400 });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email.trim())) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
      if (body.password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
      }

      // Check email uniqueness
      const existing = await pgPool.query("SELECT id FROM users WHERE email = $1", [body.email.trim()]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }

      const user = await createUser(body.name.trim(), body.email.trim(), body.password);
      const sessionToken = await createSession(user.id);

      return NextResponse.json({ user, sessionToken }, { status: 201 });
    }

    // ─── POST /api/login ──────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "login" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!body.email?.trim() || !body.password?.trim()) {
        return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
      }
      const user = await authenticateUser(body.email.trim(), body.password);
      if (!user) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      const sessionToken = await createSession(user.id);
      return NextResponse.json({ user, sessionToken });
    }

    // ─── POST /api/logout ─────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "logout" && method === "POST") {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      if (token && token.startsWith("sess_")) {
        await deleteSessionToken(token);
      } else {
        const sessionCookie = req.cookies.get("better-auth.session_token") || req.cookies.get("__Secure-better-auth.session_token");
        if (sessionCookie?.value) {
          await deleteSessionToken(sessionCookie.value);
        }
      }
      return NextResponse.json({ success: true });
    }

    // ─── POST /api/event ──────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "event" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
      const event = await trackEvent({
        id: body.id,
        type: body.type || "custom",
        name: body.name || "event",
        targetId: body.targetId || "unknown",
        sessionId: body.sessionId,
        timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
        duration: body.duration || 0,
        url: body.url || "",
        referrer: body.referrer || "",
        userAgent: body.userAgent || req.headers.get("user-agent") || "",
        ip,
        version: body.version || "default",
        metadata: body.metadata || {},
      });
      return NextResponse.json({ success: true, eventId: event.id }, { status: 202 });
    }

    // ─── POST /api/events ─────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "events" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const events = body.events || [];
      const results = [];
      const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
      for (const item of events) {
        try {
          const event = await trackEvent({
            id: item.id,
            type: item.type || "custom",
            name: item.name || "event",
            targetId: item.targetId || "unknown",
            sessionId: item.sessionId,
            timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
            duration: item.duration || 0,
            url: item.url || "",
            referrer: item.referrer || "",
            userAgent: item.userAgent || req.headers.get("user-agent") || "",
            ip,
            version: item.version || "default",
            metadata: item.metadata || {},
          });
          results.push(event.id);
        } catch (err) {
          console.error("Error ingesting batch event item", err);
        }
      }
      return NextResponse.json({ success: true, count: results.length }, { status: 202 });
    }

    // Require Auth for all endpoints below
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── GET /api/analytics ───────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "analytics" && method === "GET") {
      const { searchParams } = new URL(req.url);
      
      const userLinks = await listShortLinks(user.id);
      const userKeys = userLinks.map((l) => l.key);
      const requestedTargetId = searchParams.get("targetId");

      if (requestedTargetId && !userKeys.includes(requestedTargetId)) {
        return NextResponse.json({ totalEvents: 0, uniqueSessions: 0, averageDurationMs: 0, events: [] });
      }
      
      if (userKeys.length === 0) {
        return NextResponse.json({ totalEvents: 0, uniqueSessions: 0, averageDurationMs: 0, events: [] });
      }

      const query = {
        type: searchParams.get("type") || undefined,
        targetId: requestedTargetId || undefined,
        targetIds: requestedTargetId ? undefined : userKeys,
        version: searchParams.get("version") || undefined,
        startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
        endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
      };
      const report = await getAnalyticsStore().getAnalytics(query);
      return NextResponse.json(report);
    }

    // ─── GET /api/me ──────────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "me" && method === "GET") {
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      });
    }

    // ─── Shorten Routes ──────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "shorten") {
      if (method === "GET") {
        const links = await listShortLinks(user.id);
        return NextResponse.json(
          links.map((l) => ({
            key: l.key,
            url: l.url,
            shortUrl: `${config.server.baseUrl}/r/${l.key}`,
            createdAt: l.created_at,
            contact_id: l.contact_id,
          }))
        );
      }
      if (method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (!body.url) {
          return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
        }
        const key = body.key?.trim() || randomUUID().slice(0, 8);
        try {
          new URL(body.url);
        } catch {
          return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }
        try {
          const link = await createShortLink(key, body.url, user.id, body.contactId, body.campaignId, body.rules, body.type);
          return NextResponse.json({
            key: link.key,
            url: link.url,
            contactId: link.contact_id,
            campaignId: link.campaign_id,
            rules: link.rules,
            type: link.type,
            shortUrl: `${config.server.baseUrl}/r/${link.key}`,
            createdAt: link.created_at,
          }, { status: 201 });
        } catch (err: any) {
          if (err.code === "23505") {
            return NextResponse.json({ error: `Key '${key}' is already taken` }, { status: 409 });
          }
          throw err;
        }
      }
    }

    // ─── PUT / DELETE /api/shorten/:key ──────────────────────────────────────────
    if (path.length === 2 && path[0] === "shorten") {
      const key = path[1];
      if (method === "PUT") {
        const body = await req.json().catch(() => ({}));
        if (body.url) {
          try {
            new URL(body.url);
          } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
          }
        }
        const updated = await updateShortLink(key, user.id, body);
        if (!updated) {
          return NextResponse.json({ error: "Short link not found or not owned by you" }, { status: 404 });
        }
        return NextResponse.json({
          key: updated.key,
          url: updated.url,
          contactId: updated.contact_id,
          campaignId: updated.campaign_id,
          rules: updated.rules,
          shortUrl: `${config.server.baseUrl}/r/${updated.key}`,
          createdAt: updated.created_at,
        });
      }
      if (method === "DELETE") {
        const deleted = await deleteShortLink(key, user.id);
        if (!deleted) {
          return NextResponse.json({ error: "Short link not found or not owned by you" }, { status: 404 });
        }
        return NextResponse.json({ success: true, key });
      }
    }

    // ─── POST /api/shorten/bulk ──────────────────────────────────────────────────
    if (path.length === 2 && path[0] === "shorten" && path[1] === "bulk" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!body.url) {
        return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
      }
      if (!Array.isArray(body.persons) || body.persons.length === 0) {
        return NextResponse.json({ error: "Missing required field: persons (non-empty array)" }, { status: 400 });
      }
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }

      const baseUrl = config.server.baseUrl;
      const prefix = body.keyPrefix?.trim() || "";
      const results = [];

      for (const person of body.persons) {
        if (!person.name?.trim()) continue;
        const contact = await createContact(user.id, person.name.trim(), person.email);
        const slug = person.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const key = `${prefix}${slug}-${randomUUID().slice(0, 5)}`;
        const destination = `${body.url}${body.url.includes("?") ? "&" : "?"}ref=${encodeURIComponent(person.name.trim())}${person.email ? `&email=${encodeURIComponent(person.email)}` : ""}`;
        const link = await createShortLink(key, destination, user.id, contact.id, undefined, undefined, body.type);
        results.push({
          name: person.name.trim(),
          email: person.email,
          key: link.key,
          shortUrl: `${baseUrl}/r/${link.key}`,
          contactId: contact.id,
          type: link.type,
        });
      }
      return NextResponse.json({ created: results.length, links: results }, { status: 201 });
    }

    // ─── API Keys Routes ──────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "keys") {
      if (method === "GET") {
        const keys = await listApiKeys(user.id);
        return NextResponse.json(
          keys.map((k) => ({
            key: k.key,
            label: k.label,
            createdAt: k.created_at,
          }))
        );
      }
      if (method === "POST") {
        const body = await req.json().catch(() => ({}));
        const key = await createApiKey(user.id, body.label);
        return NextResponse.json({
          key: key.key,
          label: key.label,
          createdAt: key.created_at,
        }, { status: 201 });
      }
    }

    if (path.length === 2 && path[0] === "keys" && method === "DELETE") {
      const key = path[1];
      const result = await pgPool.query("DELETE FROM api_keys WHERE key = $1 AND user_id = $2", [key, user.id]);
      if ((result.rowCount ?? 0) === 0) {
        return NextResponse.json({ error: "Key not found or not owned by you" }, { status: 404 });
      }
      return NextResponse.json({ success: true, key });
    }

    // ─── Contacts Routes ──────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "contacts") {
      if (method === "GET") {
        const contacts = await listContacts(user.id);
        const report = await getAnalyticsStore().getAnalytics({ type: "redirect" });
        const clickedContactIds = new Set<string>();
        for (const event of report.events) {
          if (event.metadata && event.metadata.contactId) {
            clickedContactIds.add(event.metadata.contactId);
          }
        }
        return NextResponse.json(
          contacts.map((c) => ({
            ...c,
            clicked: clickedContactIds.has(c.id),
          }))
        );
      }
      if (method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (!body.name?.trim()) {
          return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
        }
        const contact = await createContact(user.id, body.name.trim(), body.email, body.notes);
        return NextResponse.json(contact, { status: 201 });
      }
    }

    if (path.length === 2 && path[0] === "contacts" && method === "DELETE") {
      const id = path[1];
      const deleted = await deleteContact(id, user.id);
      if (!deleted) {
        return NextResponse.json({ error: "Contact not found or not owned by you" }, { status: 404 });
      }
      return NextResponse.json({ success: true, id });
    }

    // ─── Campaigns Routes ─────────────────────────────────────────────────────────
    if (path.length === 1 && path[0] === "campaigns") {
      if (method === "GET") {
        const result = await pgPool.query(
          `SELECT 
            c.*,
            (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id) as contact_count,
            (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id AND cc.status = 'clicked') as clicked_count
          FROM campaigns c
          WHERE c.user_id = $1
          ORDER BY c.created_at DESC`,
          [user.id]
        );
        return NextResponse.json(result.rows);
      }
      if (method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (!body.name?.trim()) {
          return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
        }
        const result = await pgPool.query(
          `INSERT INTO campaigns (user_id, name, description, type, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING *`,
          [user.id, body.name.trim(), body.description?.trim() || null, body.type?.trim() || "link"]
        );
        return NextResponse.json(result.rows[0], { status: 201 });
      }
    }

    if (path.length === 2 && path[0] === "campaigns") {
      const id = path[1];
      if (method === "GET") {
        const campaignRes = await pgPool.query("SELECT * FROM campaigns WHERE id = $1 AND user_id = $2", [id, user.id]);
        if (campaignRes.rows.length === 0) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }
        const campaign = campaignRes.rows[0];
        const contactsRes = await pgPool.query(
          `SELECT 
            cc.id as campaign_contact_id,
            cc.status as tracking_status,
            cc.created_at as associated_at,
            c.id as global_contact_id,
            COALESCE(c.name, cc.custom_name) as name,
            COALESCE(c.email, cc.custom_email) as email,
            COALESCE(c.notes, cc.custom_notes) as notes
          FROM campaign_contacts cc
          LEFT JOIN contacts c ON cc.contact_id = c.id
          WHERE cc.campaign_id = $1
          ORDER BY cc.created_at DESC`,
          [id]
        );
        const linksRes = await pgPool.query(
          `SELECT key, url, contact_id, rules, type, created_at FROM short_links WHERE campaign_id = $1`,
          [id]
        );
        return NextResponse.json({
          ...campaign,
          contacts: contactsRes.rows,
          links: linksRes.rows,
        });
      }
      if (method === "DELETE") {
        const deleteRes = await pgPool.query("DELETE FROM campaigns WHERE id = $1 AND user_id = $2", [id, user.id]);
        if ((deleteRes.rowCount ?? 0) === 0) {
          return NextResponse.json({ error: "Campaign not found or not owned by you" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }
    }

    if (path.length === 3 && path[0] === "campaigns" && path[2] === "contacts") {
      const id = path[1];
      if (method === "POST") {
        // Verify campaign ownership
        const campaignRes = await pgPool.query("SELECT id FROM campaigns WHERE id = $1 AND user_id = $2", [id, user.id]);
        if (campaignRes.rows.length === 0) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }
        const body = await req.json().catch(() => ({}));
        let result;
        if (body.contactId) {
          const contactCheck = await pgPool.query("SELECT id FROM contacts WHERE id = $1 AND user_id = $2", [body.contactId, user.id]);
          if (contactCheck.rows.length === 0) {
            return NextResponse.json({ error: "Invalid global contact ID" }, { status: 400 });
          }
          const existing = await pgPool.query("SELECT id FROM campaign_contacts WHERE campaign_id = $1 AND contact_id = $2", [id, body.contactId]);
          if (existing.rows.length > 0) {
            return NextResponse.json({ error: "Contact already added to campaign" }, { status: 409 });
          }
          result = await pgPool.query(
            "INSERT INTO campaign_contacts (campaign_id, contact_id, status) VALUES ($1, $2, 'pending') RETURNING *",
            [id, body.contactId]
          );
        } else {
          if (!body.name?.trim()) {
            return NextResponse.json({ error: "Missing required contact name" }, { status: 400 });
          }
          result = await pgPool.query(
            "INSERT INTO campaign_contacts (campaign_id, custom_name, custom_email, custom_notes, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
            [id, body.name.trim(), body.email?.trim() || null, body.notes?.trim() || null]
          );
        }
        return NextResponse.json(result.rows[0], { status: 201 });
      }
    }

    if (path.length === 5 && path[0] === "campaigns" && path[2] === "contacts") {
      const id = path[1];
      const campaignContactId = path[4];
      if (method === "DELETE") {
        const campaignRes = await pgPool.query("SELECT id FROM campaigns WHERE id = $1 AND user_id = $2", [id, user.id]);
        if (campaignRes.rows.length === 0) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }
        const deleteRes = await pgPool.query("DELETE FROM campaign_contacts WHERE campaign_id = $1 AND id = $2", [id, campaignContactId]);
        if ((deleteRes.rowCount ?? 0) === 0) {
          return NextResponse.json({ error: "Campaign contact relation not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  } catch (err: any) {
    throw err;
  }
}

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const start = Date.now();
  let { path = [] } = await context.params;
  if (path[0] === "api") {
    path = path.slice(1);
  }
  const method = req.method;
  logger.info(`[API] ${method} /api/${path.join("/")}`);

  try {
    const res = await handleInternal(req, path, method);
    const duration = Date.now() - start;
    logger.success(`[API] ${res.status} for ${method} /api/${path.join("/")} (${duration}ms)`);
    return res;
  } catch (err: any) {
    const duration = Date.now() - start;
    logger.error(`[API] 500 Error for ${method} /api/${path.join("/")} (${duration}ms): ${err.message || err}`, err.stack);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
