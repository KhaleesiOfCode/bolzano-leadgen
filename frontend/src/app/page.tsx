"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Stats } from "@/lib/api";
import { getStats, scrapeBolzano, scrapeSouthTyrol, scrapeCity, scrapeDigitalAgencies } from "@/lib/api";

const GROUP_LABELS: Record<string, string> = {
  food: "Food & Dining",
  healthcare: "Healthcare",
  beauty: "Beauty & Personal Care",
  services: "Other Services",
  digital_marketing: "Digital Marketing",
};

const GROUP_COLORS: Record<string, string> = {
  food: "bg-orange-500",
  healthcare: "bg-red-500",
  beauty: "bg-pink-500",
  services: "bg-blue-500",
  digital_marketing: "bg-purple-500",
};

const SOUTH_TYROL_CITIES = [
  "bolzano", "merano", "brixen", "bruneck", "sterzing",
  "schlanders", "lana", "naturns", "kaltern", "neumarkt",
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [scrapingCity, setScrapingCity] = useState<string | null>(null);

  async function loadStats() {
    setError(null);
    try {
      setStats(await getStats());
    } catch (e: any) {
      setError(e.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStats(); }, []);

  async function handleScrape(type: string, cityName?: string) {
    if (type === "south-tyrol") {
      setScraping(true);
      setScrapeResult(null);
      try {
        const r = await scrapeSouthTyrol();
        setScrapeResult(`South Tyrol: ${r.leads_found} leads (${r.created} new, ${r.updated} updated)`);
        await loadStats();
      } catch (e: any) {
        setScrapeResult(`Error: ${e.message}`);
      } finally {
        setScraping(false);
      }
    } else if (type === "city" && cityName) {
      setScrapingCity(cityName);
      setScrapeResult(null);
      try {
        const r = await scrapeCity(cityName);
        const label = cityName.charAt(0).toUpperCase() + cityName.slice(1);
        setScrapeResult(`${label}: ${r.leads_found} leads (${r.created} new, ${r.updated} updated)`);
        await loadStats();
      } catch (e: any) {
        setScrapeResult(`Error scraping ${cityName}: ${e.message}`);
      } finally {
        setScrapingCity(null);
      }
    } else if (type === "digital" && cityName) {
      setScrapingCity(cityName);
      setScrapeResult(null);
      try {
        const r = await scrapeDigitalAgencies(cityName);
        const label = cityName.charAt(0).toUpperCase() + cityName.slice(1);
        setScrapeResult(`${label} digital agencies: ${r.leads_found} found (${r.created} new)`);
        await loadStats();
      } catch (e: any) {
        setScrapeResult(`Error scraping digital agencies in ${cityName}: ${e.message}`);
      } finally {
        setScrapingCity(null);
      }
    } else {
      setScraping(true);
      setScrapeResult(null);
      try {
        const r = await scrapeBolzano();
        setScrapeResult(`Bolzano: ${r.leads_found} leads (${r.created} new, ${r.updated} updated)`);
        await loadStats();
      } catch (e: any) {
        setScrapeResult(`Error: ${e.message}`);
      } finally {
        setScraping(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">Loading stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Bolzano LeadGen</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium mb-2">Could not connect to backend</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button onClick={loadStats} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bolzano LeadGen</h1>
          <p className="text-gray-500 mt-1">Lead generation dashboard for South Tyrol businesses</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leads"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Leads
          </Link>
          <Link
            href="/campaigns"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Campaigns
          </Link>
          <button
            onClick={() => handleScrape("bolzano")}
            disabled={scraping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {scraping ? "Scraping..." : "Bolzano"}
          </button>
          <button
            onClick={() => handleScrape("south-tyrol")}
            disabled={scraping}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {scraping ? "Scraping..." : "South Tyrol"}
          </button>
        </div>
      </header>

      {scrapeResult && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${scrapeResult.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {scrapeResult}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Leads" value={stats.total_leads} />
            <StatCard label="With Website" value={stats.with_website} />
            <StatCard label="With Email" value={stats.with_email} />
            <StatCard label="Avg Score" value={stats.avg_lead_score} />
            <StatCard label="Verified - No Website" value={stats.verified_no_website} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Official Websites" value={stats.official_websites} />
            <StatCard label="Social Only" value={stats.social_only} />
            <StatCard label="Booking Platform" value={stats.booking_platform_only} />
            <StatCard label="No Website (OSM)" value={stats.no_website_osm} />
          </div>

          <details className="mb-8 bg-gray-50 rounded-xl border border-gray-200 p-4">
            <summary className="text-sm font-semibold text-gray-600 cursor-pointer select-none">
              Scrape individual cities
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-3">
              {SOUTH_TYROL_CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => handleScrape("city", city)}
                  disabled={scrapingCity === city}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 capitalize transition-colors"
                >
                  {scrapingCity === city ? "..." : city}
                </button>
              ))}
            </div>
          </details>

          <details className="mb-8 bg-purple-50 rounded-xl border border-purple-200 p-4">
            <summary className="text-sm font-semibold text-purple-700 cursor-pointer select-none">
              Scrape digital agencies (Google Places)
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-3">
              {SOUTH_TYROL_CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => handleScrape("digital", city)}
                  disabled={scrapingCity === city}
                  className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-sm hover:bg-purple-100 disabled:opacity-50 capitalize transition-colors"
                >
                  {scrapingCity === city ? "..." : city}
                </button>
              ))}
            </div>
          </details>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold mb-4">By Business Group</h2>
              <div className="space-y-3">
                {Object.entries(GROUP_LABELS).map(([key, label]) => {
                  const count = stats.by_business_group[key] || 0;
                  const total = stats.total_leads || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={key}>
                      <Link href={`/leads?business_group=${key}`} className="flex justify-between text-sm mb-1 hover:underline">
                        <span>{label}</span>
                        <span className="font-medium">{count}</span>
                      </Link>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${GROUP_COLORS[key] || "bg-gray-500"} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold mb-4">Quick Filters</h2>
              <div className="space-y-2 text-sm">
                <Link href="/leads?business_group=food&has_website=false" className="block px-3 py-2 bg-orange-50 text-orange-800 rounded-lg hover:bg-orange-100">
                  Restaurants without website
                </Link>
                <Link href="/leads?business_subgroup=bakery" className="block px-3 py-2 bg-orange-50 text-orange-800 rounded-lg hover:bg-orange-100">
                  Bakeries & pastry shops
                </Link>
                <Link href="/leads?business_subgroup=home_baker_candidate" className="block px-3 py-2 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100">
                  Home baker candidates
                </Link>
                <Link href="/leads?business_group=beauty&has_website=false" className="block px-3 py-2 bg-pink-50 text-pink-800 rounded-lg hover:bg-pink-100">
                  Beauty without website
                </Link>
                <Link href="/leads?business_subgroup=nail_salon" className="block px-3 py-2 bg-pink-50 text-pink-800 rounded-lg hover:bg-pink-100">
                  Nail salons
                </Link>
                <Link href="/leads?website_source=social" className="block px-3 py-2 bg-purple-50 text-purple-800 rounded-lg hover:bg-purple-100">
                  Social-only businesses
                </Link>
                <Link href="/leads?lead_status=verified_no_website" className="block px-3 py-2 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100">
                  Verified - no website
                </Link>
                <Link href="/leads?business_group=digital_marketing" className="block px-3 py-2 bg-purple-50 text-purple-800 rounded-lg hover:bg-purple-100">
                  Digital marketing agencies
                </Link>
                <Link href="/leads?business_group=digital_marketing&has_website=false" className="block px-3 py-2 bg-purple-50 text-purple-800 rounded-lg hover:bg-purple-100">
                  Digital agencies without website
                </Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold mb-4">Top Categories</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 12)
                  .map(([cat, count]) => (
                    <Link key={cat} href={`/leads?category=${cat}`} className="flex justify-between items-center hover:underline">
                      <span className="capitalize text-sm">{cat.replace(/_/g, " ")}</span>
                      <span className="text-sm text-gray-500">{count}</span>
                    </Link>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold mb-4">Lead Status</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_status).map(([status, count]) => (
                  <Link key={status} href={`/leads?lead_status=${status}`} className="flex justify-between items-center hover:underline">
                    <span className="text-sm capitalize">{status.replace(/_/g, " ")}</span>
                    <span className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
