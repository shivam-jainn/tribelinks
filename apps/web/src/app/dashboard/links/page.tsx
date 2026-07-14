"use client";

import { useEffect, useState, useCallback } from "react";
import { listLinks, deleteLink, createLink, ShortLink } from "@/lib/api";
import { toast } from "sonner";
import { Copy, ExternalLink, Trash2, Plus, Link2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LinksPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newKey, setNewKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLinks(await listLinks());
    } catch {
      toast.error("Could not load links. Check your API key in Settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = links.filter(
    (l) =>
      l.key.toLowerCase().includes(search.toLowerCase()) ||
      l.url.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl) return;
    setSubmitting(true);
    try {
      await createLink(newUrl, newKey || undefined);
      toast.success("Link created!");
      setNewUrl("");
      setNewKey("");
      setCreating(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(key: string) {
    try {
      await deleteLink(key);
      setLinks((prev) => prev.filter((l) => l.key !== key));
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Links</h1>
            <p className="text-sm text-white/30 mt-0.5">{links.length} links total</p>
          </div>
          <button
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 hover:bg-white/12 border border-white/8 text-white/70 hover:text-white text-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New link
          </button>
        </div>

        {/* Inline create form */}
        {creating && (
          <form onSubmit={handleCreate} className="mt-4 flex items-center gap-3">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              required
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/50 transition-all"
            />
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="custom-key (optional)"
              className="w-44 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all disabled:opacity-40"
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/4 border border-white/6 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-all"
          />
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-white/20 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Link2 className="w-6 h-6 text-white/10 mx-auto" />
              <p className="text-white/20 text-sm">No links found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {/* Header */}
              <div className="px-5 py-3 grid grid-cols-12 gap-4 text-xs text-white/25 uppercase tracking-wider">
                <div className="col-span-2">Key</div>
                <div className="col-span-6">Destination</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {filtered.map((link) => (
                <div
                  key={link.key}
                  className="px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-white/[0.015] transition-colors"
                >
                  <div className="col-span-2">
                    <Badge
                      variant="outline"
                      className="text-red-300 border-red-400/20 bg-red-500/5 font-mono text-xs"
                    >
                      /{link.key}
                    </Badge>
                  </div>
                  <div className="col-span-6 min-w-0">
                    <p className="text-sm text-white/70 truncate">{link.url}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-white/30">
                      {new Date(link.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={() => { navigator.clipboard.writeText(link.shortUrl); toast.success("Copied!"); }}
                      className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all"
                      title="Copy short URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all"
                      title="Open"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleDelete(link.key)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
