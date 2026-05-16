"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { Lead, Stats } from "@/lib/api";
import { getLeads, getStats } from "@/lib/api";

const BUSINESS_GROUPS = ["food", "healthcare", "beauty", "services", "digital_marketing"];

const GROUP_LABELS: Record<string, string> = {
  food: "Food & Dining",
  healthcare: "Healthcare",
  beauty: "Beauty & Personal Care",
  services: "Other Services",
  digital_marketing: "Digital Marketing",
};

const GROUP_COLORS: Record<string, string> = {
  food: "bg-orange-100 text-orange-800",
  healthcare: "bg-red-100 text-red-800",
  beauty: "bg-pink-100 text-pink-800",
  services: "bg-blue-100 text-blue-800",
  digital_marketing: "bg-purple-100 text-purple-800",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "verified_no_website", label: "Verified - No Website" },
  { value: "verified_weak_website", label: "Verified - Weak Website" },
  { value: "not_relevant", label: "Not Relevant" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_needed", label: "Follow Up Needed" },
  { value: "interested", label: "Interested" },
  { value: "call_booked", label: "Call Booked" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "do_not_contact", label: "Do Not Contact" },
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

const WEBSITE_SOURCE_OPTIONS = [
  { value: "official", label: "Official" },
  { value: "social", label: "Social" },
  { value: "booking_platform", label: "Booking" },
  { value: "directory", label: "Directory" },
  { value: "google_places", label: "Google Places" },
  { value: "osm", label: "OSM" },
];

const SUBGROUPS_BY_GROUP: Record<string, { value: string; label: string }[]> = {
  food: ["restaurant", "cafe", "bar", "fast_food", "bakery", "pastry_shop", "ice_cream", "pub", "home_baker_candidate", "confectionery", "deli", "coffee_shop", "catering"].map(v => ({ value: v, label: v.replace(/_/g, " ") })),
  beauty: ["hair_salon", "beauty_salon", "nail_salon", "cosmetics_studio", "spa", "tanning_salon", "tattoo_studio", "perfumery", "fitness_centre"].map(v => ({ value: v, label: v.replace(/_/g, " ") })),
  healthcare: ["doctor", "dental_clinic", "pharmacy", "clinic", "veterinary", "hospital", "physiotherapy", "optometrist", "psychotherapy"].map(v => ({ value: v, label: v.replace(/_/g, " ") })),
  services: ["optician", "massage", "laundry", "pet_shop", "photographer", "real_estate", "lawyer", "accountant", "fitness_centre", "driving_school", "bicycle_repair", "electronics_repair", "tailor", "childcare", "shoemaker"].map(v => ({ value: v, label: v.replace(/_/g, " ") })),
  digital_marketing: ["digital_agency", "marketing_agency", "advertising_agency", "web_design", "it_consulting", "software_development", "graphic_design", "consulting", "marketing", "public_relations"].map(v => ({ value: v, label: v.replace(/_/g, " ") })),
};

export default function LeadsPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-6"><p className="text-gray-500">Loading...</p></div>}>
      <LeadsPage />
    </Suspense>
  );
}

function LeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const businessGroup = searchParams.get("business_group") || "";
  const businessSubgroup = searchParams.get("business_subgroup") || "";
  const leadStatus = searchParams.get("lead_status") || "";
  const hasWebsite = searchParams.get("has_website") || "";
  const city = searchParams.get("city") || "";
  const websiteSource = searchParams.get("website_source") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 50;

  function setFilter(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.set("page", "1");
    router.push(`/leads?${p.toString()}`);
  }

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeads({
        business_group: businessGroup || undefined,
        business_subgroup: businessSubgroup || undefined,
        lead_status: leadStatus || undefined,
        has_website: hasWebsite || undefined,
        city: city || undefined,
        website_source: websiteSource || undefined,
        skip: (page - 1) * limit,
        limit,
      });
      setLeads(data);
    } catch (e: any) {
      setError(e.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [businessGroup, businessSubgroup, leadStatus, hasWebsite, city, websiteSource, page]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  function goToPage(n: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(n));
    router.push(`/leads?${p.toString()}`);
  }

  const activeFilters = { business_group: businessGroup, business_subgroup: businessSubgroup, lead_status: leadStatus, has_website: hasWebsite, city, website_source };
  const activeCount = Object.values(activeFilters).filter(Boolean).length;
  const cities = stats?.by_city ? Object.keys(stats.by_city).sort() : ["Bolzano"];

  const activeChips = [
    businessGroup && { key: "business_group", label: GROUP_LABELS[businessGroup] || businessGroup },
    businessSubgroup && { key: "business_subgroup", label: `Sub: ${businessSubgroup.replace(/_/g, " ")}` },
    leadStatus && { key: "lead_status", label: `Status: ${leadStatus.replace(/_/g, " ")}` },
    hasWebsite && { key: "has_website", label: hasWebsite === "true" ? "Has Website" : "No Website" },
    city && { key: "city", label: `City: ${city}` },
    websiteSource && { key: "website_source", label: `Source: ${websiteSource}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              activeCount > 0
                ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <a
            href={`/api/leads/export/csv?${new URLSearchParams(activeFilters as Record<string, string>).toString()}`}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </a>
          {activeCount > 0 && (
            <Link href="/leads" className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50">
              Clear
            </Link>
          )}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {activeChips.map(({ key, label }) => (
            <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full">
              {label}
              <button onClick={() => setFilter(key, "")} className="hover:text-blue-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {filtersOpen && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Business Group</label>
              <div className="flex flex-wrap gap-1">
                <GroupPill active={!businessGroup} onClick={() => setFilter("business_group", "")}>All</GroupPill>
                {BUSINESS_GROUPS.map((g) => (
                  <GroupPill key={g} active={businessGroup === g} onClick={() => setFilter("business_group", businessGroup === g ? "" : g)}>
                    {GROUP_LABELS[g]}
                  </GroupPill>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subgroup</label>
              <select
                value={businessSubgroup}
                onChange={(e) => setFilter("business_subgroup", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All subgroups</option>
                {businessGroup && (SUBGROUPS_BY_GROUP[businessGroup] || []).map((sg) => (
                  <option key={sg.value} value={sg.value}>{sg.label}</option>
                ))}
              </select>
              {!businessGroup && <p className="text-xs text-gray-400 mt-1">Select a group first</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lead Status</label>
              <select
                value={leadStatus}
                onChange={(e) => setFilter("lead_status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Website</label>
              <div className="flex gap-1">
                {[{ value: "", label: "All" }, { value: "true", label: "Has" }, { value: "false", label: "No" }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter("has_website", opt.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      hasWebsite === opt.value || (!hasWebsite && !opt.value)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Website Source</label>
              <select
                value={websiteSource}
                onChange={(e) => setFilter("website_source", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All sources</option>
                {WEBSITE_SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">City</label>
              <select
                value={city}
                onChange={(e) => setFilter("city", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium mb-2">Failed to load leads</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button onClick={loadLeads} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            Retry
          </button>
        </div>
      ) : loading ? (
        <p className="text-gray-500">Loading leads...</p>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No leads found</p>
          {activeCount > 0 && <p className="text-sm mt-1">Try adjusting your filters</p>}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="py-3 px-4 font-semibold text-gray-600">Name</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Group</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Subgroup</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">City</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Website</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Source</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Email</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-center">Score</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                        {lead.name || "Unnamed"}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {lead.business_group && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${GROUP_COLORS[lead.business_group] || "bg-gray-100"}`}>
                          {GROUP_LABELS[lead.business_group] || lead.business_group}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{lead.business_subgroup?.replace(/_/g, " ") || "-"}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{lead.city || "-"}</td>
                    <td className="py-3 px-4">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                          {new URL(lead.website).hostname}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        lead.website_source === "official" ? "bg-green-100 text-green-700" :
                        lead.website_source === "social" ? "bg-purple-100 text-purple-700" :
                        lead.website_source === "booking_platform" ? "bg-blue-100 text-blue-700" :
                        lead.website_source === "directory" ? "bg-gray-100 text-gray-700" :
                        "bg-gray-50 text-gray-400"
                      }`}>
                        {lead.website_source || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">{lead.email || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold ${
                        lead.lead_score >= 15 ? "bg-green-100 text-green-700" :
                        lead.lead_score >= 8 ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {lead.lead_score}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[lead.lead_status] || "bg-gray-100"}`}>
                        {lead.lead_status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
            <span>Page {page} · {leads.length} leads</span>
            <div className="flex gap-2">
              {page > 1 && (
                <button onClick={() => goToPage(page - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Previous
                </button>
              )}
              {leads.length === limit && (
                <button onClick={() => goToPage(page + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Next
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GroupPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-full font-medium border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
      }`}
    >
      {children}
    </button>
  );
}
