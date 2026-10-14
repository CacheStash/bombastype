/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Copy, Check, ArrowRight, Clock, CheckCircle2, DollarSign, AlertCircle, Share2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const AffiliatePortal: React.FC = () => {
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchAffiliateData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Fetch affiliate master record
        const { data: affData } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setAffiliate(affData);

        if (affData) {
          // 2. Fetch commissions
          const { data: commData } = await supabase
            .from('affiliate_commissions')
            .select('*')
            .eq('affiliate_id', affData.id)
            .order('created_at', { ascending: false });

          setCommissions(commData || []);
        }
      }
      setLoading(false);
    };
    fetchAffiliateData();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center font-display italic text-vintage-ink animate-pulse">
        Fetching Associate Partner Vault...
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="border-2 border-vintage-ink p-10 bg-vintage-paper/60 text-center space-y-4">
        <Share2 size={32} className="mx-auto text-vintage-accent" />
        <h3 className="text-3xl font-display">Join the BombasType Partner Guild</h3>
        <p className="text-xs italic text-vintage-ink/70 max-w-md mx-auto leading-relaxed">
          Recommend our type specimens to your network and receive 20% net commission on every font license purchased.
        </p>
        <Link 
          to="/affiliate" 
          className="vintage-btn py-3 px-6 text-xs tracking-widest inline-flex items-center gap-2 uppercase"
        >
          ACTIVATE PARTNER PROFILE <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/c/${affiliate.affiliate_code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculations
  const pendingAmount = commissions
    .filter(c => c.status === 'pending_clearance')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const readyAmount = commissions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const totalPaidAmount = Number(affiliate.total_paid || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink pb-6">
        <div>
          <span className="text-[9px] font-bold text-vintage-accent uppercase tracking-[0.3em] block">
            Partner Identification
          </span>
          <h2 className="text-3xl font-display italic">
            Guild Code: <span className="font-bold">{affiliate.affiliate_code}</span>
          </h2>
        </div>
        <div className="text-right sm:text-right">
          <span className="text-[9px] font-bold text-vintage-accent uppercase tracking-widest block">
            Payout Destination
          </span>
          <span className="font-mono text-xs font-bold text-vintage-ink">
            {affiliate.paypal_email}
          </span>
        </div>
      </div>

      {/* VANITY LINK PROMO BOX */}
      <div className="border-4 border-double border-vintage-ink p-6 bg-vintage-background/80 space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent block mb-1">
            Your Clean Vanity Link (100% Anti-Adblocker & Safari Immune)
          </label>
          <div className="flex items-center gap-2 bg-white/90 p-2 border border-vintage-ink">
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              className="w-full bg-transparent font-mono text-xs outline-none text-vintage-ink font-bold"
            />
            <button 
              onClick={handleCopyLink}
              className="vintage-btn py-1.5 px-3 text-[10px] tracking-widest flex items-center gap-1 shrink-0"
            >
              {copied ? <Check size={12} className="text-green-800" /> : <Copy size={12} />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] italic text-vintage-ink/70 gap-2">
          <span>Visitors are tagged with a 30-day server cookie. No tracking scripts required.</span>
          <Link to="/affiliate" className="underline hover:text-vintage-accent not-italic font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
            View Partner Rules <ExternalLink size={10} />
          </Link>
        </div>
      </div>

      {/* 3 STAT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-vintage-ink bg-vintage-paper text-left space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-vintage-ink/60 uppercase tracking-widest">
            <span>Pending Clearance</span>
            <Clock size={14} className="text-amber-700" />
          </div>
          <div className="text-3xl font-display font-bold text-amber-900">
            ${pendingAmount.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-vintage-ink/60">Under 14-day safety warranty hold</p>
        </div>

        <div className="p-5 border border-vintage-ink bg-vintage-paper text-left space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-vintage-ink/60 uppercase tracking-widest">
            <span>Ready for Payout</span>
            <CheckCircle2 size={14} className="text-green-700" />
          </div>
          <div className="text-3xl font-display font-bold text-green-900">
            ${readyAmount.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-vintage-ink/60">Disbursed monthly (Min. $50 threshold)</p>
        </div>

        <div className="p-5 border border-vintage-ink bg-vintage-paper text-left space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-vintage-ink/60 uppercase tracking-widest">
            <span>Total Disbursed</span>
            <DollarSign size={14} className="text-vintage-accent" />
          </div>
          <div className="text-3xl font-display font-bold text-vintage-ink">
            ${totalPaidAmount.toFixed(2)}
          </div>
          <p className="text-[10px] italic text-vintage-ink/60">All-time PayPal payouts completed</p>
        </div>
      </div>

      {/* COMMISSIONS TABLE */}
      <div className="space-y-4">
        <h4 className="text-xl font-display italic">Referral Sales & Clearance Ledger</h4>
        
        {commissions.length === 0 ? (
          <div className="p-12 border border-vintage-ink/20 text-center italic text-xs text-vintage-ink/60 bg-vintage-paper/40">
            No referral sales recorded yet. Share your vanity link to begin earning commissions.
          </div>
        ) : (
          <div className="border border-vintage-ink overflow-x-auto bg-vintage-paper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-vintage-ink bg-vintage-background/80 text-[10px] font-bold tracking-widest uppercase">
                  <th className="p-3 border-r border-vintage-ink">Date</th>
                  <th className="p-3 border-r border-vintage-ink">Typeface</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Gross Paid</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Net Store</th>
                  <th className="p-3 border-r border-vintage-ink text-right">Commission</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-ink/20 font-mono">
                {commissions.map((c) => {
                  const dateStr = new Date(c.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  });

                  return (
                    <tr key={c.id} className="hover:bg-vintage-background/40">
                      <td className="p-3 border-r border-vintage-ink/20 text-[11px]">{dateStr}</td>
                      <td className="p-3 border-r border-vintage-ink/20 font-sans font-bold">{c.font_name || 'Specimen License'}</td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right">${Number(c.gross_amount || 0).toFixed(2)}</td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right text-vintage-ink/60">${Number(c.net_store_amount || 0).toFixed(2)}</td>
                      <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900">
                        +${Number(c.commission_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        {c.status === 'pending_clearance' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 uppercase font-bold">
                            <Clock size={10} /> In Clearance
                          </span>
                        )}
                        {c.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-800 uppercase font-bold">
                            <CheckCircle2 size={10} /> Ready for Payout
                          </span>
                        )}
                        {c.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-vintage-ink uppercase font-bold">
                            <Check size={10} /> Paid via PayPal
                          </span>
                        )}
                        {c.status === 'voided' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-800 uppercase font-bold">
                            <AlertCircle size={10} /> Voided (Refund)
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

export default AffiliatePortal;
