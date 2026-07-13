"use client";

import { useEffect, useState, useCallback } from "react";
import { listCampaigns, deleteCampaign, Campaign } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import CreateCampaignModal from "./components/CreateCampaignModal";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const campList = await listCampaigns();
      setCampaigns(campList);
    } catch {
      toast.error("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteCampaign(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteCampaign(id);
      toast.success("Campaign deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-zinc-100 bg-[#070708]">
      <div className="px-8 pt-8 pb-6 border-b border-zinc-900 bg-[#09090b]/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Organize tracking links, manage targeted lists, and analyze channels
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold border border-orange-700/20 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="py-12 text-center text-zinc-600 text-sm font-mono animate-pulse">
            Loading Campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-zinc-950 border border-zinc-900 rounded-3xl max-w-2xl mx-auto">
            <Target className="w-8 h-8 text-zinc-700 mx-auto" />
            <p className="text-zinc-400 text-sm font-medium">
              No campaigns created yet.
            </p>
            <p className="text-zinc-650 text-xs max-w-sm mx-auto">
              Create a campaign to track individual clicks, customize
              routing adapters, and scale outreach.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => {
              const clickRate =
                camp.contact_count && camp.contact_count > 0
                  ? Math.round(
                      (Number(camp.clicked_count || 0) /
                        Number(camp.contact_count)) *
                        100,
                    )
                  : 0;

              return (
                <div
                  key={camp.id}
                  onClick={() => router.push(`/dashboard/campaigns/${camp.id}`)}
                  className="group relative bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-2xl p-6 space-y-5 transition-all cursor-pointer hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-zinc-200 group-hover:text-orange-400 transition-colors">
                        {camp.name}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {camp.description || "No description"}
                      </p>
                    </div>
                    <Badge className="bg-zinc-900 text-zinc-400 hover:bg-zinc-900 border border-zinc-800 capitalize text-[10px]">
                      {camp.status || 'Active'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>CLICK THROUGH RATE</span>
                      <span className="font-bold text-zinc-300">
                        {clickRate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-700 rounded-full"
                        style={{ width: `${clickRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-zinc-650 font-mono pt-1">
                      <span>{camp.clicked_count || 0} Clicked</span>
                      <span>{camp.contact_count || 0} Total Contacts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900/60 text-[10px] text-zinc-550">
                    <span>
                      Created {new Date(camp.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDeleteCampaign(camp.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
