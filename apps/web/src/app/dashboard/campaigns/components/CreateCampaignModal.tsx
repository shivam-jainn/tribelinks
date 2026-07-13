"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createCampaign } from "@/lib/api";
import { toast } from "sonner";

export default function CreateCampaignModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDesc, setNewCampaignDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    setCreateLoading(true);
    try {
      await createCampaign(
        newCampaignName.trim(),
        newCampaignDesc.trim() || undefined,
        "general"
      );
      toast.success("Campaign created!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-zinc-200 mb-5">
          Create Custom Campaign
        </h2>
        <form onSubmit={handleCreateCampaign} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                Campaign Name
              </label>
              <input
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="e.g. Summer Newsletter 2026"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 text-sm focus:outline-none focus:border-orange-700/50 transition-all font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                Description
              </label>
              <textarea
                value={newCampaignDesc}
                onChange={(e) => setNewCampaignDesc(e.target.value)}
                placeholder="Briefly describe the campaign audience or target goals..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 text-sm focus:outline-none focus:border-orange-700/50 transition-all font-sans resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createLoading}
              className="flex-1 py-2.5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-40"
            >
              {createLoading ? "Creating..." : "Create Campaign"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-350 text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
