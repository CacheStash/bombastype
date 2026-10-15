/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Share2, Users, DollarSign, Clock, CheckCircle2, 
  AlertCircle, Download, Check, ShieldCheck, RefreshCw, 
  ExternalLink, Calendar, Eye, FileText, ArrowUpRight, 
  Search, X, Filter, ChevronRight, Wallet
} from 'lucide-react';
import { AFFILIATE_MIN_PAYOUT_USD, getNextMonthlyPayoutDate } from '../../utils/affiliateGeo';

interface AffiliateRecord {
  id: string;
  user_id: string;
  affiliate_code: string;
  paypal_email: string;
  commission_rate: number;
  status: string;
  phone_code?: string;
  phone_number?: string;
  country?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  street_address?: string;
  created_at: string;
}

interface CommissionRecord {
  id: string;
  order_id: string;
  affiliate_id: string;
  gross_amount: number;
  paypal_inbound_fee: number;
  net_store_amount: number;
  commission_amount: number;
  commission_rate: number;
  font_name?: string;
  buyer_email?: string;
  cleared_at: string;
  status: 'pending_clearance' | 'approved' | 'paid' | 'reversed';
  paid_at?: string;
  payout_reference?: string;
  created_at: string;
}

interface PayoutRecord {
  id: string;
  affiliate_id: string;
  affiliate_code?: string;
  paypal_email: string;
  amount: number;
  currency: string;
  payout_batch_id: string;
  status: string;
  paid_at: string;
  commission_count: number;
  notes?: string;
}

