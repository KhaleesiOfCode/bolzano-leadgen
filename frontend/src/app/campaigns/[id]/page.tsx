"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCampaign, previewCampaignLeads, addLeadsToCampaign, getCampaignLeads, approveCampaignLeads, generateCampaignEmail, updateCampaignStatus, getTemplates } from "@/lib/api";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [campaign, setCampaign] = useState<any>(null);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);
  const [campaignLeads, setCampaignLeads] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ leadName: string; to: string | null; subject: string; body: string } | null>(null);

  useEffect(() => {
    Promise.all([
      getCampaign(id),
      previewCampaignLeads(id),
      getCampaignLeads(id),
      getTemplates(),
    ]).then(([c, p, cl, t]) => {
      setCampaign(c);
      setPreviewLeads(p.leads);
      setCampaignLeads(cl);
      setTemplates(t);
      setLoading(false);
    });
  }, [id]);

  async function handleAddAll() {
    const ids = previewLeads.filter(l => !l.in_campaign).map(l => l.id);
    if (ids.length === 0) return;
    await addLeadsToCampaign(id, ids);
    setCampaignLeads(await getCampaignLeads(id));
    setPreviewLeads((await previewCampaignLeads(id)).leads);
    setMessage(`Added ${ids.length} leads`);
  }

  async function handleApproveSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await approveCampaignLeads(id, ids);
    setCampaignLeads(await getCampaignLeads(id));
    setSelectedIds(new Set());
    setMessage(`Approved ${ids.length} leads`);
  }

  async function handleGenerate(campaignLeadId: number, leadName: string) {
    setSendingId(campaignLeadId);
    try {
      const result = await generateCampaignEmail(id, campaignLeadId);
      if (result.status === "error") {
        setMessage(`Error: ${result.error || "No email address for this lead"}`);
      } else {
        setEmailPreview({ leadName, to: result.to, subject: result.subject, body: result.body });
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSendingId(null);
    }
  }

  async function handleActivate() {
    await updateCampaignStatus(id, "active");
    setCampaign(await getCampaign(id));
  }

  if (loading) return <div className="max-w-4xl mx-auto p-6"><p className="text-gray-500">Loading...</p></div>;
  if (!campaign) return <div className="max-w-4xl mx-auto p-6"><p className="text-gray-500">Campaign not found</p></div>;

  const pendingLeads = campaignLeads.filter(cl => cl.status === "pending");
  const approvedLeads = campaignLeads.filter(cl => cl.status === "approved");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/campaigns" className="text-sm text-blue-600 hover:underline">&larr; Campaigns</Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Status: <span className="font-medium">{campaign.status}</span>
            {" · "}{approvedLeads.length} approved
          </p>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button onClick={handleActivate} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              Activate Campaign
            </button>
          )}
          <button onClick={() => router.push("/leads")} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            View All Leads
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{message}</div>
      )}

      {campaign.filters && (
        <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Targeting Filters</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(campaign.filters).map(([k, v]) => (
              <span key={k} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{k}: {String(v)}</span>
            ))}
          </div>
        </div>
      )}

      {campaign.template_id && (() => {
        const tmpl = templates.find(t => t.id === campaign.template_id);
        return tmpl ? (
          <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Assigned Template</h3>
            <p className="text-sm font-medium">{tmpl.name}</p>
            <p className="text-xs text-blue-600 mt-0.5">{tmpl.subject}</p>
            <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap line-clamp-4">{tmpl.body}</p>
          </div>
        ) : null;
      })()}

      {/* Stage: Add Leads */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">1. Add Leads</h2>
          <button onClick={handleAddAll} className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add All to Campaign
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">{previewLeads.length} leads match your filters</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-2 font-medium text-gray-500">Name</th>
                <th className="pb-2 font-medium text-gray-500">Group</th>
                <th className="pb-2 font-medium text-gray-500">City</th>
                <th className="pb-2 font-medium text-gray-500">Email</th>
                <th className="pb-2 font-medium text-gray-500">Score</th>
                <th className="pb-2 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewLeads.slice(0, 30).map(l => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-xs">{l.name || "Unnamed"}</td>
                  <td className="py-2 pr-4 text-xs">{l.business_group || "-"}</td>
                  <td className="py-2 pr-4 text-xs">{l.city || "-"}</td>
                  <td className="py-2 pr-4 text-xs">{l.email || <span className="text-gray-400">-</span>}</td>
                  <td className="py-2 pr-4 text-xs font-medium">{l.lead_score}</td>
                  <td className="py-2 text-xs">{l.in_campaign ? <span className="text-green-600">Added</span> : <span className="text-gray-400">New</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage: Approve Leads */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">2. Approve Leads</h2>
          <button onClick={handleApproveSelected} disabled={selectedIds.size === 0} className="text-sm px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
            Approve Selected ({selectedIds.size})
          </button>
        </div>
        {pendingLeads.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No pending leads</p>
        ) : (
          <div className="space-y-2">
            {pendingLeads.map(cl => (
              <label key={cl.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 text-sm cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(cl.lead_id)}
                  onChange={e => {
                    const next = new Set(selectedIds);
                    e.target.checked ? next.add(cl.lead_id) : next.delete(cl.lead_id);
                    setSelectedIds(next);
                  }}
                  className="rounded"
                />
                <div className="flex-1">
                  <span className="font-medium">{cl.lead_name || "Unnamed"}</span>
                  <span className="text-gray-500 ml-2 text-xs">{cl.lead_email}</span>
                </div>
                <span className="text-xs text-gray-400">Pending</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Stage: Generate Email */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">3. Generate Email</h2>
        </div>
        {approvedLeads.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Approve leads above to generate emails</p>
        ) : (
          <div className="space-y-2">
            {approvedLeads.map(cl => (
              <div key={cl.id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{cl.lead_name || "Unnamed"}</span>
                    <span className="text-gray-500 ml-2 text-xs">{cl.lead_email}</span>
                  </div>
                  <button
                    onClick={() => handleGenerate(cl.id, cl.lead_name || "Unnamed")}
                    disabled={sendingId === cl.id}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sendingId === cl.id ? "..." : "Generate Email"}
                  </button>
                </div>

                {emailPreview && sendingId === null && (() => {
                  const leadName = cl.lead_name || "";
                  const previewMatch = emailPreview.leadName === leadName || emailPreview.to === cl.lead_email;
                  return previewMatch ? (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono">
                        <p className="mb-1"><span className="font-semibold text-gray-600">To:</span> {emailPreview.to}</p>
                        <p className="mb-2"><span className="font-semibold text-gray-600">Subject:</span> {emailPreview.subject}</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{emailPreview.body}</p>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        Copy this email and send from your own email client. The tool does not send emails automatically.
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
