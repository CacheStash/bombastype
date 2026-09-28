/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Send, Megaphone, Users, ShieldAlert, Sparkles, CheckCircle2, 
  AlertCircle, RefreshCw, Eye, History, Clock, ArrowRight, 
  Tag, HelpCircle, Layers, Mail, Check, Search, Upload, Image as ImageIcon, X
} from 'lucide-react';

interface GasAccount {
  email: string;
  url: string;
  remaining: number;
  limit: number;
  isOnline: boolean;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  preset: string;
  audience: string;
  templateData: any;
  totalTarget: number;
  remainingCount?: number;
  sentEmails: string[];
  sentLogs: Array<{
    email: string;
    gas: string;
    sent_at: string;
    status: string;
  }>;
  status: 'in_progress' | 'completed';
  created_at: string;
  last_batch_at?: string;
}

const PRESETS = [
  {
    id: 'new_release',
    name: 'New Typeface Release',
    subject: 'New Archival Typeface Release: [FONT_NAME]',
    title: 'NEW TYPEFACE RELEASE: [FONT_NAME]',
    subtitle: 'A Majestic Historical Specimen by BombasType',
    bodyText: 'We are thrilled to unveil our latest archival creation, [FONT_NAME]. Meticulously revived and expanded with comprehensive OpenType features, alternates, and multi-layer chromatic styles ready for your editorial masterworks.',
    buttonText: 'TEST IN TYPETESTER & BUY',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: 'RELEASE20'
  },
  {
    id: 'update_typeface',
    name: 'Update Typeface (Specimen Upgrade)',
    subject: 'Typeface Update: [FONT_NAME] Enhanced Edition',
    title: 'TYPEFACE UPDATE: [FONT_NAME]',
    subtitle: 'Expanded Glyphs, Historic Alternates & Master Refinements',
    bodyText: 'We are delighted to release a major update for [FONT_NAME]. This revised specimen introduces enriched historical alternates, extensive multilingual kerning corrections, and optimized vector outlines for editorial prints and digital media.',
    buttonText: 'VIEW UPDATE IN CATALOG',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: 'UPDATE20'
  },
  {
    id: 'new_feature',
    name: 'New Product / Canvas Launch',
    subject: 'Introducing FontCanvas — The Visual Typographic Suite',
    title: 'INTRODUCING FONTCANVAS',
    subtitle: 'Our In-Browser Visual Composition Playground',
    bodyText: 'Design, stack chromatic layers, and craft authentic vintage typographic layouts directly in your browser. FontCanvas is now live with high-resolution export, vector generator, and full catalog access.',
    buttonText: 'LAUNCH FONTCANVAS',
    buttonUrl: 'https://bombastype.com/canvas',
    couponCode: ''
  },
  {
    id: 'maintenance',
    name: 'Scheduled Maintenance Notice',
    subject: 'Notice: Scheduled Studio Maintenance',
    title: 'SCHEDULED MAINTENANCE NOTICE',
    subtitle: 'Temporary System Optimization',
    bodyText: 'Please be advised that BombasType digital catalog and licensing systems will undergo scheduled maintenance to enhance edge speed and security. The brief maintenance window will conclude shortly.',
    buttonText: 'CHECK STATUS',
    buttonUrl: 'https://bombastype.com',
    couponCode: ''
  },
  {
    id: 'back_live',
    name: 'We Are Back Online!',
    subject: 'BombasType is Live & Fully Operational',
    title: 'WE ARE BACK ONLINE',
    subtitle: 'Infrastructure Enhancements Successfully Completed',
    bodyText: 'Our scheduled maintenance is officially complete. All systems, TypeTesters, license vaults, and FontCanvas are fully operational with enhanced edge delivery worldwide. Thank you for your patience.',
    buttonText: 'EXPLORE CATALOG',
    buttonUrl: 'https://bombastype.com/fonts',
    couponCode: 'BACKLIVE15'
  },
  {
    id: 'custom',
    name: 'Custom Announcement',
    subject: 'An Exclusive Dispatch from BombasType',
    title: 'STUDIO DISPATCH',
    subtitle: 'News & Updates from the Type Foundry',
    bodyText: 'Dear patron,\n\nWe are pleased to share the latest updates, design notes, and exclusive offers crafted for our typography community.',
    buttonText: 'VISIT ARCHIVE',
    buttonUrl: 'https://bombastype.com',
    couponCode: ''
  }
];