const AffiliateManager: React.FC = () => {
  const [affiliates, setAffiliates] = useState<AffiliateRecord[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'due_payouts' | 'partners' | 'commissions' | 'history'>('due_payouts');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [inspectedPartner, setInspectedPartner] = useState<AffiliateRecord | null>(null);
  const [payoutModalAffiliate, setPayoutModalAffiliate] = useState<{
    affiliate: AffiliateRecord;
    dueCommissions: CommissionRecord[];
    totalAmount: number;
  } | null>(null);
  const [payoutBatchId, setPayoutBatchId] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const nextPayoutInfo = getNextMonthlyPayoutDate();

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
      
      const loadedAffiliates = affData || [];
      const loadedCommissions = commData || [];
      setAffiliates(loadedAffiliates);
      setCommissions(loadedCommissions);

      // Attempt to load from affiliate_payouts table; if missing/empty, synthesize from paid commissions
      try {
        const { data: payoutData, error: payoutErr } = await supabase
          .from('affiliate_payouts')
          .select('*')
          .order('paid_at', { ascending: false });

        if (!payoutErr && payoutData && payoutData.length > 0) {
          const mappedPayouts = payoutData.map((p: any) => {
            const aff = loadedAffiliates.find(a => a.id === p.affiliate_id);
            const commIds = Array.isArray(p.commission_ids) ? p.commission_ids : [];
            return {
              id: p.id,
              affiliate_id: p.affiliate_id,
              affiliate_code: aff?.affiliate_code || 'PARTNER',
              paypal_email: p.paypal_email || aff?.paypal_email || '—',
              amount: Number(p.amount || 0),
              currency: p.currency || 'USD',
              payout_batch_id: p.payout_batch_id || 'PAYPAL-MASS',
              status: p.status || 'completed',
              paid_at: p.paid_at || p.created_at || new Date().toISOString(),
              commission_count: commIds.length || 1,
              notes: p.notes
            };
          });
          setPayouts(mappedPayouts);
        } else {
          // Synthesize from paid commissions
          synthesizePayoutHistory(loadedCommissions, loadedAffiliates);
        }
      } catch (err) {
        synthesizePayoutHistory(loadedCommissions, loadedAffiliates);
      }
    } catch (err) {
      console.error("Failed to load affiliate data:", err);
    } finally {
      setLoading(false);
    }
  };

  const synthesizePayoutHistory = (allComms: CommissionRecord[], allAffs: AffiliateRecord[]) => {
    const paidComms = allComms.filter(c => c.status === 'paid');
    const groupMap = new Map<string, {
      affiliate_id: string;
      paid_at: string;
      amount: number;
      commIds: string[];
      reference: string;
    }>();

    paidComms.forEach(c => {
      const dateKey = c.paid_at ? c.paid_at.substring(0, 10) : 'settled';
      const key = `${c.affiliate_id}_${dateKey}`;
      const existing = groupMap.get(key) || {
        affiliate_id: c.affiliate_id,
        paid_at: c.paid_at || c.created_at,
        amount: 0,
        commIds: [],
        reference: c.payout_reference || 'PP-DISBURSEMENT'
      };
      existing.amount += Number(c.commission_amount || 0);
      existing.commIds.push(c.id);
      groupMap.set(key, existing);
    });

    const synthList: PayoutRecord[] = [];
    groupMap.forEach((val, k) => {
      const aff = allAffs.find(a => a.id === val.affiliate_id);
      synthList.push({
        id: k,
        affiliate_id: val.affiliate_id,
        affiliate_code: aff?.affiliate_code || 'PARTNER',
        paypal_email: aff?.paypal_email || '—',
        amount: val.amount,
        currency: 'USD',
        payout_batch_id: val.reference,
        status: 'completed',
        paid_at: val.paid_at,
        commission_count: val.commIds.length
      });
    });

    synthList.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    setPayouts(synthList);
  };

  // Financial Metrics Calculation across store
  const totalGrossSales = commissions.reduce((sum, c) => sum + Number(c.gross_amount || 0), 0);
  const totalPayPalFees = commissions.reduce((sum, c) => sum + Number(c.paypal_inbound_fee || 0), 0);
  const totalNetStore = commissions.reduce((sum, c) => sum + Number(c.net_store_amount || 0), 0);
  
  const affiliateReservedPool = commissions
    .filter(c => c.status === 'pending_clearance' || c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const safeToWithdraw = Math.max(0, totalNetStore - affiliateReservedPool);

  // Group due balances by affiliate
  const now = new Date();
  const affiliateDueBalances = affiliates.map(aff => {
    const affComms = commissions.filter(c => c.affiliate_id === aff.id);
    
    // Cleared (due) commissions: status approved or (pending_clearance with cleared_at <= now)
    const dueCommissions = affComms.filter(c => 
      c.status === 'approved' || (c.status === 'pending_clearance' && new Date(c.cleared_at) <= now)
    );
    const dueAmount = dueCommissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    // In holding / warranty (still within 14-day clearance)
    const holdingCommissions = affComms.filter(c => 
      c.status === 'pending_clearance' && new Date(c.cleared_at) > now
    );
    const holdingAmount = holdingCommissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    // Paid out
    const paidAmount = affComms
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    // Lifetime Gross Sales referred by this partner
    const lifetimeReferredGross = affComms.reduce((sum, c) => sum + Number(c.gross_amount || 0), 0);
    const lifetimeTotalEarnings = dueAmount + holdingAmount + paidAmount;

    const isQualified = dueAmount >= AFFILIATE_MIN_PAYOUT_USD;

    return {
      affiliate: aff,
      dueAmount,
      dueCommissions,
      holdingAmount,
      holdingCommissions,
      paidAmount,
      lifetimeReferredGross,
      lifetimeTotalEarnings,
      orderCount: affComms.length,
      isQualified
    };
  });

  const qualifiedPayouts = affiliateDueBalances.filter(item => item.isQualified);
  const accumulatingPayouts = affiliateDueBalances.filter(item => item.dueAmount > 0 && !item.isQualified);
  const holdingOnlyPayouts = affiliateDueBalances.filter(item => item.dueAmount === 0 && item.holdingAmount > 0);

  // Export PayPal Mass Payment CSV for Qualified Affiliates
  const handleExportPayPalCSV = () => {
    if (qualifiedPayouts.length === 0) {
      alert("No affiliates currently meet the $50.00 minimum threshold for batch payout.");
      return;
    }

    // PayPal Mass Payment format: Email, Amount, Currency, Reference, Note
    let csvContent = "data:text/csv;charset=utf-8,Email,Amount,Currency,Custom_ID,Note\n";
    qualifiedPayouts.forEach(item => {
      csvContent += `${item.affiliate.paypal_email},${item.dueAmount.toFixed(2)},USD,${item.affiliate.affiliate_code},BombasType Monthly Partner Disbursement\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BombasType_Monthly_PayPal_Payouts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open payout dialog for an affiliate
  const handleOpenPayoutModal = (item: typeof affiliateDueBalances[0]) => {
    setPayoutModalAffiliate({
      affiliate: item.affiliate,
      dueCommissions: item.dueCommissions,
      totalAmount: item.dueAmount
    });
    setPayoutBatchId(`PP-MONTHLY-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${item.affiliate.affiliate_code}`);
    setPayoutNotes(`Monthly disbursement for ${item.affiliate.affiliate_code} via PayPal.`);
  };

  // Record payout execution
  const handleExecutePayout = async () => {
    if (!payoutModalAffiliate) return;
    const { affiliate, dueCommissions, totalAmount } = payoutModalAffiliate;
    const commissionIds = dueCommissions.map(c => c.id);

    if (commissionIds.length === 0) {
      alert("No commissions to settle.");
      return;
    }

    setIsSubmittingPayout(true);
    const nowIso = new Date().toISOString();
    const batchId = payoutBatchId.trim() || `PP-${Date.now()}`;

    try {
      // 1. Mark commissions as paid
      const { error: commError } = await supabase
        .from('affiliate_commissions')
        .update({ 
          status: 'paid', 
          paid_at: nowIso,
          payout_reference: batchId
        })
        .in('id', commissionIds);

      if (commError) throw commError;

      // 2. Try to insert record into affiliate_payouts table (graceful fallback if table not yet created)
      try {
        await supabase
          .from('affiliate_payouts')
          .insert({
            affiliate_id: affiliate.id,
            payout_batch_id: batchId,
            amount: totalAmount,
            currency: 'USD',
            paypal_email: affiliate.paypal_email,
            status: 'completed',
            commission_ids: commissionIds,
            paid_at: nowIso,
            notes: payoutNotes
          });
      } catch (payoutInsertErr) {
        console.warn("affiliate_payouts table insert bypassed (using synthesis fallback):", payoutInsertErr);
      }

      setPayoutModalAffiliate(null);
      await fetchData();
      alert(`Payout of $${totalAmount.toFixed(2)} USD successfully recorded for ${affiliate.affiliate_code}!`);
    } catch (err: any) {
      alert("Payout failed: " + err.message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Filter commissions for general ledger view
  const filteredCommissions = commissions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = c.order_id?.toLowerCase().includes(q);
      const matchFont = c.font_name?.toLowerCase().includes(q);
      const matchBuyer = c.buyer_email?.toLowerCase().includes(q);
      const aff = affiliates.find(a => a.id === c.affiliate_id);
      const matchCode = aff?.affiliate_code?.toLowerCase().includes(q);
      return matchOrder || matchFont || matchBuyer || matchCode;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-vintage-ink">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink pb-6">
        <div>
          <span className="text-xs font-bold text-vintage-accent uppercase tracking-wider block font-sans">
            Partner Treasury & Payout Ledger
          </span>
          <h2 className="text-3xl font-display text-vintage-ink">Affiliate Command Center</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="vintage-btn py-2.5 px-4 text-xs font-bold tracking-wider flex items-center gap-2 uppercase font-sans"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
          </button>
          <button 
            onClick={handleExportPayPalCSV}
            className="vintage-btn bg-vintage-ink! text-vintage-background! py-2.5 px-5 text-xs tracking-wider flex items-center gap-2 uppercase font-bold font-sans"
          >
            <Download size={15} /> EXPORT QUALIFIED PAYPAL CSV
          </button>
        </div>
      </div>

      {/* 4 CORE FINANCIAL RECONCILIATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border-2 border-vintage-ink bg-vintage-paper text-left space-y-1.5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">Gross Sales Inbound</span>
          <div className="text-2xl font-display font-bold text-vintage-ink">
            ${totalGrossSales.toFixed(2)}
          </div>
          <p className="text-xs text-vintage-ink/80 font-sans">Total paid by buyers via PayPal</p>
        </div>

        <div className="p-5 border-2 border-vintage-ink bg-vintage-paper text-left space-y-1.5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">PayPal Inbound Fees</span>
          <div className="text-2xl font-display font-bold text-red-900">
            -${totalPayPalFees.toFixed(2)}
          </div>
          <p className="text-xs text-vintage-ink/80 font-sans">Payment gateway transaction cost</p>
        </div>

        <div className="p-5 border-2 border-vintage-ink bg-vintage-paper text-left space-y-1.5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block font-sans">Affiliate Reserved Pool</span>
          <div className="text-2xl font-display font-bold text-amber-900">
            ${affiliateReservedPool.toFixed(2)}
          </div>
          <p className="text-xs text-amber-900 font-sans font-medium">Commissions due + in-warranty hold</p>
        </div>

        <div className="p-5 border-2 border-vintage-ink bg-green-50/70 text-left space-y-1.5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-green-950 block font-sans">
            SAFE TO WITHDRAW (NET PROFIT)
          </span>
          <div className="text-3xl font-display font-bold text-green-900">
            ${safeToWithdraw.toFixed(2)}
          </div>
          <p className="text-xs text-green-900 font-sans font-medium">Store profit safe to sweep to bank</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-vintage-ink gap-2">
        <button
          onClick={() => setActiveTab('due_payouts')}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 font-sans ${
            activeTab === 'due_payouts'
              ? 'border-vintage-accent text-vintage-accent bg-vintage-paper shadow-xs font-bold'
              : 'border-transparent text-vintage-ink/75 hover:text-vintage-ink'
          }`}
        >
          <Clock size={15} /> Due & Scheduled Payouts
          {qualifiedPayouts.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-green-700 text-white rounded-full font-mono font-bold">
              {qualifiedPayouts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 font-sans ${
            activeTab === 'partners'
              ? 'border-vintage-accent text-vintage-accent bg-vintage-paper shadow-xs font-bold'
              : 'border-transparent text-vintage-ink/75 hover:text-vintage-ink'
          }`}
        >
          <Users size={15} /> Partner Accounts ({affiliates.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 font-sans ${
            activeTab === 'history'
              ? 'border-vintage-accent text-vintage-accent bg-vintage-paper shadow-xs font-bold'
              : 'border-transparent text-vintage-ink/75 hover:text-vintage-ink'
          }`}
        >
          <CheckCircle2 size={15} /> Settled Payouts ({payouts.length})
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 font-sans ${
            activeTab === 'commissions'
              ? 'border-vintage-accent text-vintage-accent bg-vintage-paper shadow-xs font-bold'
              : 'border-transparent text-vintage-ink/75 hover:text-vintage-ink'
          }`}
        >
          <FileText size={15} /> All Attribution Orders ({commissions.length})
        </button>
      </div>

      {/* TAB 1: DUE & SCHEDULED PAYOUTS */}
      {activeTab === 'due_payouts' && (
        <div className="space-y-6">
          {/* Policy Banner */}
          <div className="p-5 border-2 border-vintage-ink bg-amber-50/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Calendar size={22} className="text-amber-800 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-950 font-sans">
                  Monthly Payout Schedule: 1st of Every Month
                </h4>
                <p className="text-xs text-amber-900 font-sans mt-0.5 leading-relaxed">
                  Next scheduled run on <span className="font-bold underline text-amber-950">{nextPayoutInfo.dateString}</span> ({nextPayoutInfo.daysLeft} days remaining). Minimum threshold is <span className="font-bold text-amber-950">${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD</span> with 14-day clearance. Balances under $50 automatically roll over to the next monthly cycle.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1 bg-amber-200 text-amber-950 border border-amber-400 font-bold uppercase">
                Threshold: $50.00
              </span>
            </div>
          </div>

          {/* SECTION A: QUALIFIED AFFILIATES (>= $50) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                <h3 className="text-base font-display font-bold text-vintage-ink">
                  Qualified for Upcoming Monthly Settlement (Balance &ge; ${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)})
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-vintage-ink/80">{qualifiedPayouts.length} creator(s) ready</span>
            </div>

            {qualifiedPayouts.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-vintage-ink/30 text-center font-medium text-xs sm:text-sm text-vintage-ink/80 bg-vintage-paper">
                No affiliates currently have cleared balances &ge; ${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD. All qualifying earnings under $50 roll over until the threshold is met.
              </div>
            ) : (
              <div className="border-2 border-vintage-ink overflow-x-auto bg-vintage-paper shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-vintage-ink bg-green-100/70 text-xs font-bold tracking-wider uppercase text-green-950 font-sans">
                      <th className="p-3 border-r border-vintage-ink">Partner Code</th>
                      <th className="p-3 border-r border-vintage-ink">PayPal Payout Account</th>
                      <th className="p-3 border-r border-vintage-ink text-right">Cleared Balance (Due)</th>
                      <th className="p-3 border-r border-vintage-ink text-right">In-Warranty Hold</th>
                      <th className="p-3 border-r border-vintage-ink text-center">Orders</th>
                      <th className="p-3 border-r border-vintage-ink text-center">Payout Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/20 font-mono text-xs">
                    {qualifiedPayouts.map(item => (
                      <tr key={item.affiliate.id} className="hover:bg-green-50/50 transition-colors">
                        <td className="p-3 border-r border-vintage-ink/20 font-bold text-vintage-accent font-sans">
                          {item.affiliate.affiliate_code}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 font-bold truncate max-w-[200px] text-vintage-ink">
                          {item.affiliate.paypal_email}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900 text-sm">
                          ${item.dueAmount.toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right text-vintage-ink/80 font-medium">
                          ${item.holdingAmount.toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-center font-bold">
                          {item.dueCommissions.length}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-center">
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-900 border border-green-300 text-[10px] uppercase font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Qualified
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenPayoutModal(item)}
                              className="vintage-btn py-1 px-3 text-[10px] tracking-wider uppercase font-bold bg-green-900! text-white!"
                            >
                              Record Payout
                            </button>
                            <button
                              onClick={() => setInspectedPartner(item.affiliate)}
                              className="p-1 border border-vintage-ink/30 hover:border-vintage-ink text-vintage-ink hover:text-vintage-accent"
                              title="Inspect Financial Ledger"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION B: ACCUMULATING BALANCES (< $50) */}
          <div className="space-y-3 pt-4 border-t border-vintage-ink/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="text-base font-display font-bold text-vintage-ink">
                  Accumulating & Rolling Over (Cleared Balance &lt; ${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)})
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-vintage-ink/80">{accumulatingPayouts.length} creator(s) rolling</span>
            </div>

            {accumulatingPayouts.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-vintage-ink/30 text-center font-medium text-xs sm:text-sm text-vintage-ink/80 bg-vintage-paper">
                No affiliates currently in accumulating status.
              </div>
            ) : (
              <div className="border-2 border-vintage-ink overflow-x-auto bg-vintage-paper shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-vintage-ink bg-vintage-ink/5 text-xs font-bold tracking-wider uppercase font-sans text-vintage-ink">
                      <th className="p-3 border-r border-vintage-ink">Partner Code</th>
                      <th className="p-3 border-r border-vintage-ink">PayPal Payout Account</th>
                      <th className="p-3 border-r border-vintage-ink text-right">Cleared Balance</th>
                      <th className="p-3 border-r border-vintage-ink">Threshold Progress ($50)</th>
                      <th className="p-3 border-r border-vintage-ink text-right">Amount Remaining</th>
                      <th className="p-3 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/20 font-mono text-xs">
                    {accumulatingPayouts.map(item => {
                      const percent = Math.min(100, (item.dueAmount / AFFILIATE_MIN_PAYOUT_USD) * 100);
                      const remaining = Math.max(0, AFFILIATE_MIN_PAYOUT_USD - item.dueAmount);

                      return (
                        <tr key={item.affiliate.id} className="hover:bg-vintage-background/40 transition-colors">
                          <td className="p-3 border-r border-vintage-ink/20 font-bold font-sans text-vintage-ink">
                            {item.affiliate.affiliate_code}
                          </td>
                          <td className="p-3 border-r border-vintage-ink/20 font-bold truncate max-w-[200px] text-vintage-ink">
                            {item.affiliate.paypal_email}
                          </td>
                          <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-amber-900">
                            ${item.dueAmount.toFixed(2)}
                          </td>
                          <td className="p-3 border-r border-vintage-ink/20">
                            <div className="w-full bg-white border border-vintage-ink/30 h-3 rounded-none overflow-hidden relative p-0.5">
                              <div 
                                className="bg-amber-600 h-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-xs text-vintage-ink/80 block mt-1 font-sans">
                              {percent.toFixed(0)}% reached
                            </span>
                          </td>
                          <td className="p-3 border-r border-vintage-ink/20 text-right text-xs font-medium text-vintage-ink/80">
                            ${remaining.toFixed(2)} to qualify
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setInspectedPartner(item.affiliate)}
                              className="vintage-btn py-1 px-3 text-[10px] tracking-wider uppercase flex items-center gap-1 mx-auto font-bold"
                            >
                              <Eye size={12} /> Inspect
                            </button>
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
      )}

      {/* TAB 2: PARTNER ACCOUNTS DIRECTORY */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display text-vintage-ink">Registered Creators & Affiliates ({affiliates.length})</h3>
            <span className="text-xs font-mono font-bold text-vintage-ink/80">Clean Vanity Routing Active</span>
          </div>

          {affiliates.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-vintage-ink/30 text-center font-medium text-xs sm:text-sm text-vintage-ink/80 bg-vintage-paper">
              No affiliates registered yet. Activate a partner code from the /affiliate landing page to test.
            </div>
          ) : (
            <div className="border-2 border-vintage-ink overflow-x-auto bg-vintage-paper shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-vintage-ink bg-vintage-ink/5 text-xs font-bold tracking-wider uppercase font-sans text-vintage-ink">
                    <th className="p-3 border-r border-vintage-ink">Partner Code</th>
                    <th className="p-3 border-r border-vintage-ink">Vanity Path</th>
                    <th className="p-3 border-r border-vintage-ink">Country / Phone</th>
                    <th className="p-3 border-r border-vintage-ink">PayPal Payout Account</th>
                    <th className="p-3 border-r border-vintage-ink text-right">Cleared Balance</th>
                    <th className="p-3 border-r border-vintage-ink text-right">In Holding</th>
                    <th className="p-3 border-r border-vintage-ink text-center">Status</th>
                    <th className="p-3 text-center">Audit Statement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vintage-ink/20 font-mono text-xs">
                  {affiliates.map((a) => {
                    const balance = affiliateDueBalances.find(b => b.affiliate.id === a.id);
                    return (
                      <tr key={a.id} className="hover:bg-vintage-background/40 transition-colors">
                        <td className="p-3 border-r border-vintage-ink/20 font-bold text-vintage-accent font-sans">
                          {a.affiliate_code}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 font-mono">
                          <a 
                            href={`/c/${a.affiliate_code}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline flex items-center gap-1 font-bold text-vintage-ink hover:text-vintage-accent"
                          >
                            /c/{a.affiliate_code} <ExternalLink size={12} className="opacity-70" />
                          </a>
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20">
                          <span className="block font-sans font-bold text-vintage-ink truncate max-w-[150px]">
                            {a.country || 'Not provided'}
                          </span>
                          <span className="text-xs text-vintage-ink/70 block mt-0.5">
                            {a.phone_code} {a.phone_number || ''}
                          </span>
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 font-bold truncate max-w-[180px] text-vintage-ink">
                          {a.paypal_email}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900 text-sm">
                          ${(balance?.dueAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right text-vintage-ink/80 font-medium">
                          ${(balance?.holdingAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-center">
                          <span className="px-2.5 py-0.5 border border-vintage-ink/40 text-[10px] uppercase font-bold bg-white text-vintage-ink">
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setInspectedPartner(a)}
                            className="vintage-btn py-1 px-3 text-[10px] tracking-wider uppercase font-bold inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View Ledger
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTLED PAYOUTS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display text-vintage-ink">Settled Payouts History ({payouts.length})</h3>
            <span className="text-xs font-mono font-bold text-vintage-ink/80">Verified PayPal Disbursements</span>
          </div>

          {payouts.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-vintage-ink/30 text-center font-medium text-xs sm:text-sm text-vintage-ink/80 bg-vintage-paper">
              No completed payouts recorded yet. Payouts recorded via batch execution will appear here.
            </div>
          ) : (
            <div className="border-2 border-vintage-ink overflow-x-auto bg-vintage-paper shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-vintage-ink bg-vintage-ink/5 text-xs font-bold tracking-wider uppercase font-sans text-vintage-ink">
                    <th className="p-3 border-r border-vintage-ink">Settled Date</th>
                    <th className="p-3 border-r border-vintage-ink">Partner Code</th>
                    <th className="p-3 border-r border-vintage-ink">PayPal Account</th>
                    <th className="p-3 border-r border-vintage-ink">Batch / Reference ID</th>
                    <th className="p-3 border-r border-vintage-ink text-right">Amount Disbursed</th>
                    <th className="p-3 border-r border-vintage-ink text-center">Orders Settled</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vintage-ink/20 font-mono text-xs">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-vintage-background/40 transition-colors">
                      <td className="p-3 border-r border-vintage-ink/20 font-medium">
                        {new Date(p.paid_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 font-bold font-sans text-vintage-accent">
                        {p.affiliate_code}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 font-bold truncate max-w-[200px] text-vintage-ink">
                        {p.paypal_email}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 truncate max-w-[180px] text-vintage-ink font-medium">
                        {p.payout_batch_id}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900 text-sm">
                        ${p.amount.toFixed(2)} {p.currency}
                      </td>
                      <td className="p-3 border-r border-vintage-ink/20 text-center font-bold">
                        {p.commission_count}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 bg-green-100 text-green-900 border border-green-300 text-[10px] uppercase font-bold inline-flex items-center gap-1">
                          <Check size={12} /> Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALL COMMISSIONS & ATTRIBUTION ORDERS */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-display text-vintage-ink">Attribution Orders ({filteredCommissions.length})</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search order, font, partner..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="vintage-input py-1.5 px-3 text-xs w-48 sm:w-64 font-mono font-medium border-2 border-vintage-ink bg-white"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {['all', 'pending_clearance', 'approved', 'paid'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all font-sans ${
                    statusFilter === f 
                      ? 'bg-vintage-ink text-vintage-paper border-vintage-ink shadow-xs' 
                      : 'bg-vintage-paper text-vintage-ink/75 border-vintage-ink/30 hover:text-vintage-ink hover:border-vintage-ink'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-vintage-ink/30 text-center font-medium text-xs sm:text-sm text-vintage-ink/80 bg-vintage-paper">
              No commissions matching the selected filter or search query.
            </div>
          ) : (
            <div className="border-2 border-vintage-ink overflow-x-auto bg-vintage-paper shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-vintage-ink bg-vintage-ink/5 text-xs font-bold tracking-wider uppercase font-sans text-vintage-ink">
                    <th className="p-3 border-r border-vintage-ink">Order ID</th>
                    <th className="p-3 border-r border-vintage-ink">Partner</th>
                    <th className="p-3 border-r border-vintage-ink">Typeface</th>
                    <th className="p-3 border-r border-vintage-ink text-right">Gross Paid</th>
                    <th className="p-3 border-r border-vintage-ink text-right">PayPal Fee</th>
                    <th className="p-3 border-r border-vintage-ink text-right">Net Store</th>
                    <th className="p-3 border-r border-vintage-ink text-right">Commission</th>
                    <th className="p-3 border-r border-vintage-ink">Clearance</th>
                    <th className="p-3 border-r border-vintage-ink text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vintage-ink/20 font-mono text-xs">
                  {filteredCommissions.map((c) => {
                    const aff = affiliates.find(a => a.id === c.affiliate_id);

                    return (
                      <tr key={c.id} className="hover:bg-vintage-background/40 transition-colors">
                        <td className="p-3 border-r border-vintage-ink/20 font-bold truncate max-w-[120px] text-vintage-ink">
                          {c.order_id}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 font-sans font-bold text-vintage-accent">
                          {aff?.affiliate_code || 'Unknown'}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 font-sans font-bold text-vintage-ink">
                          {c.font_name || 'Specimen License'}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right font-medium">
                          ${Number(c.gross_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right text-red-900 font-medium">
                          -${Number(c.paypal_inbound_fee || 0).toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right font-medium">
                          ${Number(c.net_store_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900 text-sm">
                          +${Number(c.commission_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-xs text-vintage-ink/80">
                          {new Date(c.cleared_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 border-r border-vintage-ink/20 text-center">
                          <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold border ${
                            c.status === 'paid' ? 'bg-green-100 text-green-900 border-green-300' :
                            c.status === 'approved' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            c.status === 'pending_clearance' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            'bg-red-100 text-red-900 border-red-300'
                          }`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {c.status !== 'paid' && aff && (
                            <button
                              onClick={() => {
                                const balance = affiliateDueBalances.find(b => b.affiliate.id === aff.id);
                                if (balance) handleOpenPayoutModal(balance);
                              }}
                              className="vintage-btn py-1 px-2.5 text-[9px] tracking-wider uppercase"
                            >
                              Pay Partner
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
      )}

      {/* INDIVIDUAL PARTNER AUDIT / FINANCIAL INSPECTOR MODAL */}
      {inspectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-vintage-paper border-2 border-vintage-ink max-w-4xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-vintage-ink pb-4">
              <div>
                <span className="text-[10px] font-bold text-vintage-accent uppercase tracking-widest block">
                  Individual Partner Financial Audit
                </span>
                <h3 className="text-2xl font-display font-bold">
                  {inspectedPartner.affiliate_code}
                </h3>
                <p className="text-xs text-vintage-ink/70">
                  Registered: {new Date(inspectedPartner.created_at).toLocaleDateString()} &bull; Vanity: <span className="font-mono">/c/{inspectedPartner.affiliate_code}</span> &bull; Coupon: <span className="font-mono font-bold">{inspectedPartner.affiliate_code}10</span>
                </p>
              </div>
              <button 
                onClick={() => setInspectedPartner(null)}
                className="p-1 hover:bg-vintage-background border border-vintage-ink/30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile & Address Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-vintage-ink/30 bg-vintage-background/40 text-xs">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/60 mb-1">Disbursement Details</h4>
                <div className="space-y-1">
                  <p><span className="font-bold">PayPal Account:</span> <span className="font-mono font-bold text-vintage-accent">{inspectedPartner.paypal_email}</span></p>
                  <p><span className="font-bold">Telephone:</span> {inspectedPartner.phone_code} {inspectedPartner.phone_number || '—'}</p>
                  <p><span className="font-bold">Net Commission Rate:</span> {(Number(inspectedPartner.commission_rate || 0.20) * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/60 mb-1">Verified Location</h4>
                <div className="space-y-1">
                  <p><span className="font-bold">Street:</span> {inspectedPartner.street_address || '—'}</p>
                  <p><span className="font-bold">City / Province:</span> {inspectedPartner.city || '—'}, {inspectedPartner.state_province || '—'} {inspectedPartner.postal_code || ''}</p>
                  <p><span className="font-bold">Country:</span> {inspectedPartner.country || '—'}</p>
                </div>
              </div>
            </div>

            {/* Partner Financial Stats */}
            {(() => {
              const partnerComms = commissions.filter(c => c.affiliate_id === inspectedPartner.id);
              const readyDue = partnerComms
                .filter(c => c.status === 'approved' || (c.status === 'pending_clearance' && new Date(c.cleared_at) <= now))
                .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
              const holding = partnerComms
                .filter(c => c.status === 'pending_clearance' && new Date(c.cleared_at) > now)
                .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
              const paid = partnerComms
                .filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
              const grossSales = partnerComms.reduce((sum, c) => sum + Number(c.gross_amount || 0), 0);

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="p-3 border border-vintage-ink bg-vintage-background/40">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Ready / Due</span>
                      <div className="text-xl font-display font-bold text-green-900">${readyDue.toFixed(2)}</div>
                      <span className="text-[9px] opacity-70 block">{readyDue >= 50 ? 'Qualified' : 'Under $50'}</span>
                    </div>
                    <div className="p-3 border border-vintage-ink bg-vintage-background/40">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">In Warranty</span>
                      <div className="text-xl font-display font-bold text-amber-900">${holding.toFixed(2)}</div>
                      <span className="text-[9px] opacity-70 block">14-day hold</span>
                    </div>
                    <div className="p-3 border border-vintage-ink bg-vintage-background/40">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Lifetime Paid</span>
                      <div className="text-xl font-display font-bold text-vintage-ink">${paid.toFixed(2)}</div>
                      <span className="text-[9px] opacity-70 block">Disbursed</span>
                    </div>
                    <div className="p-3 border border-vintage-ink bg-vintage-background/40">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Gross Sales</span>
                      <div className="text-xl font-display font-bold text-vintage-ink">${grossSales.toFixed(2)}</div>
                      <span className="text-[9px] opacity-70 block">{partnerComms.length} order(s)</span>
                    </div>
                  </div>

                  {/* Individual Orders Ledger */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest">
                      Referred Orders & Commission Statement ({partnerComms.length})
                    </h4>

                    {partnerComms.length === 0 ? (
                      <div className="p-6 border border-vintage-ink/20 text-center italic text-xs text-vintage-ink/60">
                        No orders recorded yet through this partner link or coupon.
                      </div>
                    ) : (
                      <div className="border border-vintage-ink max-h-60 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="border-b border-vintage-ink bg-vintage-background/80 text-[10px] font-bold tracking-widest uppercase">
                              <th className="p-2 border-r border-vintage-ink">Order ID</th>
                              <th className="p-2 border-r border-vintage-ink">Typeface</th>
                              <th className="p-2 border-r border-vintage-ink text-right">Gross</th>
                              <th className="p-2 border-r border-vintage-ink text-right">Net Store</th>
                              <th className="p-2 border-r border-vintage-ink text-right">Commission</th>
                              <th className="p-2 border-r border-vintage-ink">Clearance</th>
                              <th className="p-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-vintage-ink/20 text-[11px]">
                            {partnerComms.map(c => (
                              <tr key={c.id} className="hover:bg-vintage-background/40">
                                <td className="p-2 border-r border-vintage-ink/20 truncate max-w-[120px]">{c.order_id}</td>
                                <td className="p-2 border-r border-vintage-ink/20 font-sans">{c.font_name || 'Specimen'}</td>
                                <td className="p-2 border-r border-vintage-ink/20 text-right">${Number(c.gross_amount || 0).toFixed(2)}</td>
                                <td className="p-2 border-r border-vintage-ink/20 text-right">${Number(c.net_store_amount || 0).toFixed(2)}</td>
                                <td className="p-2 border-r border-vintage-ink/20 text-right font-bold text-green-900">+${Number(c.commission_amount || 0).toFixed(2)}</td>
                                <td className="p-2 border-r border-vintage-ink/20 text-[10px] opacity-70">{new Date(c.cleared_at).toLocaleDateString()}</td>
                                <td className="p-2 text-center">
                                  <span className={`px-1.5 py-0.2 text-[8px] uppercase font-bold border ${
                                    c.status === 'paid' ? 'bg-green-100 text-green-900 border-green-300' :
                                    c.status === 'approved' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                                    'bg-amber-100 text-amber-900 border-amber-300'
                                  }`}>
                                    {c.status.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-vintage-ink/20">
              <button
                onClick={() => setInspectedPartner(null)}
                className="vintage-btn py-2 px-6 text-xs uppercase"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS PAYOUT RECORDING DIALOG */}
      {payoutModalAffiliate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-vintage-paper border-2 border-vintage-ink max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="border-b border-vintage-ink pb-4">
              <span className="text-[10px] font-bold text-green-800 uppercase tracking-widest block">
                Official Payout Disbursement
              </span>
              <h3 className="text-2xl font-display font-bold">Record PayPal Settlement</h3>
            </div>

            <div className="p-4 border border-vintage-ink/30 bg-green-50/50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="opacity-70">Partner:</span>
                <span className="font-bold font-mono">{payoutModalAffiliate.affiliate.affiliate_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">PayPal Email:</span>
                <span className="font-bold font-mono text-vintage-accent">{payoutModalAffiliate.affiliate.paypal_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Commissions Settled:</span>
                <span className="font-bold font-mono">{payoutModalAffiliate.dueCommissions.length} order(s)</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2 text-sm">
                <span className="font-bold uppercase tracking-wider">Total Settlement:</span>
                <span className="font-bold font-display text-green-900 text-lg">
                  ${payoutModalAffiliate.totalAmount.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">
                  PayPal Transaction / Batch ID <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={payoutBatchId}
                  onChange={e => setPayoutBatchId(e.target.value)}
                  className="vintage-input w-full font-mono text-xs"
                  placeholder="e.g. 5TY89123849120"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">
                  Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  className="vintage-input w-full text-xs"
                  placeholder="Sent via PayPal Mass Payment"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-vintage-ink/20">
              <button
                type="button"
                onClick={() => setPayoutModalAffiliate(null)}
                disabled={isSubmittingPayout}
                className="vintage-btn py-2 px-4 text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayout}
                disabled={isSubmittingPayout}
                className="vintage-btn bg-green-900! text-white! py-2 px-6 text-xs uppercase font-bold tracking-wider flex items-center gap-2"
              >
                {isSubmittingPayout ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> RECORDING...
                  </>
                ) : (
                  <>
                    <Check size={14} /> CONFIRM & MARK PAID
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AffiliateManager;
