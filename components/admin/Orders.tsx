/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ChevronLeft, ChevronRight, Download, ShoppingBag, FileText, ShieldCheck, Mail } from 'lucide-react';

const formatGasSender = (sender?: string) => {
  if (!sender) return '';
  if (sender.includes('@')) return sender;
  if (sender.includes('AKfycbyy')) return 'bombastype@gmail.com';
  if (sender.includes('AKfycbzH')) return 'bombastypetwo@gmail.com';
  if (sender.includes('AKfycbyv')) return 'bombastypebot@gmail.com';
  return sender;
};

const MASTER_TIER_LABELS: Record<string, Record<string, string>> = {
  desktop: { solo: '1 USER ONLY', team: 'UP TO 30 USER', studio: 'UP TO 100 USER', enterprise: 'UNLIMITED USER' },
  social_web: { small_50k: '50K VIEWS', medium_500k: '500K VIEWS', large_5m: '2M VIEWS', enterprise_unlimited: 'UNLIMITED VIEWS' },
  logo_branding: { personal: 'PERSONAL BRANDING', solo: '1-10 EMPLOYEES', team: '11-50 EMPLOYEES', studio: '51-250 EMPLOYEES', enterprise: '251+ EMPLOYEES' },
  app: { solo: '1 TITLE', team: 'UP TO 10 TITLES', studio: 'UP TO 50 TITLES', enterprise: 'UNLIMITED TITLES' },
  server: { solo: 'SINGLE', studio: 'UP TO 50 SERVERS', enterprise: 'UNLIMITED' },
  broadcast: { solo: 'REGIONAL', studio: 'NATIONAL', enterprise: 'WORLDWIDE' }
};

const TEXT_DB: Record<string, any> = {
  trial: {
    title: "01. PERSONAL USE ONLY (DEMO)",
    grant: "Permitted exclusively for personal, non-commercial use (e.g. educational assignments, portfolio pieces, or non-profit testing).",
    charSet: "The Demo version is a trial asset and contains a limited glyph set.",
    restrictions: "Commercial utilization, business promotion, or revenue-generating activities are strictly prohibited."
  },
  desktop: "DESKTOP / PRINT: Install on workstations to create static visual content (PNG, JPG, PDF) for digital and print media.",
  social_web: "DIGITAL MEDIA (SOCIAL/WEB): Specifically for digital platforms, including website embedding and social media advertising.",
  logo_branding: "LOGO & BRANDING: Utilize the font as a core element of a visual identity system (Logos, Wordmarks).",
  app: "APP / GAME / EBOOK: Embed font software into mobile applications, software, games, or electronic publications.",
  broadcast: "BROADCAST: For motion graphics, television, cinema, streaming, and video advertisements.",
  server: "SERVER: Install on a server to facilitate automated end-user customization (Web-to-Print).",
  corporate: "CORPORATE ALL-IN-ONE: A comprehensive license covering all categories for an entire organization with no limits on seats or impressions."
};

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}

