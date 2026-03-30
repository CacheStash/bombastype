/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ChevronLeft, ChevronRight, Download, ShoppingBag, FileText } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let query = supabase.from('admin_order_view').select('*');
      
      if (searchTerm) {
        query = query.or(`transaction_id.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,font_name.ilike.%${searchTerm}%,tier.ilike.%${searchTerm}%`);
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
        query = query.or(`transaction_id.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,font_name.ilike.%${searchTerm}%,tier.ilike.%${searchTerm}%`);
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

  return (
    <div className="space-y-12 pb-20">
      {/* HEADER & SEARCH CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-vintage-ink pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Sales Folio</h2>
          <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic flex items-center gap-2">
            <ShoppingBag size={12} /> Registry of Acquisitions & Licensing
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <button 
            onClick={handleExportCSV}
            disabled={isExporting || loading}
            className="vintage-btn btn-reverse px-8 py-3 text-[10px] flex items-center gap-2"
          >
            <Download size={14} />
            {isExporting ? 'EXPORTING...' : 'EXPORT LEDGER'}
          </button>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:flex-none">
            <input 
              type="text" 
              placeholder="SEARCH ID/EMAIL/FONT..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-transparent border-b border-vintage-ink/30 px-10 py-3 text-[10px] font-bold tracking-widest outline-none focus:border-vintage-ink transition-all w-full md:w-72 placeholder:opacity-30"
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
      </div>

      {/* ORDERS DATA TABLE */}
      <div className="overflow-x-auto border border-vintage-ink bg-white/40">
        <table className="w-full text-left border-collapse min-w-250">
          <thead>
            <tr className="bg-vintage-ink/5 border-b border-vintage-ink text-[10px] font-bold tracking-widest text-vintage-ink/60 uppercase">
              <th className="p-5">Registry Date</th>
              <th className="p-5">Identifier</th>
              <th className="p-5">Client Identity</th>
              <th className="p-5">Typeface</th>
              <th className="p-5 text-center">Valuation</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5">Tier & Metrics</th>
              <th className="p-5">License Provisions</th>
            </tr>
          </thead>
          <tbody className="text-[11px] font-serif">
            {loading ? (
              <tr><td colSpan={8} className="p-20 text-center animate-pulse italic opacity-40">Consulting Archive Ledger...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="p-20 text-center opacity-40 italic">No records found matching "{searchTerm}"</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id} className="border-b border-vintage-ink/10 hover:bg-vintage-ink/2 transition-colors">
                <td className="p-5 font-bold italic">{new Date(order.download_date).toLocaleDateString()}</td>
                <td className="p-5 font-mono text-[9px] opacity-60">#{order.transaction_id.slice(0, 12)}</td>
                <td className="p-5 lowercase text-vintage-ink">{order.fontbuyer?.email || 'N/A'}</td>
                <td className="p-5 font-display text-lg tracking-wide text-vintage-ink">{order.fonts?.name || 'Unknown'}</td>
                <td className="p-5 text-center font-bold">${order.metadata?.price_at_purchase ?? (order.download_type === 'trial' ? '0' : '—')}</td>
                <td className="p-5 text-center">
                  <span className={`px-3 py-1 text-[8px] font-bold border tracking-widest uppercase ${order.download_type === 'trial' ? 'bg-vintage-paper border-vintage-ink/20 text-vintage-ink/60' : 'bg-vintage-ink text-vintage-paper border-vintage-ink'}`}>
                    {order.download_type || 'N/A'}
                  </span>
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