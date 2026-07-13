"use client";

import { useState } from "react";
import { CampaignDetails, createLink } from "@/lib/api";
import { toast } from "sonner";
import { Copy, Image, QrCode, ExternalLink, Layers } from "lucide-react";

export default function CampaignAssetsTab({
  campaign,
  onUpdate,
}: {
  campaign: CampaignDetails;
  onUpdate: () => void;
}) {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkType, setLinkType] = useState<string>("short");
  const [abTargets, setAbTargets] = useState<Array<{ url: string; weight: number }>>([
    { url: "", weight: 50 },
    { url: "", weight: 50 }
  ]);
  const [targetScope, setTargetScope] = useState<"general" | "contacts">("general");
  const [activeQrKey, setActiveQrKey] = useState<string | null>(null);

  async function handleGenerateLinks(e: React.FormEvent) {
    e.preventDefault();
    if (linkType !== "ab" && !destinationUrl) return;

    setLinkLoading(true);
    try {
      let finalUrl = destinationUrl;
      let finalRules: any = null;

      if (linkType === "ab") {
        const validTargets = abTargets.filter((t) => t.url.trim() !== "");
        if (validTargets.length < 2) {
          toast.error("Please add at least 2 destinations for A/B testing");
          setLinkLoading(false);
          return;
        }
        finalUrl = validTargets[0].url;
        finalRules = { ab: validTargets };
      }

      if (targetScope === "general") {
        const typePrefix = linkType !== "short" ? `${linkType}-` : "";
        const randomSlug = Math.random().toString(36).substring(2, 6);
        const key = `${keyPrefix || "camp-"}${typePrefix}${campaign.id.slice(0, 4)}-general-${randomSlug}`;
        
        const exists = campaign.links.some((l) => l.key === key);
        if (!exists) {
          await createLink(finalUrl, key, undefined, campaign.id, finalRules, linkType);
        }
        toast.success("General campaign asset generated!");
      } else {
        for (const contact of campaign.contacts) {
          const contactSlug = contact.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const typePrefix = linkType !== "short" ? `${linkType}-` : "";
          const key = `${keyPrefix || "camp-"}${typePrefix}${campaign.id.slice(0, 4)}-${contactSlug}`;

          const exists = campaign.links.some((l) => l.key === key);
          if (!exists) {
            await createLink(finalUrl, key, contact.global_contact_id || undefined, campaign.id, finalRules, linkType);
          }
        }
        toast.success("Recipient-specific campaign assets generated!");
      }
      setDestinationUrl("");
      setAbTargets([{ url: "", weight: 50 }, { url: "", weight: 50 }]);
      onUpdate();
    } catch (err: any) {
      toast.error("Failed to generate tracking links: " + err.message);
    } finally {
      setLinkLoading(false);
    }
  }

  function renderLinkAsset(link: any, recipientLabel: string) {
    const currentType = link.type || "short";
    const shortUrl = `${window.location.origin}/r/${link.key}`;
    let parsedRules: any = null;
    if (link.rules) {
      try {
        parsedRules = typeof link.rules === "string" ? JSON.parse(link.rules) : link.rules;
      } catch (e) {}
    }

    return (
      <div key={link.key} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-200 font-bold truncate">{recipientLabel}</span>
              <span className="text-[9px] uppercase bg-zinc-950 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded font-mono font-bold">
                {currentType}
              </span>
            </div>
            <code className="text-[11px] text-orange-400 font-mono block mt-1 truncate bg-orange-950/20 px-1.5 py-0.5 rounded w-max">
              /r/{link.key}
            </code>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(shortUrl);
                toast.success("Short URL copied!");
              }}
              className="p-2 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all cursor-pointer"
              title="Copy Short URL"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const pixelUrl = currentType === "pixel" ? shortUrl : `${shortUrl}/pixel`;
                const imgTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;
                navigator.clipboard.writeText(imgTag);
                toast.success("Tracking Pixel HTML copied!");
              }}
              className="p-2 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all cursor-pointer"
              title="Copy Email Tracking Pixel"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveQrKey(activeQrKey === link.key ? null : link.key)}
              className={`p-2 rounded border transition-all cursor-pointer ${
                activeQrKey === link.key
                  ? "bg-orange-700/20 text-orange-400 border-orange-500/30"
                  : "bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
              }`}
              title="Toggle QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {parsedRules?.ab && Array.isArray(parsedRules.ab) && (
          <div className="mt-2 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg text-[10px] text-zinc-400 font-mono space-y-1.5">
            <span className="font-bold block text-zinc-300 uppercase tracking-wider text-[9px] mb-1">A/B test splits:</span>
            {parsedRules.ab.map((target: any, tIdx: number) => (
              <div key={tIdx} className="truncate flex justify-between">
                <span className="truncate pr-2">Split {tIdx + 1}: {target.url}</span>
                <span className="text-orange-400 font-bold shrink-0">{target.weight}%</span>
              </div>
            ))}
          </div>
        )}
        
        {activeQrKey === link.key && (
          <div className="pt-3 mt-1 border-t border-zinc-800/60 flex flex-col items-center gap-3">
            <img
              src={`${shortUrl}${currentType === "qr" ? "?qr=true" : "/qr"}`}
              className="w-32 h-32 rounded-lg bg-white p-1.5 border border-zinc-700"
              alt="QR Code"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const qrUrl = currentType === "qr" ? `${shortUrl}?qr=true` : `${shortUrl}/qr`;
                  navigator.clipboard.writeText(qrUrl);
                  toast.success("QR Code URL copied!");
                }}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700 rounded transition-all font-mono font-bold"
              >
                Copy QR URL
              </button>
              <a
                href={`${shortUrl}${currentType === "qr" ? "?qr=true" : "/qr"}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700 rounded transition-all font-mono font-bold flex items-center gap-1.5"
              >
                Open
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  const generalLinks = campaign.links.filter((l) => !l.contact_id);
  const recipientLinks = campaign.links.filter((l) => l.contact_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 shadow-md sticky top-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">
              Link Generator
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Create a tracking asset once, and let the router generate unique links for every recipient automatically.
            </p>
          </div>

          <form onSubmit={handleGenerateLinks} className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">
                Target Scope
              </label>
              <div className="flex bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTargetScope("general")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetScope === "general" ? "bg-orange-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  General Link
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope("contacts")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetScope === "contacts" ? "bg-orange-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  Bulk (All Contacts)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">
                Asset Type
              </label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm focus:outline-none focus:border-orange-700/50"
              >
                <option value="short">Short Redirect URL</option>
                <option value="pixel">Email Pixel Tracking Image</option>
                <option value="qr">Custom QR Code Image</option>
                <option value="ab">A/B Testing Link splits</option>
              </select>
            </div>

            {linkType !== "ab" ? (
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">
                  Destination URL
                </label>
                <input
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-orange-700/50"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold block">
                  A/B Split Destinations
                </label>
                {abTargets.map((target, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      value={target.url}
                      onChange={(e) => {
                        const newTargets = [...abTargets];
                        newTargets[idx].url = e.target.value;
                        setAbTargets(newTargets);
                      }}
                      placeholder={`Destination ${idx + 1}`}
                      required
                      className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-orange-700/50"
                    />
                    <input
                      type="number"
                      value={target.weight}
                      onChange={(e) => {
                        const newTargets = [...abTargets];
                        newTargets[idx].weight = Number(e.target.value);
                        setAbTargets(newTargets);
                      }}
                      placeholder="%"
                      required
                      className="w-16 px-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm text-center focus:outline-none focus:border-orange-700/50"
                    />
                    {abTargets.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setAbTargets(abTargets.filter((_, i) => i !== idx))}
                        className="text-zinc-600 hover:text-red-400 p-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAbTargets([...abTargets, { url: "", weight: 50 }])}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold"
                >
                  + Add Split
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">
                Key Prefix (optional)
              </label>
              <input
                value={keyPrefix}
                onChange={(e) => setKeyPrefix(e.target.value)}
                placeholder="e.g. promo-"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-orange-700/50"
              />
            </div>

            <button
              type="submit"
              disabled={linkLoading || (targetScope === "contacts" && campaign.contacts.length === 0)}
              className="w-full py-3 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg cursor-pointer"
            >
              {linkLoading
                ? "Generating..."
                : targetScope === "general"
                ? "Generate General Asset"
                : `Generate for ${campaign.contacts.length} Contacts`}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-6">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-md min-h-[500px]">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">
              Generated Assets
            </h3>
          </div>

          {campaign.links.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Layers className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-medium">No tracking assets generated yet.</p>
              <p className="text-xs mt-1">Use the generator to create links.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {generalLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest border-b border-zinc-900 pb-2">
                    Campaign-Wide Assets ({generalLinks.length})
                  </div>
                  <div className="space-y-3">
                    {generalLinks.map((link) => renderLinkAsset(link, "General Asset"))}
                  </div>
                </div>
              )}

              {recipientLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest border-b border-zinc-900 pb-2">
                    Recipient-Specific Assets ({recipientLinks.length})
                  </div>
                  <div className="space-y-3">
                    {recipientLinks.map((link) => {
                      const contactObj = campaign.contacts.find((c) => c.global_contact_id === link.contact_id);
                      return renderLinkAsset(link, contactObj ? contactObj.name : "Contact");
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
