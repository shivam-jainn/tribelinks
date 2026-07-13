"use client";

import { useState, useEffect } from "react";
import { CampaignDetails, Contact, listContacts, addContactToCampaign, removeContactFromCampaign } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Users, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CampaignRecipientsTab({
  campaign,
  onUpdate,
}: {
  campaign: CampaignDetails;
  onUpdate: () => void;
}) {
  const [globalContacts, setGlobalContacts] = useState<Contact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactMode, setContactMode] = useState<"global" | "custom">("global");
  
  const [selectedGlobalId, setSelectedGlobalId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [addContactLoading, setAddContactLoading] = useState(false);

  useEffect(() => {
    listContacts().then(setGlobalContacts).catch(() => {});
  }, []);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setAddContactLoading(true);
    try {
      if (contactMode === "global") {
        if (!selectedGlobalId) {
          toast.error("Please select a contact from the book");
          setAddContactLoading(false);
          return;
        }
        await addContactToCampaign(campaign.id, {
          contactId: selectedGlobalId,
        });
      } else {
        if (!customName.trim()) {
          toast.error("Name is required");
          setAddContactLoading(false);
          return;
        }
        await addContactToCampaign(campaign.id, {
          name: customName.trim(),
          email: customEmail.trim() || undefined,
          notes: customNotes.trim() || undefined,
        });
      }
      toast.success("Contact added to campaign");
      setSelectedGlobalId("");
      setCustomName("");
      setCustomEmail("");
      setCustomNotes("");
      setShowAddContact(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddContactLoading(false);
    }
  }

  async function handleRemoveContact(ccId: string) {
    try {
      await removeContactFromCampaign(campaign.id, ccId);
      toast.success("Contact removed");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Contact Form */}
      {showAddContact && (
        <form
          onSubmit={handleAddContact}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">
              Add Campaign Recipient
            </h3>
            <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setContactMode("global")}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  contactMode === "global"
                    ? "bg-orange-700 text-white"
                    : "text-zinc-500"
                }`}
              >
                Contact Book
              </button>
              <button
                type="button"
                onClick={() => setContactMode("custom")}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  contactMode === "custom"
                    ? "bg-orange-700 text-white"
                    : "text-zinc-500"
                }`}
              >
                Custom/Ad-hoc
              </button>
            </div>
          </div>

          {contactMode === "global" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                Select Contact
              </label>
              {globalContacts.length === 0 ? (
                <p className="text-xs text-zinc-600 py-2">
                  No global contacts in book. Create custom contact instead.
                </p>
              ) : (
                <select
                  value={selectedGlobalId}
                  onChange={(e) => setSelectedGlobalId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm focus:outline-none focus:border-orange-700/50"
                >
                  <option value="">-- Choose Global Contact --</option>
                  {globalContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || "No Email"})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    Recipient Name
                  </label>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 text-sm focus:outline-none focus:border-orange-700/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 text-sm focus:outline-none focus:border-orange-700/50"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                  Notes / Context (optional)
                </label>
                <input
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Lead from London tech fair"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-650 text-sm focus:outline-none focus:border-orange-700/50"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={addContactLoading}
              className="px-5 py-2.5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {addContactLoading ? "Adding..." : "Add to Campaign"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddContact(false)}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-md">
        <div className="px-6 py-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-200">
              Target Contacts
            </span>
            <span className="text-[10px] font-mono bg-zinc-900 text-zinc-550 border border-zinc-800 px-2 py-0.5 rounded-full ml-1">
              {campaign.contacts.length} recipients
            </span>
          </div>
          {!showAddContact && (
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold px-3 py-1.5 rounded-lg bg-orange-700/5 hover:bg-orange-700/10 border border-orange-700/10 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Recipient
            </button>
          )}
        </div>

        <div className="divide-y divide-zinc-900/60">
          {campaign.contacts.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-xs font-mono">
              No contacts associated yet. Add some to start tracking.
            </div>
          ) : (
            campaign.contacts.map((c) => (
              <div
                key={c.campaign_contact_id}
                className="px-6 py-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-sm font-semibold ${
                      c.tracking_status === "clicked"
                        ? "text-orange-400 border border-orange-500/20 shadow-[0_0_10px_rgba(234,88,12,0.1)]"
                        : "text-zinc-400"
                    }`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-bold transition-all ${
                        c.tracking_status === "clicked"
                          ? "text-orange-400/90"
                          : "text-zinc-200"
                      }`}
                    >
                      {c.name}
                    </div>
                    {c.email && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {c.email}
                      </div>
                    )}
                    {c.notes && (
                      <div className="text-[10px] text-zinc-600 italic mt-1 bg-zinc-900/50 inline-block px-2 py-0.5 rounded">
                        {c.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  {c.tracking_status === "clicked" ? (
                    <Badge className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/10 border border-orange-500/20 text-[10px] flex items-center gap-1.5 py-1 px-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Clicked
                    </Badge>
                  ) : (
                    <Badge className="bg-zinc-900 text-zinc-500 hover:bg-zinc-900 border border-zinc-800 text-[10px] flex items-center gap-1.5 py-1 px-2.5">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </Badge>
                  )}
                  <button
                    onClick={() => handleRemoveContact(c.campaign_contact_id)}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all shrink-0 border border-transparent hover:border-red-500/10"
                    title="Remove from campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
