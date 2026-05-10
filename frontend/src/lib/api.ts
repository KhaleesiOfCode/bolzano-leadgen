const BASE = "http://127.0.0.1:8000";

export interface Lead {
  id: number;
  source: string | null;
  osm_type: string | null;
  osm_id: number | null;
  name: string | null;
  category: string | null;
  business_group: string | null;
  business_subgroup: string | null;
  classification_confidence: number | null;
  cuisine: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  municipality: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  search_area: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  email: string | null;
  email_source: string | null;
  email_confidence: number | null;
  website: string | null;
  website_status: string | null;
  website_source: string | null;
  website_confidence: number | null;
  website_discovery_status: string | null;
  candidate_websites: string | null;
  instagram: string | null;
  facebook: string | null;
  opening_hours: string | null;
  has_website: boolean;
  has_email: boolean;
  lead_score: number;
  lead_status: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Stats {
  total_leads: number;
  by_category: Record<string, number>;
  by_business_group: Record<string, number>;
  by_business_subgroup: Record<string, number>;
  by_city: Record<string, number>;
  by_status: Record<string, number>;
  avg_lead_score: number;
  with_email: number;
  with_website: number;
  needs_manual_verification: number;
  official_websites: number;
  social_only: number;
  booking_platform_only: number;
  directory_only: number;
  no_website_osm: number;
  top_cities: { city: string; count: number }[];
  top_categories_missing_website: { category: string; count: number }[];
}

export interface ScrapeResult {
  leads_found: number;
  created: number;
  updated: number;
}

export interface EnrichResult {
  processed: number;
  enriched: number;
  errors: number;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (e) {
    const msg = e instanceof TypeError ? e.message : String(e);
    throw new ApiError(0, `Cannot reach backend at ${BASE}. Make sure the FastAPI server is running on port 8000. (${msg})`);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json();
}

export { ApiError };

export function getHealth(): Promise<{ status: string }> {
  return fetcher("/health");
}

export function getStats(): Promise<Stats> {
  return fetcher("/stats");
}

export function getLeads(params?: {
  has_website?: string;
  lead_status?: string;
  business_group?: string;
  business_subgroup?: string;
  city?: string;
  municipality?: string;
  province?: string;
  search_area?: string;
  website_status?: string;
  website_discovery_status?: string;
  website_source?: string;
  min_score?: number;
  max_score?: number;
  skip?: number;
  limit?: number;
}): Promise<Lead[]> {
  const q = new URLSearchParams();
  if (params?.has_website) q.set("has_website", params.has_website);
  if (params?.lead_status) q.set("lead_status", params.lead_status);
  if (params?.business_group) q.set("business_group", params.business_group);
  if (params?.business_subgroup) q.set("business_subgroup", params.business_subgroup);
  if (params?.city) q.set("city", params.city);
  if (params?.municipality) q.set("municipality", params.municipality);
  if (params?.province) q.set("province", params.province);
  if (params?.search_area) q.set("search_area", params.search_area);
  if (params?.website_status) q.set("website_status", params.website_status);
  if (params?.website_discovery_status) q.set("website_discovery_status", params.website_discovery_status);
  if (params?.website_source) q.set("website_source", params.website_source);
  if (params?.min_score !== undefined) q.set("min_score", String(params.min_score));
  if (params?.max_score !== undefined) q.set("max_score", String(params.max_score));
  if (params?.skip !== undefined) q.set("skip", String(params.skip));
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetcher(`/leads${qs ? `?${qs}` : ""}`);
}

export function getLead(id: number): Promise<Lead> {
  return fetcher(`/leads/${id}`);
}

export function updateLeadStatus(id: number, lead_status: string): Promise<Lead> {
  return fetcher(`/leads/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_status }),
  });
}

export function updateLeadNotes(id: number, notes: string): Promise<Lead> {
  return fetcher(`/leads/${id}/notes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
}

export function updateLeadWebsite(id: number, website: string): Promise<Lead> {
  return fetcher(`/leads/${id}/website`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ website }),
  });
}

