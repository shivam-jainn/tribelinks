"use client";

import { useEffect, useState, useCallback } from "react";
import { listApiKeys, createApiKey, revokeApiKey, ApiKey } from "@/lib/api";
import { toast } from "sonner";
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

// ─── Masked key display ───────────────────────────────────────────────────────
function MaskedKey({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="text-xs font-mono text-white/60 truncate">
        {visible ? value : `${value.slice(0, 8)}${"•".repeat(18)}${value.slice(-4)}`}
      </code>
      <button
        onClick={() => setVisible((v) => !v)}
        className="p-1 rounded text-white/25 hover:text-white/55 transition-colors shrink-0"
        title={visible ? "Hide" : "Show"}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={copy}
        className="p-1 rounded text-white/25 hover:text-white/55 transition-colors shrink-0"
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      setKeys(await listApiKeys());
    } catch {
      toast.error("Could not load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const key = await createApiKey(newLabel.trim() || undefined);
      setKeys((prev) => [key, ...prev]);
      setNewLabel("");
      toast.success("New API key generated!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(key: string) {
    if (!confirm("Revoke this key? Any SDK using it will stop working.")) return;
    try {
      await revokeApiKey(key);
      setKeys((prev) => prev.filter((k) => k.key !== key));
      toast.success("Key revoked");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/auth/login");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06] flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-white/30 mt-0.5">
            Generate API keys for use with the SDK, CLI, or any external integration.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 text-white/40 hover:text-white/70 text-sm transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-w-2xl">

        {/* ── API Keys section ────────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">API Keys</h2>
            <p className="text-xs text-white/40 mt-1">
              Use these keys to authenticate SDK calls, server-side integrations, and the{" "}
              <code className="text-violet-300 font-mono">Authorization: Bearer &lt;key&gt;</code> header.
              Each key can be independently labelled and revoked.
            </p>
          </div>

          {/* Generate form */}
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <form onSubmit={handleGenerate} className="flex gap-3">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label — e.g. Production SDK, CI/CD"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/14 border border-white/8 text-white/70 hover:text-white text-sm transition-all disabled:opacity-40 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {generating ? "Generating…" : "Generate key"}
              </button>
            </form>
          </div>

          {/* Keys list */}
          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              <div className="py-10 text-center text-white/20 text-sm">Loading…</div>
            ) : keys.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Key className="w-5 h-5 text-white/10 mx-auto" />
                <p className="text-white/20 text-sm">No API keys yet. Generate one above.</p>
              </div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.key}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.015] transition-colors"
                >
                  <Key className="w-4 h-4 text-white/20 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/70">
                        {k.label || <span className="italic text-white/30">Unlabelled</span>}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                      >
                        active
                      </Badge>
                    </div>
                    <MaskedKey value={k.key} />
                  </div>
                  <div className="text-xs text-white/25 shrink-0">
                    {new Date(k.createdAt).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <button
                    onClick={() => handleRevoke(k.key)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0"
                    title="Revoke key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── SDK Quick Start ──────────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
          <h2 className="text-sm font-semibold text-white">SDK Quick Start</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-white/30 uppercase tracking-wider">Install</p>
              <code className="block px-4 py-3 rounded-xl bg-black/40 border border-white/6 text-emerald-300 text-xs font-mono">
                npm install @tracker/sdk
              </code>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-white/30 uppercase tracking-wider">Initialize</p>
              <pre className="px-4 py-3 rounded-xl bg-black/40 border border-white/6 text-cyan-300 text-xs font-mono overflow-x-auto whitespace-pre">{`import { TribelinksSDK } from '@tracker/sdk';

const sdk = new TribelinksSDK({
  apiKey: 'YOUR_API_KEY',  // from Settings → API Keys
  baseUrl: '${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}',
});

// Track a custom event
sdk.track({ type: 'pageview', targetId: 'my-campaign' });`}</pre>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-white/30 uppercase tracking-wider">Direct API call</p>
              <pre className="px-4 py-3 rounded-xl bg-black/40 border border-white/6 text-violet-300 text-xs font-mono overflow-x-auto whitespace-pre">{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/event \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{ "type": "click", "targetId": "hero-cta" }'`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