export default function BroadcastStudio() {
  const [activeTab, setActiveTab] = useState<'compose' | 'campaigns' | 'logs'>('compose');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState<{
    gas: { accounts: GasAccount[]; totalRemaining: number; safetyReserve: number; allowedToday: number };
    audience: { buyersCount: number; subscribersCount: number; totalUniqueCount: number };
    campaigns: Campaign[];
  }>({
    gas: { accounts: [], totalRemaining: 0, safetyReserve: 15, allowedToday: 0 },
    audience: { buyersCount: 0, subscribersCount: 0, totalUniqueCount: 0 },
    campaigns: []
  });

  // Compose State
  const [selectedPreset, setSelectedPreset] = useState('new_release');
  const [audience, setAudience] = useState<'all' | 'buyers' | 'subscribers'>('all');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [subject, setSubject] = useState(PRESETS[0].subject);
  const [headline, setHeadline] = useState(PRESETS[0].title);
  const [subtitle, setSubtitle] = useState(PRESETS[0].subtitle);
  const [bodyText, setBodyText] = useState(PRESETS[0].bodyText);
  const [bannerUrl, setBannerUrl] = useState('');
  const [buttonText, setButtonText] = useState(PRESETS[0].buttonText);
  const [buttonUrl, setButtonUrl] = useState(PRESETS[0].buttonUrl);
  const [couponCode, setCouponCode] = useState(PRESETS[0].couponCode);

  // Search & Filter
  const [logSearch, setLogSearch] = useState('');

  // Font Selection State for Typeface Presets
  const [fontsList, setFontsList] = useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [selectedFontName, setSelectedFontName] = useState('');
  const [fontSearch, setFontSearch] = useState('');

  // Banner Upload & Google Drive Auto-Converter State
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);

  const convertDriveUrl = (inputUrl: string) => {
    if (!inputUrl) return '';
    const trimmed = inputUrl.trim();
    const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) {
      return `https://lh3.googleusercontent.com/d/${match1[1]}`;
    }
    const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) {
      return `https://lh3.googleusercontent.com/d/${match2[1]}`;
    }
    return trimmed;
  };

  const handleBannerUrlChange = (val: string) => {
    const converted = convertDriveUrl(val);
    setBannerUrl(converted);
  };

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }
    setIsUploadingBanner(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please log in again.');

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/\s+/g, '_');
      const uniqueFileName = `${timestamp}-${cleanFileName}`;

      const res = await fetch(`/api/admin/upload/${uniqueFileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': file.type
        },
        body: file
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Upload failed with HTTP ${res.status}`);
      }

      const publicUrl = `${window.location.origin}/api/images/${uniqueFileName}`;
      setBannerUrl(publicUrl);
    } catch (err: any) {
      console.error('Banner upload error:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFontsList();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/broadcast-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed fetching broadcast data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFontsList = async () => {
    try {
      const { data, error } = await supabase
        .from('fonts')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed fetching fonts list:', error);
      } else if (data) {
        setFontsList(data);
      }
    } catch (e) {
      console.warn('Failed fetching fonts list:', e);
    }
  };

  const handleSelectFont = (fontName: string) => {
    setSelectedFontName(fontName);
    if (!fontName) return;

    const isRelease = selectedPreset === 'new_release';
    const isUpdate = selectedPreset === 'update_typeface';

    if (isRelease) {
      setCampaignTitle(`${fontName} - Release`);
    } else if (isUpdate) {
      setCampaignTitle(`${fontName} - Update`);
    }

    const currentPresetObj = PRESETS.find(p => p.id === selectedPreset);
    if (!currentPresetObj) return;

    const replaceToken = (text: string, templateFallback: string) => {
      if (text.includes('[FONT_NAME]')) {
        return text.replace(/\[FONT_NAME\]/g, fontName);
      }
      if (selectedFontName && text.includes(selectedFontName)) {
        return text.split(selectedFontName).join(fontName);
      }
      return templateFallback.replace(/\[FONT_NAME\]/g, fontName);
    };

    setSubject(prev => replaceToken(prev, currentPresetObj.subject));
    setHeadline(prev => replaceToken(prev, currentPresetObj.title));
    setSubtitle(prev => replaceToken(prev, currentPresetObj.subtitle));
    setBodyText(prev => replaceToken(prev, currentPresetObj.bodyText));
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = PRESETS.find(item => item.id === presetId);
    if (!p) return;

    const isRelease = presetId === 'new_release';
    const isUpdate = presetId === 'update_typeface';

    let subj = p.subject;
    let head = p.title;
    let subt = p.subtitle;
    let body = p.bodyText;

    if ((isRelease || isUpdate) && selectedFontName) {
      subj = subj.replace(/\[FONT_NAME\]/g, selectedFontName);
      head = head.replace(/\[FONT_NAME\]/g, selectedFontName);
      subt = subt.replace(/\[FONT_NAME\]/g, selectedFontName);
      body = body.replace(/\[FONT_NAME\]/g, selectedFontName);
      setCampaignTitle(isRelease ? `${selectedFontName} - Release` : `${selectedFontName} - Update`);
    } else if (isRelease || isUpdate) {
      setCampaignTitle('');
    }

    setSubject(subj);
    setHeadline(head);
    setSubtitle(subt);
    setBodyText(body);
    setButtonText(p.buttonText);
    setButtonUrl(p.buttonUrl);
    setCouponCode(p.couponCode);
  };

  const getTargetAudienceCount = () => {
    if (audience === 'buyers') return data.audience.buyersCount;
    if (audience === 'subscribers') return data.audience.subscribersCount;
    return data.audience.totalUniqueCount;
  };

  const handleSendBroadcast = async (existingCampaignId?: string) => {
    const targetCount = getTargetAudienceCount();
    if (targetCount === 0) {
      alert("No recipients found in selected audience.");
      return;
    }

    if (data.gas.allowedToday <= 0) {
      alert("Daily quota limit reached (15 emails reserved for real-time customer orders). Please continue tomorrow.");
      return;
    }

    const campId = existingCampaignId || `camp_${Date.now()}`;
    const willSendCount = Math.min(targetCount, data.gas.allowedToday);
    const confirmMsg = `Launch Broadcast Batch?\n\n- Sending Today: ${willSendCount} emails\n- Safety Reserve: 15 emails protected for incoming customer orders\n- Audience: ${audience.toUpperCase()}\n- Accounts: Balanced across all active GAS senders\n\nProceed with dispatch?`;

    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/broadcast-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId: campId,
          campaignTitle: campaignTitle || headline || subject,
          audience,
          subject,
          preset: selectedPreset,
          templateData: {
            title: headline,
            subtitle,
            bodyText,
            bannerUrl,
            buttonText,
            buttonUrl,
            couponCode
          }
        })
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || resJson.error || 'Broadcast failed');
      }

      alert(`Broadcast Batch Dispatched!\n\nSent: ${resJson.sentInBatch} emails\nRemaining for Campaign: ${resJson.remainingForCampaign}\nStatus: ${resJson.status.toUpperCase()}`);
      await fetchData();
      setActiveTab('campaigns');
    } catch (err: any) {
      alert("Broadcast Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Compile all logs across campaigns
  const allLogs = (data.campaigns || []).flatMap(c => 
    (c.sentLogs || []).map(l => ({ ...l, campaignTitle: c.title || c.subject, campaignId: c.id }))
  ).sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

  const filteredLogs = allLogs.filter(l => 
    (l.email || '').toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.campaignTitle || '').toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.gas || '').toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-serif">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-vintage-ink pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-vintage-ink text-vintage-paper rounded-xs">
              <Megaphone size={20} />
            </span>
            <h1 className="font-blackletter text-4xl tracking-tight leading-none">Broadcast Studio</h1>
          </div>
          <p className="text-xs uppercase tracking-widest text-vintage-ink/70 mt-2 font-mono">
            High-Deliverability Multi-Account Email Marketing &amp; Release Engine
          </p>
        </div>

        {/* GAS REAL-TIME STATUS BAR */}
        <div className="flex items-center gap-4 bg-vintage-ink/5 border border-vintage-ink p-3 rounded-xs text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase opacity-60">Daily Available Quota</span>
            <span className="text-base font-black text-vintage-ink">
              {data.gas.allowedToday} <span className="text-[10px] font-normal opacity-60">/ {data.gas.totalRemaining} (15 Reserve)</span>
            </span>
          </div>
          <div className="h-8 w-px bg-vintage-ink/20" />
          <button 
            onClick={fetchData} 
            disabled={loading}
            title="Refresh Real-Time Quota"
            className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* THREE GAS ACCOUNTS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.gas.accounts.map((acc, idx) => (
          <div key={idx} className="border border-vintage-ink p-4 bg-vintage-paper flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono mb-2">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                Account #{idx + 1}
              </span>
              <span className="opacity-60">{acc.remaining} / {acc.limit} Left</span>
            </div>
            <div className="text-[11px] font-mono text-vintage-ink/80 truncate mb-3">{acc.email}</div>
            <div className="w-full bg-vintage-ink/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-vintage-ink h-full transition-all" 
                style={{ width: `${Math.min(100, (acc.remaining / acc.limit) * 100)}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-vintage-ink text-xs font-bold uppercase tracking-wider gap-2">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-6 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'compose' 
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5' 
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink'
          }`}
        >
          <Send size={14} />
          Compose Broadcast
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'campaigns' 
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5' 
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink'
          }`}
        >
          <Layers size={14} />
          Campaigns &amp; Multi-Day Queue ({data.campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'logs' 
              ? 'border-vintage-ink text-vintage-ink bg-vintage-ink/5' 
              : 'border-transparent text-vintage-ink/50 hover:text-vintage-ink'
          }`}
        >
          <History size={14} />
          Sent Delivery Audit ({allLogs.length})
        </button>
      </div>

      {/* TAB 1: COMPOSE BROADCAST */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: FORM CONTROLS */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AUDIENCE SELECTOR CARD */}
            <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4">
              <label className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                <Users size={14} /> Target Audience
              </label>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAudience('all')}
                  className={`p-3 border text-left transition-all ${
                    audience === 'all' 
                      ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                      : 'border-vintage-ink/30 hover:border-vintage-ink'
                  }`}
                >
                  <div className="font-bold">ALL AUDIENCE</div>
                  <div className="text-[10px] opacity-70 mt-1">{data.audience.totalUniqueCount} Unique Emails</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience('buyers')}
                  className={`p-3 border text-left transition-all ${
                    audience === 'buyers' 
                      ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                      : 'border-vintage-ink/30 hover:border-vintage-ink'
                  }`}
                >
                  <div className="font-bold">BUYERS ONLY</div>
                  <div className="text-[10px] opacity-70 mt-1">{data.audience.buyersCount} Verified Patrons</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience('subscribers')}
                  className={`p-3 border text-left transition-all ${
                    audience === 'subscribers' 
                      ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                      : 'border-vintage-ink/30 hover:border-vintage-ink'
                  }`}
                >
                  <div className="font-bold">SUBSCRIBERS</div>
                  <div className="text-[10px] opacity-70 mt-1">{data.audience.subscribersCount} Active Readers</div>
                </button>
              </div>
            </div>

            {/* PRESET SELECTOR */}
            <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-3">
              <label className="text-xs uppercase tracking-widest font-black flex items-center justify-between">
                <span>Template Preset</span>
                <span className="text-[10px] font-mono font-normal opacity-60">{PRESETS.length} Formats Available</span>
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="w-full border border-vintage-ink p-3 text-xs uppercase font-mono tracking-wider bg-vintage-paper outline-none cursor-pointer font-bold"
              >
                {PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* TYPEFACE SELECTOR (FOR RELEASE & UPDATE PRESETS) */}
            {(selectedPreset === 'new_release' || selectedPreset === 'update_typeface') && (
              <div className="border border-vintage-ink p-5 bg-vintage-accent/5 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                    <Sparkles size={14} className="text-vintage-accent" /> Select Target Typeface
                  </label>
                  <span className="text-[10px] opacity-70">
                    {fontsList.length} Specimens Loaded (Recent First)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      placeholder="SEARCH SPECIMEN..."
                      className="w-full border border-vintage-ink pl-8 pr-3 py-2 text-xs bg-vintage-paper outline-none uppercase font-bold"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vintage-ink/40" size={14} />
                    {fontSearch && (
                      <button
                        type="button"
                        onClick={() => setFontSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold hover:underline"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={selectedFontName}
                      onChange={(e) => handleSelectFont(e.target.value)}
                      className="w-full border border-vintage-ink p-2 text-xs uppercase font-mono bg-vintage-paper outline-none cursor-pointer font-bold"
                    >
                      <option value="">-- Choose Typeface --</option>
                      {fontsList
                        .filter(f => !fontSearch || f.name.toLowerCase().includes(fontSearch.toLowerCase().trim()))
                        .map(f => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {selectedFontName ? (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-vintage-ink border border-vintage-ink/40 bg-vintage-ink/5 p-2">
                    <Check size={12} />
                    <span>Selected: <strong>{selectedFontName}</strong> — Campaign reference & [FONT_NAME] tokens automatically populated</span>
                  </div>
                ) : (
                  <div className="text-[10px] italic opacity-70">
                    Select a typeface specimen above to automatically populate [FONT_NAME] tokens and set campaign title.
                  </div>
                )}
              </div>
            )}

            {/* EMAIL FIELDS */}
            <div className="border border-vintage-ink p-5 bg-vintage-paper space-y-4 text-xs font-mono">
              <div>
                <label className="uppercase tracking-widest font-bold block mb-1">Campaign Reference Name</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Briswood Release - Sept 2026"
                  className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none"
                />
              </div>

              <div>
                <label className="uppercase tracking-widest font-bold block mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none font-sans text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-widest font-bold block mb-1">Main Heading</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none"
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest font-bold block mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="uppercase tracking-widest font-bold block mb-1">Message Body</label>
                <textarea
                  rows={6}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none font-serif text-sm leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-widest font-bold block mb-1">Call-To-Action Button Label</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none"
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest font-bold block mb-1">Target Action URL</label>
                  <input
                    type="url"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none"
                  />
                </div>
              </div>

              {/* BANNER IMAGE UPLOAD / DRAG & DROP & URL */}
              <div className="border border-dashed border-vintage-ink/50 p-4 bg-vintage-ink/[0.02] space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <label className="uppercase tracking-widest font-bold text-xs flex items-center gap-2">
                    <ImageIcon size={14} /> Specimen Banner Image (Optional)
                  </label>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="text-[10px] font-bold text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>

                {bannerUrl ? (
                  <div className="flex items-center gap-3 bg-vintage-paper p-2 border border-vintage-ink">
                    <img src={bannerUrl} alt="Banner Preview" className="w-20 h-14 object-cover border border-vintage-ink/40" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <Check size={12} /> Image Active
                      </div>
                      <div className="text-[9px] font-mono opacity-70 truncate" title={bannerUrl}>
                        {bannerUrl}
                      </div>
                    </div>
                    <label className="vintage-btn btn-reverse px-3 py-1 text-[9px] cursor-pointer">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleBannerUpload(f);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingBanner(true); }}
                    onDragLeave={() => setIsDraggingBanner(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleBannerUpload(f);
                    }}
                    className={`border border-dashed p-4 text-center transition-all cursor-pointer ${
                      isDraggingBanner ? 'border-vintage-accent bg-vintage-accent/10' : 'border-vintage-ink/40 hover:border-vintage-ink bg-vintage-paper'
                    }`}
                  >
                    <input
                      type="file"
                      id="bannerFileInputBombas"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleBannerUpload(f);
                      }}
                    />
                    <label htmlFor="bannerFileInputBombas" className="cursor-pointer block">
                      <Upload size={20} className="mx-auto mb-1 text-vintage-ink/50" />
                      <div className="font-bold text-xs">
                        {isUploadingBanner ? 'Uploading to Archival CDN...' : 'Drop image here, or click to browse'}
                      </div>
                      <div className="text-[9px] opacity-60 mt-0.5">
                        PNG, JPG, WEBP, SVG (Auto-uploaded to Cloudflare R2)
                      </div>
                    </label>
                  </div>
                )}

                <div>
                  <div className="text-[10px] font-bold opacity-70 mb-1">
                    Or paste direct image URL (Google Drive share links auto-convert):
                  </div>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => handleBannerUrlChange(e.target.value)}
                    placeholder="https://... or Google Drive share link"
                    className="w-full border border-vintage-ink p-2 text-xs bg-vintage-paper outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="uppercase tracking-widest font-bold block mb-1">Promo Coupon Token (Optional)</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. SPECIAL20"
                  className="w-full border border-vintage-ink p-2.5 bg-vintage-paper outline-none uppercase font-bold"
                />
              </div>
            </div>

            {/* LAUNCH BUTTON */}
            <div className="border border-vintage-ink p-5 bg-vintage-paper flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono">
                <span className="font-bold text-vintage-ink">Batch Size Today: </span>
                <span className="text-emerald-700 font-bold">
                  {Math.min(getTargetAudienceCount(), data.gas.allowedToday)} emails
                </span>
                {getTargetAudienceCount() > data.gas.allowedToday && (
                  <div className="text-[10px] text-amber-800 mt-0.5">
                    Remaining {getTargetAudienceCount() - data.gas.allowedToday} emails queued for Day 2 continuation.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSendBroadcast()}
                disabled={sending || getTargetAudienceCount() === 0 || data.gas.allowedToday === 0}
                className="w-full md:w-auto px-8 py-3 bg-vintage-ink text-vintage-paper text-xs uppercase font-bold tracking-widest hover:bg-vintage-ink/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {sending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Dispatching Batch...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Launch Broadcast Batch
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE VISUAL EMAIL PREVIEW */}
          <div className="lg:col-span-5 sticky top-20 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest font-black border-b border-vintage-ink pb-2">
              <span className="flex items-center gap-2">
                <Eye size={14} /> Archival Email Preview
              </span>
              <span className="text-[10px] font-mono font-normal opacity-60">Recipient View</span>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="border-2 border-vintage-ink bg-[#fdf6e3] shadow-md p-6 font-serif text-[#2c241a] max-h-[750px] overflow-y-auto">
              {/* Header Branding */}
              <div className="text-center pb-5 mb-5 border-b-2 border-[#2c241a]">
                <div className="text-[9px] uppercase tracking-[0.25em] text-[#8b6b4a] font-bold">
                  ARCHIVAL TYPOGRAPHY DISPATCH
                </div>
                <div className="font-serif font-black text-2xl tracking-wider uppercase mt-1">
                  BOMBASTYPE
                </div>
                <div className="text-[8px] font-mono tracking-widest text-[#6b5c4d] uppercase mt-1">
                  FOUNDRY &amp; TYPE LAB &bull; EST. MMXXVI
                </div>
              </div>

              {/* Banner Image */}
              {bannerUrl && (
                <div className="mb-5 border border-[#2c241a] overflow-hidden">
                  <img src={bannerUrl} alt="Banner" className="w-full h-auto object-cover" />
                </div>
              )}

              {/* Title & Subtitle */}
              <div className="text-center mb-5">
                <h2 className="font-serif font-bold text-xl uppercase tracking-wide leading-tight">
                  {headline || "MAIN HEADLINE"}
                </h2>
                {subtitle && (
                  <p className="text-xs italic text-[#8b6b4a] mt-1 tracking-wide">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Body */}
              <div className="text-xs leading-relaxed text-[#3a2e22] whitespace-pre-line mb-6 font-serif">
                {bodyText || "Your broadcast message will appear here in elegant archival formatting."}
              </div>

              {/* Coupon Box */}
              {couponCode && (
                <div className="border-2 border-dashed border-[#8b6b4a] bg-white p-4 text-center my-5">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-[#8b6b4a] font-bold mb-1">
                    EXCLUSIVE VIP PRIVILEGE
                  </div>
                  <div className="font-mono text-lg font-bold text-[#2c241a] bg-[#fdf6e3] inline-block px-3 py-1 border border-[#2c241a] tracking-widest">
                    {couponCode}
                  </div>
                  <div className="text-[10px] italic text-[#6b5c4d] mt-1">
                    Apply this token at checkout to claim your archival discount.
                  </div>
                </div>
              )}

              {/* CTA Button */}
              {buttonText && (
                <div className="text-center my-6">
                  <span className="inline-block bg-[#2c241a] text-[#fdf6e3] text-[10px] font-bold uppercase tracking-[0.15em] px-6 py-3 border border-[#2c241a]">
                    {buttonText}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-4 border-t border-[#2c241a] text-[9px] text-[#6b5c4d] leading-relaxed">
                <div className="font-bold text-[#2c241a] uppercase tracking-wider mb-0.5">
                  BombasType Typography Studio
                </div>
                <div>You are receiving this communication as an esteemed patron or subscriber.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS & MULTI-DAY QUEUE */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="border border-vintage-ink p-4 bg-vintage-paper flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-bold">Multi-Day Queue Engine: </span>
              <span className="opacity-70">
                Large subscriber lists are split into daily batches. Completed emails are never duplicated on subsequent days.
              </span>
            </div>
            <div className="text-emerald-700 font-bold whitespace-nowrap">
              Allowed Today: {data.gas.allowedToday} emails
            </div>
          </div>

          {data.campaigns.length === 0 ? (
            <div className="border border-vintage-ink p-12 text-center text-xs font-mono opacity-60">
              NO BROADCAST CAMPAIGNS CREATED YET. COMPOSE YOUR FIRST DISPATCH ABOVE.
            </div>
          ) : (
            <div className="space-y-4">
              {data.campaigns.map((camp) => {
                const total = camp.totalTarget || camp.sentEmails.length;
                const sent = (camp.sentEmails || []).length;
                const remaining = Math.max(0, total - sent);
                const percent = total > 0 ? Math.round((sent / total) * 100) : 100;
                const canContinue = remaining > 0 && data.gas.allowedToday > 0;

                return (
                  <div key={camp.id} className="border border-vintage-ink p-6 bg-vintage-paper space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg font-serif">{camp.title || camp.subject}</h3>
                          <span className={`text-[9px] px-2 py-0.5 font-mono uppercase font-black border ${
                            camp.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                              : 'bg-amber-100 text-amber-900 border-amber-400'
                          }`}>
                            {camp.status === 'completed' ? 'Completed' : 'In Progress (Queued)'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono opacity-60 mt-1">
                          Subject: {camp.subject} &bull; Audience: {camp.audience.toUpperCase()} &bull; Created: {new Date(camp.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {remaining > 0 ? (
                        <button
                          onClick={() => handleSendBroadcast(camp.id)}
                          disabled={sending || !canContinue}
                          className="px-5 py-2.5 bg-vintage-ink text-vintage-paper text-xs uppercase font-bold tracking-wider hover:bg-vintage-ink/90 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer self-start md:self-auto"
                        >
                          <Send size={12} />
                          Continue Next Batch ({Math.min(remaining, data.gas.allowedToday)} emails)
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-mono text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={16} /> All Recipients Reached
                        </span>
                      )}
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span>Progress: {sent} / {total} sent</span>
                        <span className="font-bold">{percent}%</span>
                      </div>
                      <div className="w-full bg-vintage-ink/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-vintage-ink h-full transition-all" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono opacity-60 pt-0.5">
                        <span>Remaining: {remaining} emails</span>
                        <span>Last Batch Sent: {camp.last_batch_at ? new Date(camp.last_batch_at).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SENT DELIVERY AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search recipient email, campaign title, or GAS account..."
              className="w-full md:w-96 border border-vintage-ink p-2.5 text-xs font-mono bg-vintage-paper outline-none"
            />
            <span className="text-xs font-mono opacity-60">Showing {filteredLogs.length} Delivery Records</span>
          </div>

          <div className="border border-vintage-ink overflow-x-auto bg-vintage-paper">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-vintage-ink text-vintage-paper uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Recipient Email</th>
                  <th className="p-3">Sender Account</th>
                  <th className="p-3 text-right">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-ink/10">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center opacity-50">
                      NO DELIVERY LOGS MATCHING CRITERIA.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-vintage-ink/5">
                      <td className="p-3 whitespace-nowrap opacity-70">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-serif font-bold text-vintage-ink">
                        {log.campaignTitle}
                      </td>
                      <td className="p-3 font-semibold text-vintage-ink">
                        {log.email}
                      </td>
                      <td className="p-3 text-vintage-ink/70">
                        {log.gas}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300 rounded-[2px] font-black text-[10px]">
                          <Check size={11} /> DELIVERED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
