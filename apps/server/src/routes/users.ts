import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getUserByApiKey,
  getUserBySessionToken,
  createApiKey,
  listApiKeys,
  createUser,
  authenticateUser,
  createSession,
  deleteSessionToken,
} from "../models/user";
import { createContact, listContacts, deleteContact } from "../models/contact";
import { createShortLink } from "../models/short-link";
import { randomUUID } from "crypto";

// ─── Feature flags ────────────────────────────────────────────────────────────
const ENABLE_SIGNUP = process.env.ENABLE_SIGNUP === "true";

/**
 * Middleware-like helper to authenticate a request via Bearer token.
 * Automatically handles API Keys (ak_...) and Session Tokens (sess_...).
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    reply.status(401).send({ error: "Missing Authorization header (Bearer <token>)" });
    return null;
  }

  let user = null;
  if (token.startsWith("sess_")) {
    user = await getUserBySessionToken(token);
  } else {
    user = await getUserByApiKey(token);
  }

  if (!user) {
    reply.status(403).send({ error: "Invalid or expired session / API key" });
    return null;
  }

  return user;
}

export async function userRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/signup
   * Create a new user. Only available when ENABLE_SIGNUP=true.
   * Body: { name: string, email: string, password?: string }
   */
  fastify.post("/api/signup", async (request, reply) => {
    if (!ENABLE_SIGNUP) {
      return reply.status(403).send({ error: "Signups are currently disabled." });
    }

    const body = request.body as { name?: string; email?: string; password?: string };
    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return reply.status(400).send({ error: "Missing required fields: name, email, password" });
    }

    const { pgPool } = await import("../database");

    // Check email uniqueness
    const existing = await pgPool.query(
      "SELECT id FROM users WHERE email = $1",
      [body.email.trim()]
    );
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: "Email already in use" });
    }

    const user = await createUser(body.name.trim(), body.email.trim(), body.password);
    const sessionToken = await createSession(user.id);

    return reply.status(201).send({
      user,
      sessionToken,
    });
  });

  /**
   * POST /api/login
   * Authenticate email and password, return session token.
   * Body: { email: string, password?: string }
   */
  fastify.post("/api/login", async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    if (!body.email?.trim() || !body.password?.trim()) {
      return reply.status(400).send({ error: "Missing email or password" });
    }

    const user = await authenticateUser(body.email.trim(), body.password);
    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const sessionToken = await createSession(user.id);
    return reply.send({ user, sessionToken });
  });

  /**
   * POST /api/logout
   * Revoke current session token.
   */
  fastify.post("/api/logout", async (request, reply) => {
    const authHeader = request.headers["authorization"] ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (token && token.startsWith("sess_")) {
      await deleteSessionToken(token);
    }
    return reply.send({ success: true });
  });

  /**
   * GET /api/keys
   * List all API keys for the authenticated user.
   */
  fastify.get("/api/keys", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const keys = await listApiKeys(user.id);
    return keys.map((k) => ({
      key: k.key,
      label: k.label,
      createdAt: k.created_at,
    }));
  });

  /**
   * POST /api/keys
   * Generate a new API key for the authenticated user.
   * Body: { label?: string }
   */
  fastify.post("/api/keys", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const body = request.body as { label?: string };
    const key = await createApiKey(user.id, body.label);
    return reply.status(201).send({
      key: key.key,
      label: key.label,
      createdAt: key.created_at,
    });
  });

  /**
   * DELETE /api/keys/:key
   * Revoke an API key owned by the authenticated user.
   */
  fastify.delete("/api/keys/:key", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const { key } = request.params as { key: string };
    const { pgPool } = await import("../database");
    const result = await pgPool.query(
      "DELETE FROM api_keys WHERE key = $1 AND user_id = $2",
      [key, user.id]
    );
    if ((result.rowCount ?? 0) === 0) {
      return reply.status(404).send({ error: "Key not found or not owned by you" });
    }
    return { success: true, key };
  });

  /**
   * GET /api/contacts
   * List all contacts (persons of interest) for the authenticated user.
   */
  fastify.get("/api/contacts", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const contacts = await listContacts(user.id);
    const { getAnalyticsStore } = await import("../database");
    const report = await getAnalyticsStore().getAnalytics({ type: "redirect" });
    const clickedContactIds = new Set<string>();
    for (const event of report.events) {
      if (event.metadata && event.metadata.contactId) {
        clickedContactIds.add(event.metadata.contactId);
      }
    }
    return contacts.map(c => ({
      ...c,
      clicked: clickedContactIds.has(c.id)
    }));
  });

  /**
   * POST /api/contacts
   * Create a new contact.
   * Body: { name: string, email?: string, notes?: string }
   */
  fastify.post("/api/contacts", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;

    const body = request.body as { name?: string; email?: string; notes?: string };
    if (!body.name?.trim()) {
      return reply.status(400).send({ error: "Missing required field: name" });
    }

    const contact = await createContact(user.id, body.name.trim(), body.email, body.notes);
    return reply.status(201).send(contact);
  });

  /**
   * DELETE /api/contacts/:id
   * Delete a contact owned by the authenticated user.
   */
  fastify.delete("/api/contacts/:id", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    const deleted = await deleteContact(id, user.id);
    if (!deleted) {
      return reply.status(404).send({ error: "Contact not found or not owned by you" });
    }
    return { success: true, id };
  });

  /**
   * POST /api/shorten/bulk
   * Create multiple short links from one base URL, one per contact/person.
   */
  fastify.post("/api/shorten/bulk", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;

    const body = request.body as {
      url?: string;
      persons?: Array<{ name: string; email?: string }>;
      keyPrefix?: string;
    };

    if (!body.url) {
      return reply.status(400).send({ error: "Missing required field: url" });
    }
    if (!Array.isArray(body.persons) || body.persons.length === 0) {
      return reply.status(400).send({ error: "Missing required field: persons (non-empty array)" });
    }

    try {
      new URL(body.url);
    } catch {
      return reply.status(400).send({ error: "Invalid URL format" });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const prefix = body.keyPrefix?.trim() || "";
    const results: Array<{
      name: string;
      email?: string;
      key: string;
      shortUrl: string;
      contactId: string;
    }> = [];

    for (const person of body.persons) {
      if (!person.name?.trim()) continue;

      // Ensure contact exists
      const contact = await createContact(user.id, person.name.trim(), person.email);

      // Build key
      const slug = person.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const key = `${prefix}${slug}-${randomUUID().slice(0, 5)}`;

      const destination = `${body.url}${body.url.includes("?") ? "&" : "?"}ref=${encodeURIComponent(person.name.trim())}${person.email ? `&email=${encodeURIComponent(person.email)}` : ""}`;

      const link = await createShortLink(key, destination, user.id, contact.id);
      results.push({
        name: person.name.trim(),
        email: person.email,
        key: link.key,
        shortUrl: `${baseUrl}/r/${link.key}`,
        contactId: contact.id,
      });
    }

    return reply.status(201).send({ created: results.length, links: results });
  });

  /**
   * GET /api/me
   * Return current authenticated user info.
   */
  fastify.get("/api/me", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    };
  });
}

