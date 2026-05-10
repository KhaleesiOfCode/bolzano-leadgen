"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Campaign, Template } from "@/lib/api";
import { getCampaigns, createCampaign, getTemplates, createTemplate } from "@/lib/api";

const BUSINESS_GROUPS = ["food", "healthcare", "beauty", "services", "digital_marketing"];

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  // New campaign form
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newStatus, setNewStatus] = useState("new");
  const [newHasWebsite, setNewHasWebsite] = useState("");
  const [newHasEmail, setNewHasEmail] = useState("");

  // New template form
  const [tmplName, setTmplName] = useState("");
  const [tmplSubject, setTmplSubject] = useState("");
  const [tmplBody, setTmplBody] = useState("");

  useEffect(() => {
    Promise.all([getCampaigns(), getTemplates()]).then(([c, t]) => {
      setCampaigns(c);
      setTemplates(t);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    const filters: Record<string, string> = {};
    if (newGroup) filters.business_group = newGroup;
    if (newStatus) filters.lead_status = newStatus;
    if (newHasWebsite) filters.has_website = newHasWebsite;
    if (newHasEmail) filters.has_email = newHasEmail;

    const camp = await createCampaign({ name: newName, filters: Object.keys(filters).length ? filters : undefined });
    setShowNew(false);
    setNewName("");
    router.push(`/campaigns/${camp.id}`);
  }

  async function handleCreateTemplate() {
    await createTemplate({
      name: tmplName,
      subject: tmplSubject,
      body: tmplBody,
      business_group: newGroup || undefined,
    });
    setShowNewTemplate(false);
    setTmplName("");
    setTmplSubject("");
    setTmplBody("");
    setTemplates(await getTemplates());
  }

  if (loading) return <div className="max-w-4xl mx-auto p-6"><p className="text-gray-500">Loading...</p></div>;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">Campaigns</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          New Campaign
        </button>
      </div>

      {showNew && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Create Campaign</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Campaign Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Restaurants without website" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Business Group</label>
                <select value={newGroup} onChange={e => setNewGroup(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All groups</option>
                  {BUSINESS_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lead Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="new">New</option>
                  <option value="needs_manual_verification">Needs Verification</option>
                  <option value="">Any status</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Has Website</label>
                <select value={newHasWebsite} onChange={e => setNewHasWebsite(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Has Email</label>
                <select value={newHasEmail} onChange={e => setNewHasEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreate} disabled={!newName} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                Create & Configure
              </button>
              <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <button onClick={() => setShowNewTemplate(true)} className="text-sm text-blue-600 hover:underline">+ New Template</button>
        </div>
        {showNewTemplate && (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="space-y-3">
              <input value={tmplName} onChange={e => setTmplName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Template name" />
              <input value={tmplSubject} onChange={e => setTmplSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Subject line — use {{name}}, {{business}}, {{city}}" />
              <textarea value={tmplBody} onChange={e => setTmplBody(e.target.value)} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="Email body — use {{name}}, {{business}}, {{city}}, {{website}}, {{subgroup}}" />
              <div className="flex gap-2">
                <button onClick={handleCreateTemplate} disabled={!tmplName || !tmplSubject || !tmplBody} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">Save Template</button>
                <button onClick={() => setShowNewTemplate(false)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
              <div className="font-medium">{t.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">{t.subject}</div>
              <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{t.body}</div>
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-gray-400 italic">No templates yet</p>}
        </div>
      </div>

      <div className="space-y-3">
        {campaigns.map(c => (
          <Link key={c.id} href={`/campaigns/${c.id}`} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.sent_count} sent · {c.open_count} opens · {c.reply_count} replies
                  {c.filters?.business_group ? ` · ${c.filters.business_group}` : ""}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[c.status] || "bg-gray-100"}`}>{c.status}</span>
            </div>
          </Link>
        ))}
        {campaigns.length === 0 && <p className="text-gray-400 text-sm italic">No campaigns yet</p>}
      </div>
    </div>
  );
}
