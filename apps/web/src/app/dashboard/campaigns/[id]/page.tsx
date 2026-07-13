"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCampaign, CampaignDetails } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, LayoutDashboard, Users, Layers } from "lucide-react";
import CampaignOverviewTab from "../components/CampaignOverviewTab";
import CampaignRecipientsTab from "../components/CampaignRecipientsTab";
import CampaignAssetsTab from "../components/CampaignAssetsTab";

type Tab = "overview" | "recipients" | "assets";

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const loadData = useCallback(async () => {
    try {
      const details = await getCampaign(campaignId);
      setCampaign(details);
    } catch {
      toast.error("Failed to load campaign details.");
      router.push("/dashboard/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#070708]">
        <div className="text-zinc-600 text-sm font-mono animate-pulse">Loading Campaign...</div>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden text-zinc-100 bg-[#070708]">
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b border-zinc-900 bg-[#09090b]/40">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/dashboard/campaigns")}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {campaign.description || "Manage your campaign"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "overview"
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("recipients")}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "recipients"
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Recipients
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "assets"
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Assets & Generator
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {activeTab === "overview" && <CampaignOverviewTab campaign={campaign} />}
        {activeTab === "recipients" && (
          <CampaignRecipientsTab campaign={campaign} onUpdate={loadData} />
        )}
        {activeTab === "assets" && (
          <CampaignAssetsTab campaign={campaign} onUpdate={loadData} />
        )}
      </div>
    </div>
  );
}
