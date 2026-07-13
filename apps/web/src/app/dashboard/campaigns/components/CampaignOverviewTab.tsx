"use client";

import { CampaignDetails } from "@/lib/api";

export default function CampaignOverviewTab({
  campaign,
}: {
  campaign: CampaignDetails;
}) {
  const clickRate =
    campaign.contacts.length > 0
      ? Math.round(
          (campaign.contacts.filter((c) => c.tracking_status === "clicked")
            .length /
            campaign.contacts.length) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">
          Campaign Funnel
        </h3>
        
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-550">Overall Funnel Click-rate</span>
            <span className="font-bold text-orange-400">{clickRate}%</span>
          </div>
          <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-700 rounded-full transition-all duration-500"
              style={{ width: `${clickRate}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono pt-2">
            <span>{campaign.contacts.filter((c) => c.tracking_status === "clicked").length} Clicked</span>
            <span>{campaign.contacts.length} Total Contacts</span>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">
          Campaign Details
        </h3>
        <div className="space-y-2 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-200">Name:</strong> {campaign.name}
          </p>
          <p>
            <strong className="text-zinc-200">Description:</strong>{" "}
            {campaign.description || "No description provided"}
          </p>
          <p>
            <strong className="text-zinc-200">Status:</strong>{" "}
            <span className="capitalize">{campaign.status || "Active"}</span>
          </p>
          <p>
            <strong className="text-zinc-200">Created:</strong>{" "}
            {new Date(campaign.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
