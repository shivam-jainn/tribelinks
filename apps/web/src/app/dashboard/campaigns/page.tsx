"use client";

import { useEffect, useState, useCallback } from "react";
import { listContacts, createContact, deleteContact, createBulkLinks, Contact } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Users, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CampaignsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [filter, setFilter] = useState<"all" | "clicked" | "not_clicked">("all");

  const filteredContacts = contacts.filter((c) => {
    if (filter === "clicked") return c.clicked;
    if (filter === "not_clicked") return !c.clicked;
    return true;
  });

  // Add contact
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Bulk creation
  const [bulkUrl, setBulkUrl] = useState("");
  const [bulkPersons, setBulkPersons] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ name: string; key: string; shortUrl: string }>>([]);

  const load = useCallback(async () => {
    try {
      setContacts(await listContacts());
    } catch {
      toast.error("Could not load contacts. Check your API key in Settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddLoading(true);
    try {
      const c = await createContact(addName.trim(), addEmail.trim() || undefined, addNotes.trim() || undefined);
      setContacts((prev) => [c, ...prev]);
      setAddName(""); setAddEmail(""); setAddNotes("");
      setShowAdd(false);
      toast.success("Contact added");
    } catch (err: any) { toast.error(err.message); }
    finally { setAddLoading(false); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Deleted");
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkUrl || !bulkPersons) return;
    setBulkLoading(true);
    try {
      const persons = bulkPersons.split(/[\n,]+/).map((p) => {
        const t = p.trim();
        if (!t) return null;
        const isEmail = t.includes("@");
        return isEmail ? { name: t.split("@")[0], email: t } : { name: t };
      }).filter(Boolean) as Array<{ name: string; email?: string }>;

      const res = await createBulkLinks(bulkUrl, persons, bulkPrefix || undefined);
      setBulkResults(res.links);
      toast.success(`Created ${res.created} tracking links!`);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Campaigns</h1>
            <p className="text-sm text-white/30 mt-0.5">Persons of interest & bulk tracking links</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowBulk((v) => !v); setShowAdd(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Bulk create
            </button>
            <button
              onClick={() => { setShowAdd((v) => !v); setShowBulk(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 hover:bg-white/12 border border-white/8 text-white/70 hover:text-white text-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add contact
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {/* Bulk creation panel */}
        {showBulk && (
          <div className="glass rounded-2xl p-6 border border-violet-500/15 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Bulk Tracking Link Creator</h2>
              <p className="text-xs text-white/40 mt-1">
                Paste one URL → get unique tracking links per person. Comma or newline separated names/emails.
              </p>
            </div>
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Destination URL</label>
                  <input
                    value={bulkUrl}
                    onChange={(e) => setBulkUrl(e.target.value)}
                    placeholder="https://your-link.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Key Prefix <span className="text-white/20">(optional)</span></label>
                  <input
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="campaign-"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 uppercase tracking-wider">Persons <span className="text-white/20">(names or emails, comma/newline separated)</span></label>
                <textarea
                  value={bulkPersons}
                  onChange={(e) => setBulkPersons(e.target.value)}
                  placeholder={"Alice\nBob\ncharlie@example.com\ndave@example.com"}
                  rows={4}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all resize-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={bulkLoading}
                className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-40"
              >
                {bulkLoading ? "Creating…" : "Generate tracking links"}
              </button>
            </form>

            {/* Bulk results */}
            {bulkResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">Generated Links</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bulkResults.map((r) => (
                    <div key={r.key} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/6">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 font-medium">{r.name}</div>
                        <code className="text-xs text-violet-300 font-mono">{r.shortUrl}</code>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(r.shortUrl); toast.success("Copied!"); }}
                        className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-all shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add contact form */}
        {showAdd && (
          <form onSubmit={handleAddContact} className="glass rounded-2xl p-5 border border-white/[0.06] space-y-4">
            <h2 className="text-sm font-semibold text-white">Add contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 uppercase tracking-wider">Name</label>
                <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 uppercase tracking-wider">Email <span className="text-white/20">(optional)</span></label>
                <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="name@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 uppercase tracking-wider">Notes <span className="text-white/20">(optional)</span></label>
              <input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Any notes about this person"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={addLoading}
                className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all disabled:opacity-40">
                {addLoading ? "Adding…" : "Add contact"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-5 py-2.5 rounded-full border border-white/8 text-white/50 text-sm hover:text-white/70 transition-all">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Contacts list */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">Contacts</span>
              <Badge variant="secondary" className="text-xs bg-white/5 text-white/40 border-white/8">
                {filteredContacts.length} of {contacts.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {(["all", "clicked", "not_clicked"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {f === "all" ? "All" : f === "clicked" ? "Clicked" : "Not Clicked"}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              <div className="py-12 text-center text-white/20 text-sm">Loading…</div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-6 h-6 text-white/10 mx-auto" />
                <p className="text-white/20 text-sm">
                  {filter === "all"
                    ? "No contacts yet. Add people to start tracking them."
                    : filter === "clicked"
                    ? "No contacts have clicked yet."
                    : "All contacts have clicked!"}
                </p>
              </div>
            ) : (
              filteredContacts.map((c) => (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.015] transition-colors">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 text-sm font-semibold transition-all ${c.clicked ? "opacity-40" : "text-white/60"}`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium transition-all ${c.clicked ? "line-through text-white/30" : "text-white/80"}`}>
                      {c.name}
                    </div>
                    {c.email && (
                      <div className={`text-xs transition-all ${c.clicked ? "line-through text-white/20" : "text-white/30"}`}>
                        {c.email}
                      </div>
                    )}
                    {c.notes && (
                      <div className={`text-xs italic mt-0.5 transition-all ${c.clicked ? "line-through text-white/15" : "text-white/25"}`}>
                        {c.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {c.clicked ? (
                      <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Clicked
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-white/5 text-white/40 border border-white/5">
                        No Click
                      </Badge>
                    )}
                    <div className="text-xs text-white/25">
                      {new Date(c.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </div>
                    <button onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
