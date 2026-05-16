"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Lead, EmailDraft, ActivityLogEntry } from "@/lib/api";
import { getLead, updateLeadStatus, updateLeadNotes, enrichLead, acceptCandidateWebsite, searchLeadWebsite, generateLeadEmail, saveEmailDraft, markEmailReady, getActivityLogs } from "@/lib/api";

const STATUS_OPTIONS = [
  "new",
  "verified_no_website",
  "verified_weak_website",
  "not_relevant",
  "contacted",
  "follow_up_needed",
  "interested",
  "call_booked",
  "proposal_sent",
  "won",
  "lost",
  "do_not_contact",
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  verified_no_website: "bg-amber-100 text-amber-800",
  verified_weak_website: "bg-orange-100 text-orange-800",
  not_relevant: "bg-gray-100 text-gray-800",
  contacted: "bg-indigo-100 text-indigo-800",
  follow_up_needed: "bg-yellow-100 text-yellow-800",
  interested: "bg-green-100 text-green-800",
  call_booked: "bg-teal-100 text-teal-800",
  proposal_sent: "bg-purple-100 text-purple-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
  do_not_contact: "bg-gray-800 text-white",
};

export default function LeadDetail() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [manualWebsite, setManualWebsite] = useState("");
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  const id = Number(params.id);

  async function loadLead() {
    try {
      const data = await getLead(id);
      setLead(data);
      setNotes(data.notes || "");
      if (data.email_draft_subject) {
        setEmailSubject(data.email_draft_subject);
        setEmailBody(data.email_draft_body || "");
        setEmailDraft({ subject: data.email_draft_subject, body: data.email_draft_body, error: null, lead_id: id });
      }
    } catch (e) {
      console.error("Failed to load lead", e);
    }
  }

  async function loadActivity() {
    try {
      const logs = await getActivityLogs(id);
      setActivityLog(logs);
    } catch (e) {
      console.error("Failed to load activity", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLead(); loadActivity(); }, [id]);

  async function handleStatusChange(status: string) {
    setSavingStatus(true);
    setMessage(null);
    try {
      const updated = await updateLeadStatus(id, status);
      setLead(updated);
      setMessage({ type: "success", text: "Status updated" });
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    setMessage(null);
    try {
      const updated = await updateLeadNotes(id, notes);
      setLead(updated);
      setMessage({ type: "success", text: "Notes saved" });
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleEnrich() {
    setEnriching(true);
    setMessage(null);
    try {
      const updated = await enrichLead(id);
      setLead(updated);
      setMessage({ type: "success", text: updated.has_email ? `Email found: ${updated.email}` : "No email found" });
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setEnriching(false);
    }
  }

  async function handleSearchGoogle() {
    setSearchingGoogle(true);
    setMessage(null);
    try {
      const result = await searchLeadWebsite(id);
      if (result.found && result.website) {
        setManualWebsite(result.website);
        setMessage({ type: "success", text: `Google found: ${result.website}. Click Accept to confirm.` });
      } else if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "error", text: "No website found via Google Places." });
      }
      loadLead();
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSearchingGoogle(false);
    }
  }

  async function handleGenerateEmail() {
    setGeneratingEmail(true);
    setMessage(null);
    try {
      const draft = await generateLeadEmail(id);
      if (draft.error) {
        setMessage({ type: "error", text: draft.error });
      } else {
        setEmailDraft(draft);
        setEmailSubject(draft.subject || "");
        setEmailBody(draft.body || "");
        setMessage({ type: "success", text: "Email draft generated!" });
        loadActivity();
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setGeneratingEmail(false);
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    setMessage(null);
    try {
      await saveEmailDraft(id, emailSubject, emailBody);
      setMessage({ type: "success", text: "Email draft saved!" });
      loadLead();
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleMarkReady() {
    setMessage(null);
    try {
      await markEmailReady(id);
      setMessage({ type: "success", text: "Marked as ready to send!" });
      loadLead();
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
  }

  async function handleAcceptWebsite() {
    if (!manualWebsite) return;
    setMessage(null);
    try {
      const result = await acceptCandidateWebsite(id, manualWebsite);
      setLead(prev => prev ? { ...prev, website: result.website, website_source: "official", has_website: true } : prev);
      setManualWebsite("");
      setMessage({ type: "success", text: `Website accepted: ${result.website}` });
      loadLead();
      loadActivity();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">Loading lead...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">Lead not found.</p>
        <Link href="/leads" className="text-blue-600 hover:underline">&larr; Back to leads</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/leads" className="text-sm text-blue-600 hover:underline">&larr; Back to leads</Link>

      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{lead.name || "Unnamed"}</h1>
          <p className="text-gray-500 capitalize">
            {lead.business_subgroup?.replace(/_/g, " ") || lead.category?.replace(/_/g, " ") || ""}
            {lead.business_group && ` · ${lead.business_group}`}
            {lead.classification_confidence && ` · ${lead.classification_confidence}% confidence`}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {[lead.city, lead.municipality, lead.province, lead.region, lead.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateEmail}
            disabled={generatingEmail}
            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {generatingEmail ? "Generating..." : lead.email_draft_status !== "not_generated" ? "Regenerate Email" : "Generate Email"}
          </button>
          <button
            onClick={handleSearchGoogle}
            disabled={searchingGoogle}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {searchingGoogle ? "Searching..." : "Search Google"}
          </button>
          {lead.website && (
            <button
              onClick={handleEnrich}
              disabled={enriching || lead.has_email}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {enriching ? "Searching..." : lead.has_email ? "Has Email" : "Find Email"}
            </button>
          )}
          <a
            href="/api/leads/export/csv"
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Business Group" value={lead.business_group} />
            <DetailRow label="Subgroup" value={lead.business_subgroup?.replace(/_/g, " ")} />
            <DetailRow label="Classification" value={lead.classification_confidence ? `${lead.classification_confidence}%` : null} />
            <DetailRow label="Address" value={lead.address} />
            <DetailRow label="City" value={lead.city} />
            <DetailRow label="Municipality" value={lead.municipality} />
            <DetailRow label="Province" value={lead.province} />
            <DetailRow label="Region" value={lead.region} />
            <DetailRow label="Postcode" value={lead.postcode} />
            <DetailRow label="Country" value={lead.country} />
            <DetailRow label="Search Area" value={lead.search_area} />
            <DetailRow label="Coordinates" value={lead.lat && lead.lon ? `${lead.lat.toFixed(4)}, ${lead.lon.toFixed(4)}` : null} />
            <DetailRow label="Phone" value={lead.phone} />
            <DetailRow label="Email" value={lead.email} />
            {lead.email_source && <DetailRow label="Email Source" value={lead.email_source} />}
            {lead.email_confidence && <DetailRow label="Email Confidence" value={`${Math.round(lead.email_confidence * 100)}%`} />}
            <DetailRow label="Cuisine" value={lead.cuisine} />
          </dl>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Website</h2>
            {lead.website ? (
              <div className="space-y-2 text-sm">
                <DetailRow label="Website" value={<a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.website}</a>} />
                <DetailRow label="Status" value={lead.website_status} />
                <DetailRow label="Source" value={lead.website_source} />
                <DetailRow label="Discovery" value={lead.website_discovery_status?.replace(/_/g, " ")} />
                {lead.website_confidence && <DetailRow label="Confidence" value={`${Math.round(lead.website_confidence * 100)}%`} />}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-3">No website recorded.</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="text-sm font-medium text-gray-700">Add / Accept Website URL</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={manualWebsite}
                  onChange={(e) => setManualWebsite(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAcceptWebsite}
                  disabled={!manualWebsite}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Social & Online</h2>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Instagram" value={lead.instagram ? <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.instagram}</a> : null} />
              <DetailRow label="Facebook" value={lead.facebook ? <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.facebook}</a> : null} />
              <DetailRow label="Opening Hours" value={lead.opening_hours} />
              <DetailRow label="Score" value={String(lead.lead_score)} />
            </dl>
          </div>

          {(emailDraft || lead.email_draft_subject) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Email Draft</h2>
                {lead.email_draft_status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lead.email_draft_status === "ready_to_send" ? "bg-green-100 text-green-700" :
                    lead.email_draft_status === "draft_saved" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {lead.email_draft_status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={12}
                    className="w-full mt-1 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingDraft ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={handleMarkReady}
                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark Ready to Send
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={savingStatus || lead.lead_status === s}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    lead.lead_status === s
                      ? `${STATUS_COLORS[s] || "bg-gray-100"} border-transparent font-medium`
                      : "bg-white border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add notes about this lead..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
            {activityLog.length === 0 ? (
              <p className="text-sm text-gray-400">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activityLog.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        log.action.startsWith("email") || log.action.startsWith("campaign_email") ? "bg-blue-400" :
                        log.action.startsWith("status") ? "bg-green-400" :
                        log.action.startsWith("website") || log.action.startsWith("note") ? "bg-amber-400" :
                        log.action === "campaign_email_sent" ? "bg-indigo-400" :
                        log.action === "campaign_email_opened" ? "bg-teal-400" :
                        log.action === "campaign_email_replied" ? "bg-emerald-400" :
                        "bg-gray-400"
                      }`} />
                      <div className="w-px grow bg-gray-200 min-h-[24px]" />
                    </div>
                    <div className="pb-3 flex-1">
                      <p className="text-gray-700">
                        {log.action === "status_changed" ? (() => {
                          try {
                            const d = JSON.parse(log.details || "{}");
                            return <>Status changed: <span className="font-medium">{d.from?.replace(/_/g, " ")}</span> → <span className="font-medium">{d.to?.replace(/_/g, " ")}</span></>;
                          } catch { return "Status changed"; }
                        })() : log.action === "email_generated" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Email draft generated: <span className="font-medium">{d.subject}</span></>; }
                          catch { return "Email draft generated"; }
                        })() : log.action === "email_draft_saved" ? "Email draft saved" :
                        log.action === "email_marked_ready" ? "Email marked ready to send" :
                        log.action === "website_updated" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Website updated: <span className="font-medium">{d.website}</span></>; }
                          catch { return "Website updated"; }
                        })() : log.action === "website_accepted" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Website accepted: <span className="font-medium">{d.website}</span></>; }
                          catch { return "Website accepted"; }
                        })() : log.action === "website_discovered" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Website discovered via {d.source || "search"}: <span className="font-medium">{d.website}</span></>; }
                          catch { return "Website discovered"; }
                        })() : log.action === "notes_updated" ? "Notes updated" :
                        log.action === "email_enriched" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Email found via <span className="font-medium">{d.source || "website"}</span>: {d.email}</>; }
                          catch { return "Email enriched"; }
                        })() : log.action === "campaign_email_sent" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Campaign email sent: <span className="font-medium">{d.subject}</span></>; }
                          catch { return "Campaign email sent"; }
                        })() : log.action === "campaign_email_error" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Campaign email failed: {d.error}</>; }
                          catch { return "Campaign email error"; }
                        })() : log.action === "campaign_email_opened" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Campaign email opened</>; }
                          catch { return "Email opened"; }
                        })() : log.action === "campaign_email_replied" ? (() => {
                          try { const d = JSON.parse(log.details || "{}"); return <>Campaign email reply received</>; }
                          catch { return "Email replied"; }
                        })() : log.action?.replace(/_/g, " ")}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Lead Info</h2>
            <dl className="space-y-2 text-sm">
              <DetailRow label="OSM ID" value={lead.osm_id ? `${lead.osm_type}/${lead.osm_id}` : null} />
              <DetailRow label="Category" value={lead.category} />
              <DetailRow label="Created" value={lead.created_at ? new Date(lead.created_at).toLocaleString() : null} />
              <DetailRow label="Updated" value={lead.updated_at ? new Date(lead.updated_at).toLocaleString() : null} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-right max-w-[60%] truncate">{value || <span className="text-gray-300">-</span>}</dd>
    </div>
  );
}