export function acceptCandidateWebsite(id: number, website: string): Promise<{ status: string; website: string }> {
  return fetcher(`/leads/${id}/accept-candidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ website }),
  });
}

export function scrapeBolzano(): Promise<ScrapeResult> {
  return fetcher("/scrape/osm/bolzano", { method: "POST" });
}

export function scrapeSouthTyrol(groups?: string): Promise<ScrapeResult> {
  const q = groups ? `?groups=${encodeURIComponent(groups)}` : "";
  return fetcher(`/scrape/osm/south-tyrol${q}`, { method: "POST" });
}

export function scrapeCity(cityName: string): Promise<ScrapeResult> {
  return fetcher(`/scrape/osm/city/${encodeURIComponent(cityName)}`, { method: "POST" });
}

export function scrapeDigitalAgencies(cityName: string): Promise<ScrapeResult> {
  return fetcher(`/scrape/digital-agencies/${encodeURIComponent(cityName)}`, { method: "POST" });
}

export function enrichLead(id: number): Promise<Lead> {
  return fetcher(`/leads/${id}/enrich`, { method: "POST" });
}

export function enrichLeadsBatch(params?: {
  limit?: number;
  business_group?: string;
}): Promise<EnrichResult> {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.business_group) q.set("business_group", params.business_group);
  return fetcher(`/leads/enrich/batch?${q.toString()}`, { method: "POST" });
}

export function searchLeadWebsite(id: number): Promise<{
  lead_id: number;
  found: boolean;
  website: string | null;
  source: string | null;
  confidence: number;
  status: string;
  error?: string;
}> {
  return fetcher(`/leads/${id}/search-website`);
}

export function searchWebsitesBatch(params?: {
  limit?: number;
  business_group?: string;
}): Promise<{ processed: number; found: number; errors: number }> {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.business_group) q.set("business_group", params.business_group);
  return fetcher(`/leads/search-website/batch?${q.toString()}`, { method: "POST" });
}

export function exportCsvUrl(): string {
  return `http://127.0.0.1:8000/leads/export/csv`;
}

// ─── Campaigns ───────────────────────────────────────────

export interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
  business_group: string | null;
  language: string;
  created_at: string | null;
}

export interface Campaign {
  id: number;
  name: string;
  template_id: number | null;
  filters: Record<string, string> | null;
  status: string;
  sent_count: number;
  open_count: number;
  reply_count: number;
  created_at: string | null;
}

export function getTemplates(): Promise<Template[]> {
  return fetcher("/campaigns/templates");
}

export function createTemplate(body: { name: string; subject: string; body: string; business_group?: string; language?: string }): Promise<Template> {
  return fetcher("/campaigns/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteTemplate(id: number): Promise<{ ok: boolean }> {
  return fetcher(`/campaigns/templates/${id}`, { method: "DELETE" });
}

export function getCampaigns(): Promise<Campaign[]> {
  return fetcher("/campaigns");
}

export function createCampaign(body: { name: string; template_id?: number; filters?: Record<string, string> }): Promise<Campaign> {
  return fetcher("/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getCampaign(id: number): Promise<Campaign> {
  return fetcher(`/campaigns/${id}`);
}

export function updateCampaignStatus(id: number, status: string): Promise<{ status: string }> {
  return fetcher(`/campaigns/${id}/status?status=${encodeURIComponent(status)}`, { method: "PATCH" });
}

export function previewCampaignLeads(id: number): Promise<{ leads: any[]; total: number }> {
  return fetcher(`/campaigns/${id}/preview-leads`, { method: "POST" });
}

export function addLeadsToCampaign(id: number, leadIds: number[]): Promise<{ added: number }> {
  return fetcher(`/campaigns/${id}/add-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_ids: leadIds }),
  });
}

export function getCampaignLeads(id: number): Promise<any[]> {
  return fetcher(`/campaigns/${id}/leads`);
}

export function approveCampaignLeads(id: number, leadIds: number[]): Promise<{ approved: number }> {
  return fetcher(`/campaigns/${id}/approve-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_ids: leadIds }),
  });
}

export function sendCampaignEmail(campaignId: number, campaignLeadId: number): Promise<any> {
  return fetcher(`/campaigns/${campaignId}/send/${campaignLeadId}`, { method: "POST" });
}
