import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Filter, 
  Tag, 
  Mail, 
  RefreshCw, 
  ShoppingBag, 
  Share2, 
  Sparkles, 
  Calendar, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export type AudienceRole = 'buyer_paid' | 'buyer_trial' | 'subscriber' | 'partner';

export interface AudienceMember {
  email: string;
  name: string;
  roles: AudienceRole[];
  totalSpent: number;
  paidOrdersCount: number;
  trialOrdersCount: number;
  partnerCode?: string;
  subscriberStatus?: string;
  firstSeen: string;
  lastActive: string;
}

type FilterTab = 'all' | 'buyer_paid' | 'buyer_trial' | 'subscriber' | 'partner' | 'multi_role';

export const AudienceDirectory: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [members, setMembers] = useState<AudienceMember[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'orders' | 'name' | 'email'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  useEffect(() => {
    fetchAudienceData();
  }, []);

  const fetchAudienceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Session for auth user email map
      const { data: { session } } = await supabase.auth.getSession();
      const authUserEmailMap = new Map<string, string>();
      if (session) {
        try {
          const uRes = await fetch('/api/admin/affiliate-users', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (uRes.ok) {
            const uData = await uRes.json() as any;
            if (uData.success && uData.users) {
              Object.entries(uData.users).forEach(([uid, uEmail]) => {
                if (typeof uEmail === 'string') {
                  authUserEmailMap.set(uid, uEmail.trim().toLowerCase());
                }
              });
            }
          }
        } catch (e) {
          console.warn("Could not load affiliate auth user emails:", e);
        }
      }

      // 2. Query Buyers, Orders, Subscribers, Affiliates
      const [
        { data: buyerRows },
        { data: orderRows, error: orderErr },
        { data: subscriberRows },
        { data: affiliateRows }
      ] = await Promise.all([
        supabase.from('fontbuyer').select('id, email, full_name, created_at'),
        supabase.from('admin_order_view').select('*'),
        supabase.from('fontsubscribers').select('email, status, created_at'),
        supabase.from('affiliates').select('id, user_id, affiliate_code, paypal_email, status, created_at')
      ]);

      if (orderErr) {
        console.warn("admin_order_view notice:", orderErr.message);
      }

      // 3. Aggregate by lowercase email
      const map = new Map<string, {
        email: string;
        name: string;
        roles: Set<AudienceRole>;
        totalSpent: number;
        paidOrdersCount: number;
        trialOrdersCount: number;
        partnerCode?: string;
        subscriberStatus?: string;
        firstSeen: string;
        lastActive: string;
      }>();

      const getOrCreate = (rawEmail: string, defaultName = '') => {
        const email = rawEmail.trim().toLowerCase();
        if (!map.has(email)) {
          map.set(email, {
            email,
            name: defaultName || email.split('@')[0],
            roles: new Set<AudienceRole>(),
            totalSpent: 0,
            paidOrdersCount: 0,
            trialOrdersCount: 0,
            firstSeen: new Date().toISOString(),
            lastActive: new Date(0).toISOString()
          });
        }
        return map.get(email)!;
      };

      const updateDates = (record: any, dateStr?: string) => {
        if (!dateStr) return;
        const d = new Date(dateStr).toISOString();
        if (new Date(d).getTime() < new Date(record.firstSeen).getTime()) {
          record.firstSeen = d;
        }
        if (new Date(d).getTime() > new Date(record.lastActive).getTime()) {
          record.lastActive = d;
        }
      };

      // Process fontbuyer accounts
      (buyerRows || []).forEach(b => {
        if (!b.email) return;
        const rec = getOrCreate(b.email, b.full_name);
        if (b.full_name && (!rec.name || rec.name === rec.email.split('@')[0])) {
          rec.name = b.full_name;
        }
        updateDates(rec, b.created_at);
      });

      // Process Orders / Download History
      (orderRows || []).forEach(o => {
        const email = (o.buyer_email || o.metadata?.buyer_email || o.email || '').trim().toLowerCase();
        if (!email) return;

        const rec = getOrCreate(email);
        const rawPrice = o.metadata?.price_at_purchase ?? o.metadata?.price ?? o.price ?? 0;
        const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;
        const downloadType = String(o.download_type || '').trim().toLowerCase();
        const tier = String(o.tier || '').trim().toLowerCase();

        const isTrial = downloadType === 'trial' || tier.includes('demo') || tier.includes('trial') || (price === 0 && downloadType !== 'full' && downloadType !== 'commercial');
        const isPaid = price > 0 || downloadType === 'full' || downloadType === 'commercial';

        if (isPaid) {
          rec.roles.add('buyer_paid');
          rec.paidOrdersCount += 1;
          rec.totalSpent += price;
        }
        if (isTrial) {
          rec.roles.add('buyer_trial');
          rec.trialOrdersCount += 1;
        }

        const buyerName = o.metadata?.buyer_name || o.buyer_name;
        if (buyerName && (!rec.name || rec.name === rec.email.split('@')[0])) {
          rec.name = buyerName;
        }
        updateDates(rec, o.download_date || o.created_at);
      });

      // Process Newsletter Subscribers
      (subscriberRows || []).forEach(s => {
        if (!s.email) return;
        const rec = getOrCreate(s.email);
        rec.roles.add('subscriber');
        rec.subscriberStatus = s.status || 'active';
        updateDates(rec, s.created_at);
      });

      // Process Affiliates / Partners
      (affiliateRows || []).forEach(a => {
        const authEmail = a.user_id ? authUserEmailMap.get(a.user_id) : null;
        const primaryEmail = authEmail || a.paypal_email;
        if (primaryEmail) {
          const rec = getOrCreate(primaryEmail);
          rec.roles.add('partner');
          rec.partnerCode = a.affiliate_code || undefined;
          updateDates(rec, a.created_at);
        }
        // If paypal_email is different, ensure it's also tagged or linked
        if (a.paypal_email && (!authEmail || a.paypal_email.trim().toLowerCase() !== authEmail)) {
          const recPaypal = getOrCreate(a.paypal_email);
          recPaypal.roles.add('partner');
          recPaypal.partnerCode = a.affiliate_code || undefined;
          updateDates(recPaypal, a.created_at);
        }
      });

      // Ensure zero unlabeled contacts: registered accounts without commercial purchases default to buyer_trial
      map.forEach(rec => {
        if (rec.roles.size === 0) {
          rec.roles.add('buyer_trial');
          if (rec.trialOrdersCount === 0) {
            rec.trialOrdersCount = 1;
          }
        }
      });

      // Finalize array
      const list: AudienceMember[] = Array.from(map.values()).map(r => ({
        ...r,
        roles: Array.from(r.roles)
      }));

      // Default sort by most recent activity
      list.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
      setMembers(list);
    } catch (err: any) {
      console.error("Failed to load audience directory:", err);
      alert("Error loading audience directory: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    let paidCount = 0;
    let trialCount = 0;
    let subCount = 0;
    let partnerCount = 0;
    let multiRoleCount = 0;
    let totalRevenue = 0;

    members.forEach(m => {
      if (m.roles.includes('buyer_paid')) paidCount++;
      if (m.roles.includes('buyer_trial')) trialCount++;
      if (m.roles.includes('subscriber')) subCount++;
      if (m.roles.includes('partner')) partnerCount++;
      if (m.roles.length >= 2) multiRoleCount++;
      totalRevenue += m.totalSpent;
    });

    return {
      total: members.length,
      paidCount,
      trialCount,
      subCount,
      partnerCount,
      multiRoleCount,
      totalRevenue
    };
  }, [members]);

  // Filtering & Search
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      // Tab filter
      if (activeTab === 'buyer_paid' && !m.roles.includes('buyer_paid')) return false;
      if (activeTab === 'buyer_trial' && !m.roles.includes('buyer_trial')) return false;
      if (activeTab === 'subscriber' && !m.roles.includes('subscriber')) return false;
      if (activeTab === 'partner' && !m.roles.includes('partner')) return false;
      if (activeTab === 'multi_role' && m.roles.length < 2) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchEmail = m.email.toLowerCase().includes(q);
        const matchName = m.name.toLowerCase().includes(q);
        const matchCode = m.partnerCode?.toLowerCase().includes(q);
        return matchEmail || matchName || matchCode;
      }
      return true;
    });
  }, [members, activeTab, searchQuery]);

  // Sorting
  const sortedMembers = useMemo(() => {
    const list = [...filteredMembers];
    list.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case 'recent':
          res = new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
          break;
        case 'spent':
          res = b.totalSpent - a.totalSpent;
          break;
        case 'orders':
          res = (b.paidOrdersCount + b.trialOrdersCount) - (a.paidOrdersCount + a.trialOrdersCount);
          break;
        case 'name':
          res = a.name.localeCompare(b.name);
          break;
        case 'email':
          res = a.email.localeCompare(b.email);
          break;
        default:
          res = 0;
      }
      return sortOrder === 'desc' ? res : -res;
    });
    return list;
  }, [filteredMembers, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMembers.slice(start, start + pageSize);
  }, [sortedMembers, currentPage, pageSize]);

  // Actions
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCopyAllEmails = () => {
    if (filteredMembers.length === 0) return;
    const emailsList = filteredMembers.map(m => m.email).join(', ');
    navigator.clipboard.writeText(emailsList);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleExportCSV = () => {
    if (filteredMembers.length === 0) {
      alert("No contacts to export.");
      return;
    }

    const headers = [
      'Email',
      'Full Name',
      'Active Roles',
      'Total Paid Spent (USD)',
      'Paid Orders Count',
      'Trial Downloads Count',
      'Partner Code',
      'Subscriber Status',
      'First Seen',
      'Last Active'
    ];

    const rows = filteredMembers.map(m => [
      `"${m.email}"`,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.roles.join(', ')}"`,
      m.totalSpent.toFixed(2),
      m.paidOrdersCount,
      m.trialOrdersCount,
      m.partnerCode || '',
      m.subscriberStatus || '',
      m.firstSeen ? new Date(m.firstSeen).toLocaleDateString() : '',
      m.lastActive && m.lastActive !== new Date(0).toISOString() ? new Date(m.lastActive).toLocaleDateString() : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bombastype_audience_directory_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-vintage-ink">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-blackletter tracking-tight">Audience Directory</h1>
            <span className="bg-vintage-ink text-vintage-paper text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 border border-vintage-ink/20">
              Unified Contacts
            </span>
          </div>
          <p className="text-xs text-vintage-ink/70 font-serif italic mt-1">
            Archival register of commercial clients, test trial users, newsletter patrons & affiliate partners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAudienceData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper border border-vintage-ink/20 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleCopyAllEmails}
            disabled={filteredMembers.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-amber-50 hover:bg-vintage-ink hover:text-vintage-paper text-amber-950 border border-amber-300 transition-all cursor-pointer shadow-2xs"
            title="Copy all filtered email addresses to clipboard"
          >
            {copiedAll ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
            <span>{copiedAll ? 'Copied All!' : 'Copy Emails'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredMembers.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-vintage-ink text-vintage-paper hover:bg-vintage-ink/80 border border-vintage-ink transition-all cursor-pointer shadow-2xs"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-4 bg-vintage-paper border border-vintage-ink/20 shadow-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-vintage-ink/60 block">Total Audience</span>
          <div className="text-2xl font-serif font-bold text-vintage-ink mt-0.5">{metrics.total}</div>
          <p className="text-[10px] font-sans text-vintage-ink/60 uppercase mt-0.5">Deduplicated Ledger</p>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-300/50 shadow-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-900 block">Paid Buyers</span>
          <div className="text-2xl font-serif font-bold text-emerald-950 mt-0.5">{metrics.paidCount}</div>
          <p className="text-[10px] font-sans text-emerald-800 uppercase mt-0.5">${metrics.totalRevenue.toFixed(0)} Revenue</p>
        </div>

        <div className="p-4 bg-purple-50/70 border border-purple-300/50 shadow-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-purple-900 block">Trial / Demo</span>
          <div className="text-2xl font-serif font-bold text-purple-950 mt-0.5">{metrics.trialCount}</div>
          <p className="text-[10px] font-sans text-purple-800 uppercase mt-0.5">Prospective Buyers</p>
        </div>

        <div className="p-4 bg-sky-50/70 border border-sky-300/50 shadow-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-sky-900 block">Subscribers</span>
          <div className="text-2xl font-serif font-bold text-sky-950 mt-0.5">{metrics.subCount}</div>
          <p className="text-[10px] font-sans text-sky-800 uppercase mt-0.5">Newsletter Patrons</p>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-300/50 shadow-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-amber-900 block">Partners</span>
          <div className="text-2xl font-serif font-bold text-amber-950 mt-0.5">{metrics.partnerCount}</div>
          <p className="text-[10px] font-sans text-amber-800 uppercase mt-0.5">Affiliate Advocates</p>
        </div>

        <div className="p-4 bg-amber-100/60 border border-amber-300 shadow-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-amber-950 block">Multi-Role</span>
          <div className="text-2xl font-serif font-bold text-amber-950 mt-0.5">{metrics.multiRoleCount}</div>
          <p className="text-[10px] font-sans text-amber-900 uppercase mt-0.5">2+ Active Labels</p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 border-b border-vintage-ink/20 pb-3">
        <button
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            activeTab === 'all' 
              ? 'bg-vintage-ink text-vintage-paper border-vintage-ink shadow-2xs' 
              : 'bg-vintage-paper text-vintage-ink border-vintage-ink/20 hover:bg-vintage-ink/5'
          }`}
        >
          All Contacts ({metrics.total})
        </button>

        <button
          onClick={() => { setActiveTab('buyer_paid'); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'buyer_paid' 
              ? 'bg-emerald-800 text-white border-emerald-900 shadow-2xs' 
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Paid Buyers ({metrics.paidCount})
        </button>

        <button
          onClick={() => { setActiveTab('buyer_trial'); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'buyer_trial' 
              ? 'bg-purple-800 text-white border-purple-900 shadow-2xs' 
              : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          Trial Users ({metrics.trialCount})
        </button>

        <button
          onClick={() => { setActiveTab('subscriber'); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'subscriber' 
              ? 'bg-sky-800 text-white border-sky-900 shadow-2xs' 
              : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          Subscribers ({metrics.subCount})
        </button>

        <button
          onClick={() => { setActiveTab('partner'); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'partner' 
              ? 'bg-amber-800 text-white border-amber-900 shadow-2xs' 
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Partners ({metrics.partnerCount})
        </button>

        <button
          onClick={() => { setActiveTab('multi_role'); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'multi_role' 
              ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-2xs' 
              : 'bg-amber-100/50 text-amber-950 border-amber-300 hover:bg-amber-200/50'
          }`}
        >
          <Layers size={12} />
          Multi-Role ({metrics.multiRoleCount})
        </button>
      </div>

      {/* SEARCH AND CONTROLS BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-vintage-paper p-3 border border-vintage-ink/20 shadow-xs">
        <div className="relative flex-grow max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vintage-ink/40" />
          <input
            type="text"
            placeholder="Search email, client name, or partner code..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-vintage-ink/20 font-serif focus:outline-hidden focus:border-vintage-ink bg-white/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-sans font-bold uppercase text-vintage-ink/40 hover:text-vintage-ink"
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-sans font-medium">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-vintage-ink/60 font-bold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-vintage-ink/20 px-2 py-1 bg-white/80 font-bold uppercase text-xs cursor-pointer focus:outline-hidden"
            >
              <option value="recent">Recent Activity</option>
              <option value="spent">Highest Spent ($)</option>
              <option value="orders">Total Orders</option>
              <option value="email">Email (A-Z)</option>
              <option value="name">Name (A-Z)</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-1 border border-vintage-ink/20 bg-white/80 hover:bg-vintage-ink hover:text-vintage-paper transition-all cursor-pointer shadow-2xs"
              title="Toggle Sort Direction"
            >
              <ArrowUpDown size={13} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-vintage-ink/60 font-bold">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-vintage-ink/20 px-2 py-1 bg-white/80 font-bold uppercase text-xs cursor-pointer focus:outline-hidden"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="border border-vintage-ink/20 bg-vintage-paper shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse font-serif">
          <thead>
            <tr className="bg-vintage-ink/5 text-vintage-ink text-[10px] font-sans font-bold uppercase tracking-wider border-b border-vintage-ink/20">
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3">Client Identity</th>
              <th className="p-3">Active Labels / Roles</th>
              <th className="p-3 text-right">Orders / Downloads</th>
              <th className="p-3 text-right">Total Spent</th>
              <th className="p-3">Partner / Subscription</th>
              <th className="p-3 text-right">Activity Ledger</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vintage-ink/10 text-xs">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-vintage-ink/60">
                  <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-vintage-ink" />
                  <span className="font-sans font-bold uppercase tracking-wider text-xs">Loading Audience Directory...</span>
                </td>
              </tr>
            ) : paginatedMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-vintage-ink/60 font-serif italic text-sm">
                  No audience records match the selected filtering parameters.
                </td>
              </tr>
            ) : (
              paginatedMembers.map((member, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={member.email} className="hover:bg-vintage-ink/5 transition-colors">
                    <td className="p-3 text-center font-mono text-[11px] text-vintage-ink/40">
                      {globalIndex}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-sm text-vintage-ink flex items-center gap-1.5">
                        <span>{member.name}</span>
                      </div>
                      <div className="text-vintage-ink/60 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                        <span>{member.email}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {member.roles.includes('buyer_paid') && (
                          <span className="text-[9px] font-sans font-bold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300">
                            BUYER: PAID
                          </span>
                        )}
                        {member.roles.includes('buyer_trial') && (
                          <span className="text-[9px] font-sans font-bold uppercase px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-300">
                            BUYER: TRIAL
                          </span>
                        )}
                        {member.roles.includes('subscriber') && (
                          <span className="text-[9px] font-sans font-bold uppercase px-2 py-0.5 bg-sky-50 text-sky-900 border border-sky-300">
                            SUBSCRIBER
                          </span>
                        )}
                        {member.roles.includes('partner') && (
                          <span className="text-[9px] font-sans font-bold uppercase px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300">
                            PARTNER
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="font-mono font-bold text-vintage-ink">
                        {member.paidOrdersCount + member.trialOrdersCount} total
                      </div>
                      <div className="text-[10px] text-vintage-ink/60 font-sans mt-0.5">
                        {member.paidOrdersCount} paid · {member.trialOrdersCount} demo
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className={`font-mono font-bold text-sm ${member.totalSpent > 0 ? 'text-emerald-800' : 'text-vintage-ink/40'}`}>
                        ${member.totalSpent.toFixed(2)}
                      </div>
                      <div className="text-[9px] font-sans text-vintage-ink/50 uppercase">
                        {member.totalSpent > 0 ? 'Net Store Sales' : 'Demo Assets'}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-0.5 text-[11px]">
                        {member.partnerCode && (
                          <div className="flex items-center gap-1 text-amber-950 font-sans">
                            <Share2 size={11} className="text-amber-700" />
                            <span>Code: <code className="bg-amber-100/70 px-1 py-0.2 border border-amber-300 font-mono text-[10px]">{member.partnerCode}</code></span>
                          </div>
                        )}
                        {member.subscriberStatus && (
                          <div className="flex items-center gap-1 text-sky-950 font-sans">
                            <Mail size={11} className="text-sky-700" />
                            <span className="capitalize">Newsletter: {member.subscriberStatus}</span>
                          </div>
                        )}
                        {!member.partnerCode && !member.subscriberStatus && (
                          <span className="text-vintage-ink/30 text-[10px] font-sans uppercase">—</span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-right font-mono text-[11px] text-vintage-ink/70">
                      {member.lastActive && member.lastActive !== new Date(0).toISOString() ? (
                        <div>
                          <div>{new Date(member.lastActive).toLocaleDateString()}</div>
                          <div className="text-[9px] text-vintage-ink/40">
                            First: {new Date(member.firstSeen).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleCopyEmail(member.email)}
                        className="px-2 py-1 text-[10px] font-sans font-bold uppercase bg-white hover:bg-vintage-ink hover:text-vintage-paper border border-vintage-ink/20 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                        title="Copy email to clipboard"
                      >
                        {copiedEmail === member.email ? (
                          <>
                            <Check size={11} className="text-emerald-700" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {!loading && sortedMembers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans font-medium pt-2">
          <div className="text-vintage-ink/70 uppercase text-[11px]">
            Showing <span className="font-bold text-vintage-ink">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-vintage-ink">{Math.min(currentPage * pageSize, sortedMembers.length)}</span> of{' '}
            <span className="font-bold text-vintage-ink">{sortedMembers.length}</span> records
            {filteredMembers.length !== members.length && ` (filtered from ${members.length})`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-vintage-ink/20 bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-30 disabled:pointer-events-none uppercase text-[10px] font-bold transition-all cursor-pointer"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-vintage-ink/20 bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>

            <span className="px-3 py-1 bg-vintage-ink text-vintage-paper font-mono text-xs border border-vintage-ink">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border border-vintage-ink/20 bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border border-vintage-ink/20 bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-30 disabled:pointer-events-none uppercase text-[10px] font-bold transition-all cursor-pointer"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceDirectory;
