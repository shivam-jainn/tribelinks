import { config } from "@tracker/config";

const API_URL = config.public.apiUrl;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShortLink {
  key: string;
  url: string;
  shortUrl: string;
  createdAt: string;
  contact_id?: string | null;
  rules?: any | null;
  type?: string;
}

export interface ApiKey {
  key: string;
  label: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  clicked?: boolean;
}

export interface AnalyticsReport {
  totalEvents: number;
  uniqueSessions: number;
  averageDurationMs: number;
  events: AnalyticsEvent[];
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  name: string;
  targetId: string;
  sessionId: string;
  timestamp: string;
  duration: number;
  url: string;
  referrer: string;
  userAgent: string;
  ip: string;
  version: string;
  metadata: Record<string, string>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

export interface BulkLinkResult {
  created: number;
  links: Array<{
    name: string;
    email?: string;
    key: string;
    shortUrl: string;
    contactId: string;
  }>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(name: string, email: string, password?: string) {
  return apiFetch<{ user: UserProfile; sessionToken: string }>("/api/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/me");
}

// ─── Short Links ──────────────────────────────────────────────────────────────

export async function listLinks(): Promise<ShortLink[]> {
  return apiFetch<ShortLink[]>("/api/shorten");
}

export async function createLink(
  url: string,
  key?: string,
  contactId?: string,
  campaignId?: string,
  rules?: any,
  type?: string,
): Promise<ShortLink> {
  return apiFetch<ShortLink>("/api/shorten", {
    method: "POST",
    body: JSON.stringify({ url, key, contactId, campaignId, rules, type }),
  });
}

export async function deleteLink(key: string): Promise<void> {
  await apiFetch<void>(`/api/shorten/${key}`, { method: "DELETE" });
}

export async function createBulkLinks(
  url: string,
  persons: Array<{ name: string; email?: string }>,
  keyPrefix?: string,
): Promise<BulkLinkResult> {
  return apiFetch<BulkLinkResult>("/api/shorten/bulk", {
    method: "POST",
    body: JSON.stringify({ url, persons, keyPrefix }),
  });
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function listApiKeys(): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>("/api/keys");
}

export async function createApiKey(label?: string): Promise<ApiKey> {
  return apiFetch<ApiKey>("/api/keys", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

export async function revokeApiKey(key: string): Promise<void> {
  await apiFetch<void>(`/api/keys/${key}`, { method: "DELETE" });
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function listContacts(): Promise<Contact[]> {
  return apiFetch<Contact[]>("/api/contacts");
}

export async function createContact(
  name: string,
  email?: string,
  notes?: string,
): Promise<Contact> {
  return apiFetch<Contact>("/api/contacts", {
    method: "POST",
    body: JSON.stringify({ name, email, notes }),
  });
}

export async function deleteContact(id: string): Promise<void> {
  await apiFetch<void>(`/api/contacts/${id}`, { method: "DELETE" });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(filters?: {
  type?: string;
  targetId?: string;
  version?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsReport> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.targetId) params.set("targetId", filters.targetId);
  if (filters?.version) params.set("version", filters.version);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const qs = params.toString();
  return apiFetch<AnalyticsReport>(`/api/analytics${qs ? `?${qs}` : ""}`);
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  created_at: string;
  contact_count?: number;
  clicked_count?: number;
}

export interface CampaignContact {
  campaign_contact_id: string;
  tracking_status: string;
  associated_at: string;
  global_contact_id: string | null;
  name: string;
  email: string | null;
  notes: string | null;
}

export interface CampaignDetails extends Campaign {
  contacts: CampaignContact[];
  links: ShortLink[];
}

export async function listCampaigns(): Promise<Campaign[]> {
  return apiFetch<Campaign[]>("/api/campaigns");
}

export async function createCampaign(
  name: string,
  description?: string,
  type?: string,
): Promise<Campaign> {
  return apiFetch<Campaign>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ name, description, type }),
  });
}

export async function getCampaign(id: string): Promise<CampaignDetails> {
  return apiFetch<CampaignDetails>(`/api/campaigns/${id}`);
}

export async function addContactToCampaign(
  id: string,
  contactData: {
    contactId?: string;
    name?: string;
    email?: string;
    notes?: string;
  },
): Promise<any> {
  return apiFetch<any>(`/api/campaigns/${id}/contacts`, {
    method: "POST",
    body: JSON.stringify(contactData),
  });
}

export async function removeContactFromCampaign(
  id: string,
  campaignContactId: string,
): Promise<void> {
  await apiFetch<void>(`/api/campaigns/${id}/contacts/${campaignContactId}`, {
    method: "DELETE",
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiFetch<void>(`/api/campaigns/${id}`, { method: "DELETE" });
}
