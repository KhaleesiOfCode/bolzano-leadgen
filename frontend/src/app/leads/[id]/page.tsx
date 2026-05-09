"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Lead } from "@/lib/api";
import { getLead, updateLeadStatus, updateLeadNotes, enrichLead, acceptCandidateWebsite, searchLeadWebsite } from "@/lib/api";

const STATUS_OPTIONS = [
  "new",
  "needs_manual_verification",
  "contacted",
  "responded",
  "converted",
  "not_interested",
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  needs_manual_verification: "bg-amber-100 text-amber-800",
  contacted: "bg-blue-100 text-blue-800",
  responded: "bg-purple-100 text-purple-800",
  converted: "bg-emerald-100 text-emerald-800",
  not_interested: "bg-gray-100 text-gray-800",
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

  const id = Number(params.id);

  async function loadLead() {
    try {
      const data = await getLead(id);
      setLead(data);
      setNotes(data.notes || "");
    } catch (e) {
      console.error("Failed to load lead", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLead(); }, [id]);

  async function handleStatusChange(status: string) {
    setSavingStatus(true);
    setMessage(null);
    try {
      const updated = await updateLeadStatus(id, status);
      setLead(updated);
      setMessage({ type: "success", text: "Status updated" });
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
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSearchingGoogle(false);
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
            href="http://127.0.0.1:8000/leads/export/csv"
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
