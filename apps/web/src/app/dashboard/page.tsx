"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ActionComposer, ActionConfig } from "@/components/action-composer";
import { listLinks, getAnalytics, createLink, createBulkLinks, createContact, createApiKey, ShortLink, AnalyticsReport, AnalyticsEvent } from "@/lib/api";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  TrendingUp,
  Link2,
  MousePointerClick,
  Users,
  Calendar,
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  Compass,
  ArrowUpRight,
  Info,
  Clock,
  Zap,
  RotateCw,
  Check,
  X
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// ─── Action Composer config ───────────────────────────────────────────────────
const ACTIONS: ActionConfig[] = [
  {
    id: "shorten",
    label: "Shorten a URL",
    sentence: "Shorten [url] with key [key]",
    pills: [
      { key: "url", placeholder: "https://...", type: "text" },
      { key: "key", placeholder: "custom-key (optional)", type: "text", optional: true },
    ],
  },
  {
    id: "bulk",
    label: "Bulk create tracking links",
    sentence: "Create links for [url] tracking [persons]",
    pills: [
      { key: "url", placeholder: "https://...", type: "text" },
      { key: "persons", placeholder: "Alice, Bob, charlie@co.com", type: "text" },
    ],
  },
  {
    id: "contact",
    label: "Create a Contact",
    sentence: "Add contact [name] email [email] notes [notes]",
    pills: [
      { key: "name", placeholder: "Contact Name", type: "text" },
      { key: "email", placeholder: "email (optional)", type: "text", optional: true },
      { key: "notes", placeholder: "notes (optional)", type: "text", optional: true },
    ],
  },
  {
    id: "apikey",
    label: "Generate API Key",
    sentence: "Generate API key labeled [label]",
    pills: [
      { key: "label", placeholder: "label (optional)", type: "text", optional: true },
    ],
  },
  {
    id: "analytics",
    label: "Filter analytics",
    sentence: "Show analytics for [targetId] type [type]",
    pills: [
      { key: "targetId", placeholder: "link key or *", type: "text", optional: true },
      { key: "type", placeholder: "redirect / pixel / custom", type: "select", options: ["redirect", "pixel", "custom", "pageview"], optional: true },
    ],
  },
  {
    id: "reset_analytics",
    label: "Reset Analytics Filters",
    sentence: "Reset all analytics filters",
    pills: [],
  },
];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  colorClass
}: {
  label: string;
  value: string | number;
  icon: any;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity ${colorClass || "from-violet-500 to-indigo-500"}`} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{label}</span>
        <Icon className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
      <div className="text-3xl font-black text-white mt-3 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1 font-medium">{sub}</div>}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 shadow-2xl backdrop-blur-2xl">
      <div className="font-semibold text-white mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || "#8b5cf6" }} />
          <span>{p.name}: <span className="font-bold text-white">{p.value}</span></span>
        </div>
      ))}
    </div>
  );
}

// ─── Browser/Device Helper ────────────────────────────────────────────────────
function getBrowserIcon(ua: string) {
  const lowercase = ua.toLowerCase();
  if (lowercase.includes("chrome") || lowercase.includes("crios")) return "Chrome";
  if (lowercase.includes("safari") && !lowercase.includes("chrome")) return "Safari";
  if (lowercase.includes("firefox")) return "Firefox";
  if (lowercase.includes("edge")) return "Edge";
  return "Browser";
}

function getDeviceIcon(ua: string) {
  const lowercase = ua.toLowerCase();
  if (lowercase.includes("ipad")) return Tablet;
  if (lowercase.includes("mobile") || lowercase.includes("iphone") || lowercase.includes("android")) return Smartphone;
  return Laptop;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState<{ targetId?: string; type?: string }>({});
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<{
    type: "shorten" | "bulk" | "contact" | "apikey" | "analytics" | "reset_analytics";
    data: any;
  } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Compute startDate based on timeframe
  const computedFilters = useMemo(() => {
    const filters: { targetId?: string; type?: string; startDate?: string } = { ...analyticsFilter };
    if (timeframe !== "all") {
      const start = new Date();
      if (timeframe === "24h") {
        start.setHours(start.getHours() - 24);
      } else if (timeframe === "7d") {
        start.setDate(start.getDate() - 7);
      } else if (timeframe === "30d") {
        start.setDate(start.getDate() - 30);
      }
      filters.startDate = start.toISOString();
    }
    return filters;
  }, [analyticsFilter, timeframe]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [l, a] = await Promise.all([listLinks(), getAnalytics(computedFilters)]);
      setLinks(l);
      setAnalytics(a);
    } catch {
      // silently fail if no session or api-key setup yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [computedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Chart data: group events by type ──────────────────────────────────────
  const chartData = useMemo(() => {
    if (!analytics?.events?.length) return [];
    const counts: Record<string, number> = {};
    for (const e of analytics.events) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [analytics]);

  // ── Timeline: activity trend ──────────────────────────────────────────────
  const timelineData = useMemo(() => {
    if (!analytics?.events?.length) return [];
    
    const now = new Date();
    
    if (timeframe === "24h") {
      // Group by hour for last 24h
      const hours: Record<string, number> = {};
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(d.getHours() - i);
        hours[d.toLocaleTimeString("en", { hour: "numeric", hour12: true })] = 0;
      }
      for (const e of analytics.events) {
        const d = new Date(e.timestamp).toLocaleTimeString("en", { hour: "numeric", hour12: true });
        if (d in hours) hours[d]++;
      }
      return Object.entries(hours).map(([label, events]) => ({ label, events }));
    } else {
      // Group by day for other timeframes
      const daysCount = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 14; // Default to 14 if all events span less
      const days: Record<string, number> = {};
      
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        days[d.toLocaleDateString("en", { month: "short", day: "numeric" })] = 0;
      }
      
      for (const e of analytics.events) {
        const d = new Date(e.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" });
        if (d in days) {
          days[d]++;
        } else if (timeframe === "all") {
          // If all time, initialize dynamically
          days[d] = (days[d] || 0) + 1;
        }
      }
      
      return Object.entries(days).map(([label, events]) => ({ label, events }));
    }
  }, [analytics, timeframe]);

  // ── Traffic Referrers ─────────────────────────────────────────────────────
  const referrers = useMemo(() => {
    if (!analytics?.events?.length) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    
    for (const e of analytics.events) {
      let ref = e.referrer || "Direct / Unknown";
      if (ref.includes("t.co") || ref.includes("twitter.com") || ref.includes("x.com")) ref = "Twitter / X";
      else if (ref.includes("linkedin.com")) ref = "LinkedIn";
      else if (ref.includes("github.com")) ref = "GitHub";
      else if (ref.includes("google.com")) ref = "Google";
      else if (ref.startsWith("http")) {
        try {
          ref = new URL(ref).hostname;
        } catch {}
      }
      counts[ref] = (counts[ref] || 0) + 1;
      total++;
    }
    
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analytics]);

  // ── Browsers Breakdown ────────────────────────────────────────────────────
  const browsers = useMemo(() => {
    if (!analytics?.events?.length) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    
    for (const e of analytics.events) {
      const name = getBrowserIcon(e.userAgent);
      counts[name] = (counts[name] || 0) + 1;
      total++;
    }
    
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [analytics]);

  // ── Devices Breakdown ─────────────────────────────────────────────────────
  const devices = useMemo(() => {
    const counts = { Desktop: 0, Mobile: 0, Tablet: 0 };
    if (!analytics?.events?.length) return counts;
    
    for (const e of analytics.events) {
      const ua = e.userAgent.toLowerCase();
      if (ua.includes("ipad")) counts.Tablet++;
      else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) counts.Mobile++;
      else counts.Desktop++;
    }
    return counts;
  }, [analytics]);

  // ── Action composer handler ────────────────────────────────────────────────
  async function handleExecute(action: ActionConfig, values: Record<string, string>) {
    setLastActionResult(null); // Clear previous result
    if (action.id === "shorten") {
      if (!values.url) { toast.error("URL is required"); return; }
      try {
        const res = await createLink(values.url, values.key || undefined);
        toast.success("Short link created!");
        setLastActionResult({ type: "shorten", data: res });
        load();
      } catch (e: any) { toast.error(e.message); }
    }

    if (action.id === "bulk") {
      if (!values.url || !values.persons) { toast.error("URL and persons are required"); return; }
      const persons = values.persons.split(",").map((p) => {
        const trimmed = p.trim();
        const isEmail = trimmed.includes("@");
        return isEmail ? { name: trimmed.split("@")[0], email: trimmed } : { name: trimmed };
      });
      try {
        const res = await createBulkLinks(values.url, persons);
        toast.success(`Created ${res.created} tracking links!`);
        setLastActionResult({ type: "bulk", data: res });
        load();
      } catch (e: any) { toast.error(e.message); }
    }

    if (action.id === "contact") {
      if (!values.name) { toast.error("Contact name is required"); return; }
      try {
        const res = await createContact(values.name, values.email || undefined, values.notes || undefined);
        toast.success("Contact created successfully!");
        setLastActionResult({ type: "contact", data: res });
      } catch (e: any) { toast.error(e.message); }
    }

    if (action.id === "apikey") {
      try {
        const key = await createApiKey(values.label || undefined);
        toast.success(`API Key created: ${key.key}`);
        setLastActionResult({ type: "apikey", data: key });
      } catch (e: any) { toast.error(e.message); }
    }

    if (action.id === "analytics") {
      setAnalyticsFilter({
        targetId: values.targetId !== "*" ? values.targetId : undefined,
        type: values.type,
      });
      toast.info("Analytics filter applied");
    }

    if (action.id === "reset_analytics") {
      setAnalyticsFilter({});
      toast.success("Analytics filters reset");
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-zinc-100">
      {/* ── Header + Action Composer ────────────────────────────────────── */}
      <div className="px-8 pt-6 pb-6 border-b border-white/[0.06] bg-zinc-950/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Analytics Dashboard
              {refreshing && <RotateCw className="w-4 h-4 text-violet-400 animate-spin" />}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">
              {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-1 rounded-xl shrink-0 self-start sm:self-auto">
            {(["24h", "7d", "30d", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                  timeframe === t
                    ? "bg-violet-600 text-white shadow"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {t === "all" ? "All Time" : t}
              </button>
            ))}
            <button
              onClick={() => load(true)}
              className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.02] transition-colors ml-1"
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Composer Command bar */}
        <ActionComposer
          actions={ACTIONS}
          onExecute={handleExecute}
          placeholder="Paste URL to shorten, or type / for command composer…"
          triggerCharacter="/"
          executeLabel="Run Command"
          cancelLabel="Discard"
        />

        {/* Action Result Card */}
        {lastActionResult && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/80 backdrop-blur-md p-5 mt-4 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Left accent bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500" />
            
            <div className="flex items-start justify-between gap-4 pl-2">
              <div className="flex-1 min-w-0">
                {/* shorten result */}
                {lastActionResult.type === "shorten" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-bold text-white tracking-wide">Short Link Created Successfully</h3>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 border border-white/[0.04] p-3 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 font-semibold mb-0.5">SHORT URL</p>
                        <a 
                          href={lastActionResult.data.shortUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors break-all flex items-center gap-1.5"
                        >
                          {lastActionResult.data.shortUrl}
                          <ExternalLink className="w-3.5 h-3.5 inline-block shrink-0" />
                        </a>
                        <p className="text-[10px] text-zinc-600 mt-1 truncate">Destination: {lastActionResult.data.url}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(lastActionResult.data.shortUrl)}
                        className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white rounded-xl transition-all shrink-0 active:scale-95"
                        title="Copy Short URL"
                      >
                        {copiedText === lastActionResult.data.shortUrl ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* apikey result */}
                {lastActionResult.type === "apikey" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-sm font-bold text-white tracking-wide">API Key Generated</h3>
                    </div>
                    <p className="text-xs text-amber-300/80 font-medium">
                      Make sure to copy this API key now. For security reasons, you won't be able to see it again.
                    </p>
                    <div className="flex items-center gap-3 bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-amber-500/70 font-semibold mb-0.5">API KEY</p>
                        <code className="text-sm font-mono font-bold text-white break-all">{lastActionResult.data.key}</code>
                        {lastActionResult.data.label && (
                          <p className="text-[10px] text-zinc-500 mt-1">Label: {lastActionResult.data.label}</p>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(lastActionResult.data.key)}
                        className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white rounded-xl transition-all shrink-0 active:scale-95"
                        title="Copy API Key"
                      >
                        {copiedText === lastActionResult.data.key ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* contact result */}
                {lastActionResult.type === "contact" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <h3 className="text-sm font-bold text-white tracking-wide">Contact Added Successfully</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 border border-white/[0.04] p-3.5 rounded-xl text-xs">
                      <div>
                        <span className="text-zinc-500 font-semibold uppercase text-[10px]">NAME</span>
                        <p className="font-bold text-white mt-0.5">{lastActionResult.data.name}</p>
                      </div>
                      {lastActionResult.data.email && (
                        <div>
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">EMAIL</span>
                          <p className="font-bold text-white mt-0.5">{lastActionResult.data.email}</p>
                        </div>
                      )}
                      {lastActionResult.data.notes && (
                        <div className="sm:col-span-3 border-t border-white/[0.04] pt-2 mt-1">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">NOTES</span>
                          <p className="text-zinc-300 mt-0.5 italic">{lastActionResult.data.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* bulk result */}
                {lastActionResult.type === "bulk" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          Bulk Tracking Links Generated ({lastActionResult.data.created})
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          const allLinks = lastActionResult.data.links.map((l: any) => `${l.name}: ${l.shortUrl}`).join("\n");
                          copyToClipboard(allLinks);
                        }}
                        className="text-xs bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 font-semibold shrink-0"
                      >
                        Copy All Links
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {lastActionResult.data.links.map((link: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-3 bg-black/40 border border-white/[0.04] px-3 py-2 rounded-xl text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-zinc-300">{link.name}</span>
                            {link.email && <span className="text-zinc-500 font-medium ml-1.5">({link.email})</span>}
                            <div className="text-[10px] text-violet-400 font-medium truncate mt-0.5">{link.shortUrl}</div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(link.shortUrl)}
                            className="p-1.5 hover:bg-white/[0.04] text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0"
                          >
                            {copiedText === link.shortUrl ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setLastActionResult(null)}
                className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors shrink-0 active:scale-95"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable Dashboard Content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        
        {/* Active Filters Info Pill */}
        {(analyticsFilter.targetId || analyticsFilter.type) && (
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-4 py-2.5 rounded-xl text-xs text-violet-300">
            <Info className="w-4 h-4 shrink-0 text-violet-400" />
            <span>
              Active Filters:{" "}
              {analyticsFilter.targetId && (
                <span className="font-bold">Target ID: {analyticsFilter.targetId}</span>
              )}
              {analyticsFilter.targetId && analyticsFilter.type && " & "}
              {analyticsFilter.type && (
                <span className="font-bold">Type: {analyticsFilter.type}</span>
              )}
            </span>
            <button
              onClick={() => setAnalyticsFilter({})}
              className="ml-auto underline font-semibold hover:text-white transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Total Links"
            value={loading ? "—" : links.length}
            icon={Link2}
            sub="Active redirections"
            colorClass="from-indigo-500 to-cyan-500"
          />
          <StatCard
            label="Total Clicks & Views"
            value={loading ? "—" : analytics?.totalEvents ?? 0}
            icon={MousePointerClick}
            sub="Across all tracked keys"
            colorClass="from-violet-500 to-fuchsia-500"
          />
          <StatCard
            label="Unique Visitors"
            value={loading ? "—" : analytics?.uniqueSessions ?? 0}
            icon={Users}
            sub="Identified unique sessions"
            colorClass="from-emerald-500 to-teal-500"
          />
          <StatCard
            label="Avg Session Duration"
            value={loading ? "—" : analytics ? `${Math.round((analytics.averageDurationMs || 0) / 1000)}s` : "—"}
            icon={TrendingUp}
            sub="Interaction engagement time"
            colorClass="from-amber-500 to-rose-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Timeline / Activity Chart */}
          <div className="col-span-1 lg:col-span-3 glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Activity Timeline</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Click frequency in select timeframe</p>
              </div>
              <Badge variant="outline" className="text-xs bg-white/5 text-violet-300 border-violet-500/20 font-semibold px-2.5 py-0.5">
                {timeframe === "all" ? "All Time" : timeframe}
              </Badge>
            </div>
            
            <div className="h-56">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="glowPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "600" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "600" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(139, 92, 246, 0.2)", strokeWidth: 1.5 }} />
                    <Area
                      type="monotone"
                      dataKey="events"
                      name="Events"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#glowPurple)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                  <Info className="w-6 h-6 text-zinc-700" />
                  <span className="text-xs font-semibold">No click events recorded in this period</span>
                </div>
              )}
            </div>
          </div>

          {/* Event Type / Horizontal Breakdown */}
          <div className="col-span-1 lg:col-span-2 glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Event Distribution</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Split by tracking event classification</p>
            </div>
            
            <div className="h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="type"
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "600" }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                    <Bar
                      dataKey="count"
                      name="Events"
                      fill="rgba(6,182,212,0.7)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <span className="text-xs font-semibold">No distribution data available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Breakdowns Row (Referrers & Devices) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic Referrers */}
          <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Top Referrers</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Top domains directing visitors to your links</p>
            </div>
            
            <div className="space-y-4">
              {referrers.length > 0 ? (
                referrers.map((ref, idx) => (
                  <div key={ref.name} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        {ref.name}
                      </span>
                      <span className="text-zinc-400 font-bold">
                        {ref.count} clicks <span className="text-zinc-600 font-medium">({ref.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${
                          idx === 0
                            ? "from-violet-500 to-indigo-500"
                            : idx === 1
                            ? "from-cyan-500 to-blue-500"
                            : "from-zinc-500 to-zinc-400"
                        }`}
                        style={{ width: `${ref.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-600 text-xs font-semibold">
                  No referral statistics collected yet
                </div>
              )}
            </div>
          </div>

          {/* Browsers & Devices */}
          <div className="glass rounded-2xl p-6 border border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Devices */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Devices</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Types of devices used</p>
              </div>

              <div className="space-y-3.5">
                {[
                  { name: "Desktop", count: devices.Desktop, icon: Laptop, color: "text-indigo-400" },
                  { name: "Mobile", count: devices.Mobile, icon: Smartphone, color: "text-emerald-400" },
                  { name: "Tablet", count: devices.Tablet, icon: Tablet, color: "text-cyan-400" }
                ].map((dev) => {
                  const total = devices.Desktop + devices.Mobile + devices.Tablet;
                  const pct = total ? Math.round((dev.count / total) * 100) : 0;
                  return (
                    <div key={dev.name} className="flex items-center gap-3.5">
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <dev.icon className={`w-4 h-4 ${dev.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-300">{dev.name}</div>
                        <div className="w-full bg-white/[0.04] h-1 rounded-full mt-1.5">
                          <div className="h-full rounded-full bg-zinc-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right text-xs font-bold text-zinc-400">
                        {dev.count} <span className="text-[10px] text-zinc-600 font-medium">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browsers */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Browsers</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Top browsers used</p>
              </div>

              <div className="space-y-3">
                {browsers.length > 0 ? (
                  browsers.slice(0, 4).map((b) => (
                    <div key={b.name} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-400 flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-zinc-600" />
                        {b.name}
                      </span>
                      <span className="font-bold text-zinc-300">
                        {b.count} <span className="text-[10px] text-zinc-600 font-medium">({b.percentage}%)</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-zinc-600 text-xs font-semibold">
                    No data
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Live Activity Feed */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide">Live Activity Stream</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold px-2 py-0.5">
              Real-time
            </Badge>
          </div>
          <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-6 py-10 text-center text-zinc-500 text-xs font-semibold">Loading feed…</div>
            ) : !analytics?.events?.length ? (
              <div className="px-6 py-10 text-center text-zinc-600 text-xs font-semibold">
                No activity recorded yet. Clicks and views will register here immediately.
              </div>
            ) : (
              analytics.events.slice(0, 10).map((event) => {
                const DevIcon = getDeviceIcon(event.userAgent);
                const isRedirect = event.type === "redirect";
                return (
                  <div key={event.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isRedirect ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      }`}>
                        {isRedirect ? <ArrowUpRight className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200">
                            {isRedirect ? `Redirect clicked` : `Pixel event: ${event.type}`}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-500 bg-white/5 border border-white/[0.08] px-1.5 py-0.2 rounded-md">
                            /{event.targetId}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-sm sm:max-w-md md:max-w-lg mt-0.5">
                          Referrer: <span className="text-zinc-400 font-semibold">{event.referrer || "Direct / External"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 justify-between sm:justify-end">
                      {/* Meta badges */}
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <DevIcon className="w-3.5 h-3.5" />
                        <span>{getBrowserIcon(event.userAgent)}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-600 bg-white/5 border border-white/[0.08] px-1.5 py-0.5 rounded-md">
                        {event.ip}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Links Section */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.01]">
            <span className="text-sm font-bold text-white tracking-wide">Recent Shortlinks</span>
            <Link href="/dashboard/links" className="text-xs text-zinc-400 hover:text-white font-semibold transition-colors">
              Manage all →
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-xs">Loading links…</div>
            ) : links.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-600 text-xs font-semibold">
                No links yet. Use the command composer at the top to shorten your first link!
              </div>
            ) : (
              links.slice(0, 5).map((link) => (
                <div key={link.key} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0">
                    <Link2 className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-200">/{link.key}</div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">{link.url}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => { navigator.clipboard.writeText(link.shortUrl); toast.success("Copied to clipboard!"); }}
                      className="p-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all"
                      title="Copy Short Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all"
                      title="Open Short Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
