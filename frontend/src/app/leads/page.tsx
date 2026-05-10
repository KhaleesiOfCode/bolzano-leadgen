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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  needs_manual_verification: "bg-amber-100 text-amber-800",
  contacted: "bg-blue-100 text-blue-800",
  responded: "bg-purple-100 text-purple-800",
  converted: "bg-emerald-100 text-emerald-800",
  not_interested: "bg-gray-100 text-gray-800",
};

const SUBGROUPS_BY_GROUP: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bar", "fast_food", "bakery", "pastry_shop", "ice_cream", "pub", "home_baker_candidate", "confectionery", "deli", "coffee_shop", "catering"],
  beauty: ["hair_salon", "beauty_salon", "nail_salon", "cosmetics_studio", "spa", "tanning_salon", "tattoo_studio", "perfumery", "fitness_centre"],
  healthcare: ["doctor", "dental_clinic", "pharmacy", "clinic", "veterinary", "hospital", "physiotherapy", "optometrist", "psychotherapy"],
  services: ["optician", "massage", "laundry", "pet_shop", "photographer", "real_estate", "lawyer", "accountant", "fitness_centre", "driving_school", "bicycle_repair", "electronics_repair", "tailor", "childcare", "shoemaker"],
  digital_marketing: ["digital_agency", "marketing_agency", "advertising_agency", "web_design", "it_consulting", "software_development", "graphic_design", "consulting", "marketing", "public_relations"],
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

  const activeFilters = [businessGroup, businessSubgroup, leadStatus, hasWebsite, city, websiteSource].filter(Boolean).length;

  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const groups = ["business_group", "business_subgroup", "lead_status", "has_website", "city", "website_source"];
    const current: Record<string, string> = {};
    for (const g of groups) {
      const v = searchParams.get(g);
      if (v) current[g] = v;
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v) current[k] = v;
      else delete current[k];
    }
    for (const [k, v] of Object.entries(current)) {
      p.set(k, v);
    }
    p.set("page", "1");
    const qs = p.toString();
    return `/leads${qs ? `?${qs}` : ""}`;
  }

  function goToPage(n: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(n));
    router.push(`/leads?${p.toString()}`);
  }

  function exportCsvUrlWithFilters(params: Record<string, string | undefined>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
    const qs = q.toString();
    return `http://127.0.0.1:8000/leads/export/csv${qs ? `?${qs}` : ""}`;
  }

  const cities = stats?.by_city ? Object.keys(stats.by_city).sort() : ["Bolzano"];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">Leads</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              activeFilters > 0
                ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            Filters {activeFilters > 0 ? `(${activeFilters})` : ""}
          </button>
          <a
            href={exportCsvUrlWithFilters({ business_group: businessGroup || undefined, business_subgroup: businessSubgroup || undefined, lead_status: leadStatus || undefined, has_website: hasWebsite || undefined, city: city || undefined, website_source: websiteSource || undefined })}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </a>
          <Link
            href="/leads"
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </Link>
        </div>
      </div>

      {filtersOpen && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FilterSection label="Business Group">
              <FilterChip active={!businessGroup} href={filterUrl({ business_group: "", business_subgroup: "" })} label="All" />
              {BUSINESS_GROUPS.map((g) => (
                <FilterChip key={g} active={businessGroup === g} href={filterUrl({ business_group: g, business_subgroup: "" })} label={GROUP_LABELS[g] || g} />
              ))}
            </FilterSection>

            <FilterSection label="Subgroup">
              {!businessGroup ? (
                <>
                  <FilterChip active={!businessSubgroup} href={filterUrl({ business_subgroup: "" })} label="All" />
                  <p className="text-xs text-gray-400 italic w-full">Select a business group first</p>
                </>
              ) : (
                <>
                  <FilterChip active={!businessSubgroup} href={filterUrl({ business_subgroup: "" })} label="All" />
                  {(SUBGROUPS_BY_GROUP[businessGroup] || []).map((sg) => (
                    <FilterChip key={sg} active={businessSubgroup === sg} href={filterUrl({ business_subgroup: sg })} label={sg.replace(/_/g, " ")} />
                  ))}
                </>
              )}
            </FilterSection>

            <FilterSection label="Lead Status">
              <FilterChip active={!leadStatus} href={filterUrl({ lead_status: "" })} label="All" />
              <FilterChip active={leadStatus === "new"} href={filterUrl({ lead_status: "new" })} label="New" />
              <FilterChip active={leadStatus === "needs_manual_verification"} href={filterUrl({ lead_status: "needs_manual_verification" })} label="Needs Verification" />
              <FilterChip active={leadStatus === "contacted"} href={filterUrl({ lead_status: "contacted" })} label="Contacted" />
              <FilterChip active={leadStatus === "responded"} href={filterUrl({ lead_status: "responded" })} label="Responded" />
              <FilterChip active={leadStatus === "converted"} href={filterUrl({ lead_status: "converted" })} label="Converted" />
              <FilterChip active={leadStatus === "not_interested"} href={filterUrl({ lead_status: "not_interested" })} label="Not Interested" />
            </FilterSection>

            <FilterSection label="Website">
              <FilterChip active={!hasWebsite} href={filterUrl({ has_website: "" })} label="All" />
              <FilterChip active={hasWebsite === "true"} href={filterUrl({ has_website: "true" })} label="Has Website" />
              <FilterChip active={hasWebsite === "false"} href={filterUrl({ has_website: "false" })} label="No Website" />
            </FilterSection>

            <FilterSection label="Website Source">
              <FilterChip active={!websiteSource} href={filterUrl({ website_source: "" })} label="All" />
              <FilterChip active={websiteSource === "official"} href={filterUrl({ website_source: "official" })} label="Official" />
              <FilterChip active={websiteSource === "social"} href={filterUrl({ website_source: "social" })} label="Social" />
              <FilterChip active={websiteSource === "booking_platform"} href={filterUrl({ website_source: "booking_platform" })} label="Booking" />
              <FilterChip active={websiteSource === "directory"} href={filterUrl({ website_source: "directory" })} label="Directory" />
              <FilterChip active={websiteSource === "google_places"} href={filterUrl({ website_source: "google_places" })} label="Google Places" />
              <FilterChip active={websiteSource === "osm"} href={filterUrl({ website_source: "osm" })} label="OSM" />
            </FilterSection>

            <FilterSection label="City">
              <FilterChip active={!city} href={filterUrl({ city: "" })} label="All" />
              {cities.slice(0, 12).map((c) => (
                <FilterChip key={c} active={city === c} href={filterUrl({ city: c })} label={c} />
              ))}
            </FilterSection>
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
        <p className="text-gray-500">No leads found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 font-medium text-gray-500">Name</th>
                  <th className="pb-2 font-medium text-gray-500">Group</th>
                  <th className="pb-2 font-medium text-gray-500">Subgroup</th>
                  <th className="pb-2 font-medium text-gray-500">City</th>
                  <th className="pb-2 font-medium text-gray-500">Website</th>
                  <th className="pb-2 font-medium text-gray-500">Source</th>
                  <th className="pb-2 font-medium text-gray-500">Email</th>
                  <th className="pb-2 font-medium text-gray-500">Score</th>
                  <th className="pb-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                        {lead.name || "Unnamed"}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {lead.business_group && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${GROUP_COLORS[lead.business_group] || "bg-gray-100"}`}>
                          {lead.business_group}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{lead.business_subgroup || "-"}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{lead.city || "-"}</td>
                    <td className="py-2.5 pr-4">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                          {new URL(lead.website).hostname}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">
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
                    <td className="py-2.5 pr-4 text-xs">{lead.email || <span className="text-gray-400">-</span>}</td>
                    <td className="py-2.5 pr-4 font-medium">{lead.lead_score}</td>
                    <td className="py-2.5">
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
            <span>Page {page}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <button onClick={() => goToPage(page - 1)} className="px-3 py-1 border rounded hover:bg-gray-50">
                  Previous
                </button>
              )}
              {leads.length === limit && (
                <button onClick={() => goToPage(page + 1)} className="px-3 py-1 border rounded hover:bg-gray-50">
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

function FilterChip({ active, href, label }: { active: boolean; href: string; label: string }) {
  return active ? (
    <span className="inline-block px-2.5 py-1 text-xs bg-blue-600 text-white rounded-full font-medium">{label}</span>
  ) : (
    <Link href={href} className="inline-block px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-100 hover:border-gray-400 transition-colors">
      {label}
    </Link>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
}
