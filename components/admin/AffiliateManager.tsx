/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Share2, Users, DollarSign, Clock, CheckCircle2, 
  AlertCircle, Download, Check, ShieldCheck, RefreshCw, ExternalLink 
} from 'lucide-react';

const AffiliateManager: React.FC = () => {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingPayout, setProcessingPayout] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: affData }, { data: commData }] = await Promise.all([
        supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
        supabase.from('affiliate_commissions').select('*').order('created_at', { ascending: false })
      ]);
      setAffiliates(affData || []);
      setCommissions(commData || []);
    } catch (err) {
      console.error("Failed to load affiliate data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Financial Metrics Calculation
  const totalGrossSales = commissions.reduce((sum, c) => sum + Number(c.gross_amount || 0), 0);
  const totalPayPalFees = commissions.reduce((sum, c) => sum + Number(c.paypal_inbound_fee || 0), 0);
  const totalNetStore = commissions.reduce((sum, c) => sum + Number(c.net_store_amount || 0), 0);
  
  const affiliateReservedPool = commissions
    .filter(c => c.status === 'pending_clearance' || c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const safeToWithdraw = Math.max(0, totalNetStore - affiliateReservedPool);

  const clearedPayouts = commissions.filter(c => c.status === 'approved');

  // Filter commissions
  const filteredCommissions = commissions.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const handleExportPayoutCSV = () => {
    if (clearedPayouts.length === 0) {
      alert("No cleared payouts available to export at this moment.");
      return;
    }

    // Group payouts by affiliate PayPal email
    const payoutMap = new Map<string, { email: string; amount: number; ids: string[] }>();
    
    clearedPayouts.forEach(c => {
      const aff = affiliates.find(a => a.id === c.affiliate_id);
      const email = aff?.paypal_email || c.buyer_email || 'unknown';
      const existing = payoutMap.get(email) || { email, amount: 0, ids: [] };
      existing.amount += Number(c.commission_amount || 0);
      existing.ids.push(c.id);
      payoutMap.set(email, existing);
    });

    // Generate standard PayPal Mass Payment CSV format: Email, Amount, Currency, Note
    let csvContent = "data:text/csv;charset=utf-8,Email,Amount,Currency,Note\n";
    payoutMap.forEach((entry) => {
      // Deduct standard flat payout fee ($1.00) if amount >= $5.00
      const payoutAmount = Math.max(0, entry.amount - 1.00).toFixed(2);
      csvContent += `${entry.email},${payoutAmount},USD,BombasType Partner Commission Payout\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BombasType_PayPal_Payouts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkCommissionsAsPaid = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`Mark ${ids.length} commission(s) as officially PAID via PayPal?`)) return;

    setProcessingPayout(true);
    try {
      const { error } = await supabase
        .from('affiliate_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      await fetchData();
      alert("Commissions status updated to PAID.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingPayout(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink pb-6">
        <div>
          <span className="text-[10px] font-bold text-vintage-accent uppercase tracking-[0.3em] block">
            Stealth Partner Command
          </span>
          <h2 className="text-3xl font-display">Affiliates & Financial Ledger</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="vintage-btn py-2 px-4 text-[10px] tracking-widest flex items-center gap-2 uppercase"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> REFRESH
          </button>
          <button 
            onClick={handleExportPayoutCSV}
            className="vintage-btn bg-vintage-ink! text-vintage-background! py-2 px-5 text-[10px] tracking-widest flex items-center gap-2 uppercase font-bold"
          >
            <Download size={14} /> EXPORT PAYPAL CSV
          </button>
        </div>
      </div>

      {/* 4 FINANCIAL RECONCILIATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-vintage-ink bg-vintage-background/60 text-left space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Gross Sales Inbound</span>
          <div className="text-2xl font-display font-bold text-vintage-ink">
            ${totalGrossSales.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-vintage-ink/60">Total paid by buyers via PayPal</p>
        </div>

        <div className="p-5 border border-vintage-ink bg-vintage-background/60 text-left space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">PayPal Inbound Fees</span>
          <div className="text-2xl font-display font-bold text-red-900">
            -${totalPayPalFees.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-vintage-ink/60">Payment gateway transaction cost</p>
        </div>

        <div className="p-5 border border-vintage-ink bg-vintage-background/60 text-left space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Affiliate Reserved Pool</span>
          <div className="text-2xl font-display font-bold text-amber-900">
            ${affiliateReservedPool.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-amber-900/80">Pending + cleared partner earnings</p>
        </div>

        <div className="p-5 border-2 border-vintage-accent bg-green-50/50 text-left space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-green-900 block font-sans">
            SAFE TO WITHDRAW (NET PROFIT)
          </span>
          <div className="text-3xl font-display font-bold text-green-900">
            ${safeToWithdraw.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-green-900/70">Safe to sweep to personal bank account</p>
        </div>
      </div>

      {/* AFFILIATE PARTNERS DIRECTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display">Registered Partners ({affiliates.length})</h3>
          <span className="text-[10px] font-mono opacity-60">Clean Vanity Path Active</span>
        </div>

        {affiliates.length === 0 ? (
          <div className="p-8 border border-vintage-ink/20 text-center italic text-xs text-vintage-ink/60 bg-vintage-background/30">
            No affiliates registered yet. Activate a partner code from the /affiliate landing page to test.
          </div>
        ) : (
          <div className="border border-vintage-ink overflow-x-auto bg-vintage-paper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-vintage-ink bg-vintage-background/80 text-[10px] font-bold tracking-widest uppercase">
                  <th className="p-3 border-r border-vintage-ink">Partner Code</th>
                  <th className="p-3 border-r border-vintage-ink">Vanity Path</th>
                  <th className="p-3 border-r border-vintage-ink">PayPal Payout Email</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Commission Rate</th>
                  <th className="p-3 border-r border-vintage-ink text-center">Status</th>
                  <th className="p-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-ink/20 font-mono text-[11px]">
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-vintage-background/40">
                    <td className="p-3 border-r border-vintage-ink/20 font-bold text-vintage-accent">
                      {a.affiliate_code}
                    </td>
                    <td className="p-3 border-r border-vintage-ink/20">
                      <a 
                        href={`/c/${a.affiliate_code}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline flex items-center gap-1 text-vintage-ink"
                      >
                        /c/{a.affiliate_code} <ExternalLink size={10} className="opacity-50" />
                      </a>
                    </td>
                    <td className="p-3 border-r border-vintage-ink/20 font-bold truncate">
                      {a.paypal_email}
                    </td>
                    <td className="p-3 border-r border-vintage-ink/20 text-right">
                      {(Number(a.commission_rate || 0.20) * 100).toFixed(0)}% Net
                    </td>
                    <td className="p-3 border-r border-vintage-ink/20 text-center">
                      <span className="px-2 py-0.5 border border-vintage-ink/30 text-[9px] uppercase font-bold bg-vintage-background">
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 opacity-60">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMMISSIONS & PAYOUTS LEDGER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-display">Attribution & Clearance Ledger ({commissions.length})</h3>
          
          <div className="flex items-center gap-2">
            {['all', 'pending_clearance', 'approved', 'paid'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest border transition-all ${
                  statusFilter === f 
                    ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                    : 'bg-vintage-paper text-vintage-ink/60 border-vintage-ink/20 hover:text-vintage-ink'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredCommissions.length === 0 ? (
          <div className="p-8 border border-vintage-ink/20 text-center italic text-xs text-vintage-ink/60 bg-vintage-background/30">
            No commissions matching the selected filter.
          </div>
        ) : (
          <div className="border border-vintage-ink overflow-x-auto bg-vintage-paper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-vintage-ink bg-vintage-background/80 text-[10px] font-bold tracking-widest uppercase">
                  <th className="p-3 border-r border-vintage-ink">Order ID</th>
                  <th className="p-3 border-r border-vintage-ink">Typeface</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Gross Paid</th>
                  <th className="p-3 border-r border-vintage-ink text-right">PayPal Fee</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Net Store</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Commission</th>
                  <th className="p-3 border-r border-vintage-ink">Clearance Date</th>
                  <th className="p-3 border-r border-vintage-ink text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-ink/20 font-mono text-[11px]">
                {filteredCommissions.map((c) => {
                  const aff = affiliates.find(a => a.id === c.affiliate_id);
                  const isCleared = new Date(c.cleared_at) <= new Date();

                  return (
                    <tr key={c.id} className="hover:bg-vintage-background/40">
                      <td className="p-3 border-r border-vintage-ink/20 font-bold truncate max-w-[120px]">
                        {c.order_id}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 font-sans font-bold">
                        {c.font_name || 'Specimen License'}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right">
                        ${Number(c.gross_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right text-red-900">
                        -${Number(c.paypal_inbound_fee || 0).toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right">
                        ${Number(c.net_store_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900">
                        +${Number(c.commission_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-[10px] opacity-70">
                        {new Date(c.cleared_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-center">
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-bold border ${
                          c.status === 'paid' ? 'bg-green-100 text-green-900 border-green-300' :
                          c.status === 'approved' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                          c.status === 'pending_clearance' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          'bg-red-100 text-red-900 border-red-300'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {c.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkCommissionsAsPaid([c.id])}
                            disabled={processingPayout}
                            className="vintage-btn py-1 px-2.5 text-[9px] tracking-wider uppercase"
                          >
                            Mark Paid
                          </button>
                        )}
                        {c.status === 'paid' && (
                          <span className="text-[10px] text-green-900 font-bold uppercase inline-flex items-center gap-1">
                            <Check size={12} /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AffiliateManager;