function calculateCRC32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function deriveLicenseKey(transactionId?: string): string {
  if (!transactionId) return '';
  const hash = calculateCRC32(new TextEncoder().encode(`${transactionId}-BOMBASTYPE`))
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');
  return `BT-LIC-${hash}`;
}

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [downloadingTx, setDownloadingTx] = useState<string | null>(null);
  const [downloadingZipTx, setDownloadingZipTx] = useState<string | null>(null);
  const [resendingTx, setResendingTx] = useState<string | null>(null);
  const itemsPerPage = 20;

  const [isExporting, setIsExporting] = useState(false);
  const [isExportingEmails, setIsExportingEmails] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let query = supabase.from('admin_order_view').select('*');
      
      if (searchTerm) {
        const cleanTerm = searchTerm.trim().toUpperCase();
        const isLicenseKeySearch = cleanTerm.includes('BT-LIC-') || cleanTerm.includes('BT-') || /^[A-F0-9]{8}$/i.test(cleanTerm);

        if (isLicenseKeySearch) {
          const { data: allTxs } = await supabase.from('admin_order_view').select('transaction_id').limit(2000);
          const matchedTx = allTxs?.find(row => {
            if (!row.transaction_id) return false;
            const lk = deriveLicenseKey(row.transaction_id);
            return lk.includes(cleanTerm) || cleanTerm.includes(lk) || lk.replace(/^BT-LIC-/, '').includes(cleanTerm);
          })?.transaction_id;

          if (matchedTx) {
            query = query.eq('transaction_id', matchedTx);
          } else {
            query = query.or(`transaction_id.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,font_name.ilike.%${searchTerm}%,tier.ilike.%${searchTerm}%,metadata->>license_key.ilike.%${searchTerm}%`);
          }
        } else {
          query = query.or(`transaction_id.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,font_name.ilike.%${searchTerm}%,tier.ilike.%${searchTerm}%,metadata->>license_key.ilike.%${searchTerm}%`);
        }
      }

      const { data, error } = await query.order('download_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return alert('No archival data found to export.');

      const headers = ['Date', 'Order_ID', 'Email', 'Typeface', 'Type', 'Price', 'Tier', 'Usages'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => [
          new Date(row.download_date).toLocaleDateString(),
          row.transaction_id,
          row.buyer_email || 'N/A',
          `"${row.font_name}"`,
          row.download_type,
          row.metadata?.price_at_purchase || 0,
          row.tier,
          `"${(row.usages || []).join(' | ')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `STUDIO_SALES_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("EXPORT_ERROR:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportEmails = async () => {
    setIsExportingEmails(true);
    try {
      const fetchColumn = async (table: string, col: string) => {
        const results: string[] = [];
        let from = 0;
        const step = 1000;
        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select(col)
            .range(from, from + step - 1);
          if (error) {
            console.warn(`Query on ${table}.${col} returned:`, error);
            break;
          }
          if (!data || data.length === 0) break;
          for (const row of data as any[]) {
            const raw = row[col];
            if (raw && typeof raw === 'string') {
              const clean = raw.trim().toLowerCase();
              if (clean.includes('@')) {
                results.push(clean);
              }
            }
          }
          if (data.length < step) break;
          from += step;
        }
        return results;
      };

      const [orderBuyerEmails, directBuyerEmails, subEmails] = await Promise.all([
        fetchColumn('admin_order_view', 'buyer_email'),
        fetchColumn('fontbuyer', 'email'),
        fetchColumn('fontsubscribers', 'email')
      ]);

      const subSet = new Set<string>(subEmails);
      const buyerSet = new Set<string>([...orderBuyerEmails, ...directBuyerEmails]);

      if (buyerSet.size === 0 && subSet.size === 0) {
        alert('No patron or subscriber emails found to export.');
        return;
      }

      // If a buyer also subscribed, place them into subscriber list and exclude from buyer list
      const finalBuyers = Array.from(buyerSet).filter(email => !subSet.has(email)).sort();
      const finalSubscribers = Array.from(subSet).sort();

      const maxRows = Math.max(finalBuyers.length, finalSubscribers.length);
      const csvRows = ['Email Buyer,Email Subscriber'];
      for (let i = 0; i < maxRows; i++) {
        const b = finalBuyers[i] || '';
        const s = finalSubscribers[i] || '';
        csvRows.push(`${b},${s}`);
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `AUDIENCE_EMAILS_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("EXPORT_EMAILS_ERROR:", err);
      alert("Failed to export emails: " + (err.message || 'Unknown error'));
    } finally {
      setIsExportingEmails(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    try {
      let query = supabase.from('admin_order_view').select('*', { count: 'exact' });

      if (searchTerm) {
        const cleanTerm = searchTerm.trim().toUpperCase();
        const isLicenseKeySearch = cleanTerm.includes('BT-LIC-') || cleanTerm.includes('BT-') || /^[A-F0-9]{8}$/i.test(cleanTerm);

        if (isLicenseKeySearch) {
          const { data: allTxs } = await supabase.from('admin_order_view').select('transaction_id').limit(2000);
          const matchedTx = allTxs?.find(row => {
            if (!row.transaction_id) return false;
            const lk = deriveLicenseKey(row.transaction_id);
            return lk.includes(cleanTerm) || cleanTerm.includes(lk) || lk.replace(/^BT-LIC-/, '').includes(cleanTerm);
          })?.transaction_id;

          if (matchedTx) {
            query = query.eq('transaction_id', matchedTx);
          } else {
            query = query.or(`transaction_id.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,font_name.ilike.%${searchTerm}%,tier.ilike.%${searchTerm}%,metadata->>license_key.ilike.%${searchTerm}%`);
          }
        } else {
          query = query.or(`transaction_id.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,font_name.ilike.%${searchTerm}%,tier.ilike.%${searchTerm}%,metadata->>license_key.ilike.%${searchTerm}%`);
        }
      }

      const { data, error, count } = await query
        .order('download_date', { ascending: false })
        .range(from, to);

      if (error) {
        console.error("SUPABASE_QUERY_ERROR:", error.message);
        setOrders([]);
        setTotalCount(0);
      } else {
        const formattedData = data?.map(item => ({
          ...item,
          fontbuyer: { email: item.buyer_email },
          fonts: { name: item.font_name }
        }));
        setOrders(formattedData || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error("SYSTEM_FETCH_ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDownloadPackageZip = async (order: any) => {
    setDownloadingZipTx(order.transaction_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return alert("Session expired. Please login again.");

      // Find target font file
      let targetFile = order.font_file;
      if (!targetFile && order.font_id) {
        const { data: fontRow } = await supabase
          .from('fonts')
          .select('font_files, trial_file_url')
          .eq('id', order.font_id)
          .maybeSingle();

        if (fontRow) {
          const files = Array.isArray(fontRow.font_files) && fontRow.font_files.length > 0
            ? fontRow.font_files
            : (fontRow.trial_file_url ? [fontRow.trial_file_url] : []);
          targetFile = files[0];
        }
      }

      if (!targetFile && order.font_name) {
        const { data: fontRow } = await supabase
          .from('fonts')
          .select('font_files, trial_file_url')
          .ilike('name', order.font_name)
          .maybeSingle();

        if (fontRow) {
          const files = Array.isArray(fontRow.font_files) && fontRow.font_files.length > 0
            ? fontRow.font_files
            : (fontRow.trial_file_url ? [fontRow.trial_file_url] : []);
          targetFile = files[0];
        }
      }

      if (!targetFile) {
        return alert("Font files not found for this order.");
      }

      const downloadType = order.download_type || 'commercial';
      const res = await fetch(`/api/download-zip?file=${encodeURIComponent(targetFile)}&order=${encodeURIComponent(order.transaction_id)}&type=${downloadType}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to generate package zip.`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = res.headers.get('Content-Disposition');
      let downloadName = `${(order.font_name || 'Font').replace(/\s+/g, '_')}_${order.transaction_id?.slice(0, 10)}.zip`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        downloadName = contentDisposition.split('filename=')[1].split(';')[0].replace(/["']/g, '').trim();
      }

      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      console.error("ZIP_DOWNLOAD_ERROR:", err);
      alert("Download error: " + err.message);
    } finally {
      setDownloadingZipTx(null);
    }
  };

  const handleDownloadLicenseTxt = async (order: any) => {
    setDownloadingTx(order.transaction_id);
    try {
      let buyerName = 'N/A';
      let buyerAddress = 'N/A';
      let buyerEmail = order.fontbuyer?.email || order.buyer_email || 'N/A';

      // 1. Ambil detail fontbuyer untuk mengisi LICENSE.txt resmi
      const { data: historyRows } = await supabase
        .from('font_history')
        .select(`
          fontbuyer (
            full_name,
            address,
            email
          )
        `)
        .eq('transaction_id', order.transaction_id)
        .limit(1);

      if (historyRows && historyRows.length > 0 && historyRows[0].fontbuyer) {
        const buyer = historyRows[0].fontbuyer as any;
        if (buyer.full_name) buyerName = buyer.full_name;
        if (buyer.address) buyerAddress = buyer.address;
        if (buyer.email) buyerEmail = buyer.email;
      } else if (buyerEmail && buyerEmail !== 'N/A') {
        const { data: directBuyer } = await supabase
          .from('fontbuyer')
          .select('full_name, address, email')
          .eq('email', buyerEmail)
          .maybeSingle();

        if (directBuyer) {
          if (directBuyer.full_name) buyerName = directBuyer.full_name;
          if (directBuyer.address) buyerAddress = directBuyer.address;
          if (directBuyer.email) buyerEmail = directBuyer.email;
        }
      }

      const isTrial = (order.download_type || '').toLowerCase() === 'trial' || (order.download_type || '').toLowerCase() === 'demo';
      const rawTier = (order.tier || 'solo').toLowerCase();
      const usages: string[] = isTrial ? ['trial'] : (order.usages && order.usages.length > 0 ? order.usages : ['desktop']);
      const issueDate = order.download_date ? new Date(order.download_date).toLocaleDateString() : new Date().toLocaleDateString();
      const fontDisplayName = order.fonts?.name || order.font_name || 'Bombastype Font';

      // 2. Susun isi LICENSE.txt sesuai protokol resmi Bombastype
      let licenseBody = `BOMBASTYPE — OFFICIAL LICENSE CERTIFICATE\n`;
      licenseBody += `========================================================================\n`;
      licenseBody += `ORDER ID       : ${order.transaction_id || 'N/A'} (USE AS PASSWORD RESETTER)\n`;
      licenseBody += `LICENSE HOLDER : ${buyerEmail} (USERNAME)\n`;
      licenseBody += `LICENSEE NAME  : ${buyerName}\n`;
      licenseBody += `ADDRESS        : ${buyerAddress}\n`;
      licenseBody += `ISSUE DATE     : ${issueDate}\n`;
      licenseBody += `ASSET NAME     : ${fontDisplayName}\n`;
      licenseBody += `------------------------------------------------------------------------\n\n`;

      licenseBody += `LICENSED USAGE TERMS:\n\n`;
      usages.forEach((u: string, i: number) => {
        if (isTrial) {
          licenseBody += `${i + 1}. ${TEXT_DB.trial.title}:\n`;
          licenseBody += `${TEXT_DB.trial.grant}\n\n`;
          licenseBody += `CHARACTER SET: ${TEXT_DB.trial.charSet}\n\n`;
          licenseBody += `RESTRICTIONS: ${TEXT_DB.trial.restrictions}\n\n`;
        } else {
          const specificLabel = MASTER_TIER_LABELS[u]?.[rawTier] || rawTier.toUpperCase();
          const title = `${u.replace('_', ' & ').toUpperCase()} LICENSE: ( ${specificLabel} )`;
          licenseBody += `${i + 1}. ${title}\n`;
          licenseBody += `${TEXT_DB[u] || TEXT_DB.desktop}\n\n`;
        }
      });

      licenseBody += `GENERAL RULES:\n`;
      licenseBody += `1. This license is non-transferable and belongs strictly to the buyer.\n`;
      licenseBody += `2. You may not sell, rent, sublicense, or redistribute the font files.\n`;
      licenseBody += `3. The font software remains the sole property of Bombastype.\n\n`;

      if (!isTrial) {
        licenseBody += `FONT CANVAS ACCESS (USER VAULT PERKS):\n`;
        licenseBody += `Your commercial license unlocks VIP access to our Font Canvas design suite:\n`;
        licenseBody += `• Portal Link : https://canvas.bombastype.com\n`;
        licenseBody += `• Username    : ${buyerEmail}\n`;
        licenseBody += `• Order ID    : ${order.transaction_id || 'N/A'} (Use as Password)\n`;
        licenseBody += `PERKS INCLUDED:\n`;
        licenseBody += `- Instant Unlock : All fonts you purchased are automatically unlocked in Canvas.\n`;
        licenseBody += `- Free Extras    : Enjoy free access to all font extras, ornaments & exclusive dingbats catalog-wide.\n`;
        licenseBody += `- Pro Features   : All creator features unlocked (Export, Save, Import & more).\n\n`;
      }

      licenseBody += `FULL DIGITAL RECEIPT:\n${window.location.origin}/user/receipt/${order.transaction_id} *LOGIN FIRST TO ACCESS*\n`;

      // 3. Trigger download .txt
      const blob = new Blob([licenseBody.trim()], { type: 'text/plain;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanFont = fontDisplayName.replace(/\s+/g, '_');
      link.download = `LICENSE_${cleanFont}_${order.transaction_id?.slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error("LICENSE_DOWNLOAD_ERROR:", err);
      alert("Failed to generate license .txt: " + err.message);
    } finally {
      setDownloadingTx(null);
    }
  };

  const handleResendOrderEmail = async (order: any) => {
    const targetEmail = order.fontbuyer?.email;
    if (!targetEmail) {
      return alert("Buyer email is missing for this order.");
    }

    if (!window.confirm(`Send / resend order delivery email to ${targetEmail} for Order #${order.transaction_id}?`)) {
      return;
    }

    setResendingTx(order.transaction_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return alert("Session expired. Please login again.");

      const res = await fetch('/api/admin/resend-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ orderId: order.transaction_id })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

      // Optimistically update order metadata in local state
      setOrders(prev => prev.map(o => {
        if (o.transaction_id === order.transaction_id) {
          return {
            ...o,
            metadata: {
              ...o.metadata,
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              email_sent_by: json.sender
            }
          };
        }
        return o;
      }));

      alert(`Delivery email dispatched successfully via ${formatGasSender(json.sender)}!`);
    } catch (err: any) {
      console.error("RESEND_EMAIL_ERROR:", err);
      alert("Failed to send email: " + err.message);
    } finally {
      setResendingTx(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-6">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Sales Folio</h2>
        <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic flex items-center gap-2">
          <ShoppingBag size={12} /> Registry of Acquisitions & Licensing
        </p>
      </div>

      {/* SEARCH & EXPORT CONTROLS - Above Table */}
      <div className="flex flex-col md:flex-row justify-end gap-4 mb-6">
        <button 
          onClick={handleExportCSV}
          disabled={isExporting || loading}
          className="vintage-btn btn-reverse px-6 py-2 text-[10px] flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Download size={14} />
          {isExporting ? 'EXPORTING...' : 'CSV'}
        </button>

        <button 
          onClick={handleExportEmails}
          disabled={isExportingEmails || loading}
          className="vintage-btn btn-reverse px-6 py-2 text-[10px] flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Mail size={14} />
          {isExportingEmails ? 'EXPORTING...' : 'EXPORT EMAILS'}
        </button>

        <form onSubmit={handleSearchSubmit} className="relative">
          <input 
            type="text" 
            placeholder="SEARCH ID/EMAIL/FONT/LICENSE..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-transparent border-b border-vintage-ink/30 px-10 py-2 text-[10px] font-bold tracking-widest outline-none focus:border-vintage-ink transition-all w-full md:w-80 placeholder:opacity-30"
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-vintage-ink/40" size={16} />
          {searchInput && (
            <button 
              type="button" 
              onClick={() => { setSearchInput(''); setSearchTerm(''); }} 
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[8px] font-bold tracking-widest hover:text-red-600 uppercase"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {searchTerm && searchTerm.toUpperCase().includes('SPEC-W01') && (
        <div className="mb-4 p-4 border border-amber-600/40 bg-amber-500/10 text-[10px] tracking-wider uppercase font-bold text-amber-900 flex items-center justify-between">
          <span>⚠️ {searchTerm.toUpperCase()}: Web Specimen Tag (TypeTester Engine Asset). This build tag is generated for live online testing and is not associated with any commercial purchase order.</span>
        </div>
      )}

      {/* ORDERS DATA TABLE */}
      <div className="overflow-x-auto border border-vintage-ink bg-white/40">
        <table className="w-full text-left border-collapse min-w-250">
          <thead>
            <tr className="bg-vintage-ink/5 border-b border-vintage-ink text-[10px] font-bold tracking-widest text-vintage-ink/60 uppercase">
              <th className="p-5">Registry Date</th>
              <th className="p-5">Order & License Ref</th>
              <th className="p-5">Client Identity</th>
              <th className="p-5">Typeface</th>
              <th className="p-5 text-center">Valuation</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center">Email Delivery</th>
              <th className="p-5 text-center">License Certificate</th>
              <th className="p-5">Tier & Metrics</th>
              <th className="p-5">License Provisions</th>
            </tr>
          </thead>
          <tbody className="text-[11px] font-serif">
            {loading ? (
              <tr><td colSpan={10} className="p-20 text-center animate-pulse italic opacity-40">Consulting Archive Ledger...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={10} className="p-20 text-center opacity-40 italic">No records found matching "{searchTerm}"</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id} className="border-b border-vintage-ink/10 hover:bg-vintage-ink/2 transition-colors">
                <td className="p-5 font-bold italic">{new Date(order.download_date).toLocaleDateString()}</td>
                <td className="p-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[9px] opacity-60">#{order.transaction_id.slice(0, 12)}</span>
                    <span className="font-mono text-[8px] font-bold text-vintage-accent tracking-tight" title="Stealth Font License Key">
                      {deriveLicenseKey(order.transaction_id)}
                    </span>
                  </div>
                </td>
                <td className="p-5 lowercase text-vintage-ink">{order.fontbuyer?.email || 'N/A'}</td>
                <td className="p-5 font-display text-lg tracking-wide text-vintage-ink">{order.fonts?.name || 'Unknown'}</td>
                <td className="p-5 text-center font-bold">${order.metadata?.price_at_purchase ?? (order.download_type === 'trial' ? '0' : '—')}</td>
                <td className="p-5 text-center">
                  <span className={`px-3 py-1 text-[8px] font-bold border tracking-widest uppercase ${order.download_type === 'trial' ? 'bg-vintage-paper border-vintage-ink/20 text-vintage-ink/60' : 'bg-vintage-ink text-vintage-paper border-vintage-ink'}`}>
                    {order.download_type || 'N/A'}
                  </span>
                </td>
                <td className="p-5 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className={`px-2.5 py-0.5 text-[8px] font-bold border tracking-widest uppercase ${
                      order.metadata?.email_sent
                        ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                        : 'bg-vintage-paper text-vintage-ink/60 border-vintage-ink/20'
                    }`}>
                      {order.metadata?.email_sent ? 'SENT' : 'PENDING'}
                    </span>
                    {order.metadata?.email_sent_by && (() => {
                      const cleanSender = formatGasSender(order.metadata.email_sent_by);
                      return (
                        <span 
                          className="text-[8px] font-mono lowercase text-vintage-ink/60 max-w-[130px] truncate"
                          title={cleanSender}
                        >
                          {cleanSender}
                        </span>
                      );
                    })()}
                    <button
                      onClick={() => handleResendOrderEmail(order)}
                      disabled={resendingTx === order.transaction_id || order.download_type === 'trial'}
                      title="Dispatch / Resend order email"
                      className="mt-1 admin-order-action-btn !text-[8px] !px-2 !py-0.5"
                    >
                      <Mail size={10} />
                      <span>{resendingTx === order.transaction_id ? 'SENDING...' : (order.metadata?.email_sent ? 'RESEND' : 'SEND')}</span>
                    </button>
                  </div>
                </td>
                <td className="p-5 text-center">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <button 
                      onClick={() => handleDownloadPackageZip(order)}
                      disabled={downloadingZipTx === order.transaction_id}
                      title="Download Buyer Package (.zip)"
                      className="admin-order-action-btn"
                    >
                      <Download size={12} />
                      <span>{downloadingZipTx === order.transaction_id ? '...' : '.ZIP'}</span>
                    </button>
                    <button 
                      onClick={() => handleDownloadLicenseTxt(order)}
                      disabled={downloadingTx === order.transaction_id}
                      title="Download License (.txt)"
                      className="admin-order-action-btn"
                    >
                      <FileText size={12} />
                      <span>{downloadingTx === order.transaction_id ? '...' : '.TXT'}</span>
                    </button>
                    <a 
                      href={`/user/receipt/${order.transaction_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Web License Certificate"
                      className="admin-order-action-btn"
                    >
                      <ShieldCheck size={12} />
                      <span>WEB</span>
                    </a>
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{order.tier || 'Standard'}</span>
                    {order.metadata?.mpv && <span className="text-[8px] font-bold italic text-vintage-accent uppercase tracking-tighter">{order.metadata.mpv} MPV Limit</span>}
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex flex-wrap gap-1.5">
                    {order.usages?.map((u: string) => (
                      <span key={u} className="text-[8px] bg-vintage-ink/5 border border-vintage-ink/10 px-2 py-0.5 font-bold uppercase tracking-tighter italic opacity-70">
                        {u.replace('_', ' ')}
                      </span>
                    )) || <span className="text-[9px] opacity-20 italic">None</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOLIO */}
      {totalPages > 1 && !loading && (
        <div className="flex justify-center items-center gap-6 mt-10">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)} 
            className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-vintage-ink/60">
            Folio {currentPage} <span className="mx-2 opacity-30">/</span> {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)} 
            className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-20 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Orders;