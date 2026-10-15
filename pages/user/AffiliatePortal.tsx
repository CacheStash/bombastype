/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Copy, Check, ArrowRight, Clock, CheckCircle2, DollarSign, 
  AlertCircle, Share2, ExternalLink, Settings, Save, Mail, Hash 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AffiliatePortal: React.FC = () => {
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  // Account Settings Form State
  const [editPaypalEmail, setEditPaypalEmail] = useState('');
  const [editVanityCode, setEditVanityCode] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: affData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setAffiliate(affData);

      if (affData) {
        setEditPaypalEmail(affData.paypal_email || '');
        setEditVanityCode(affData.affiliate_code || '');

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

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');

    const cleanEmail = editPaypalEmail.trim().toLowerCase();
    const cleanCode = editVanityCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setSettingsError('Please provide a valid PayPal email address for disbursements.');
      return;
    }

    if (cleanCode.length < 3 || cleanCode.length > 20) {
      setSettingsError('Vanity code must be between 3 and 20 alphanumeric characters (A-Z, 0-9, dash, underscore).');
      return;
    }

    setSavingSettings(true);
    try {
      if (cleanCode !== affiliate.affiliate_code) {
        const { data: codeCheck } = await supabase
          .from('affiliates')
          .select('id, user_id')
          .ilike('affiliate_code', cleanCode)
          .maybeSingle();

        if (codeCheck && codeCheck.id !== affiliate.id) {
          throw new Error(`The vanity code "${cleanCode}" is already taken by another creator. Please select another.`);
        }
      }

      const { data: updated, error } = await supabase
        .from('affiliates')
        .update({
          paypal_email: cleanEmail,
          affiliate_code: cleanCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliate.id)
        .select()
        .single();

      if (error) throw error;

      setAffiliate(updated);
      setEditPaypalEmail(updated.paypal_email);
      setEditVanityCode(updated.affiliate_code);
      setSettingsSuccess('Affiliate account & payout settings saved successfully!');
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update account settings.');
    } finally {
      setSavingSettings(false);
    }
  };

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

  const pendingAmount = commissions
    .filter(c => c.status === 'pending_clearance')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const readyAmount = commissions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const totalPaidAmount = Number(affiliate.total_paid || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION WITH SUB-NAV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink pb-6">
        <div>
          <span className="text-[9px] font-bold text-vintage-accent uppercase tracking-[0.3em] block">
            Partner Identification
          </span>
          <h2 className="text-3xl font-display italic">
            Guild Code: <span className="font-bold">{affiliate.affiliate_code}</span>
          </h2>
        </div>

        {/* SUB TAB CONTROLS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-vintage-ink transition-all ${
              activeTab === 'overview'
                ? 'bg-vintage-ink text-vintage-paper'
                : 'bg-vintage-paper text-vintage-ink hover:bg-vintage-ink/5'
            }`}
          >
            Overview & Sales
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-vintage-ink transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-vintage-ink text-vintage-paper'
                : 'bg-vintage-paper text-vintage-ink hover:bg-vintage-ink/5'
            }`}
          >
            <Settings size={12} /> Account Settings
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & SALES LEDGER */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* VANITY LINK PROMO BOX */}
          <div className="border-4 border-double border-vintage-ink p-6 bg-vintage-background/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent block">
                Your Clean Vanity Link (100% Anti-Adblocker & Safari Immune)
              </label>
              <button 
                onClick={() => setActiveTab('settings')}
                className="text-[9px] font-bold uppercase tracking-widest text-vintage-ink hover:text-vintage-accent flex items-center gap-1 underline"
              >
                <Settings size={10} /> Edit Code / Payout
              </button>
            </div>
            
            <div className="flex items-center border border-vintage-ink bg-vintage-paper p-2">
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="w-full bg-transparent font-mono text-xs font-bold text-vintage-ink outline-none px-2"
              />
              <button 
                onClick={handleCopyLink}
                className="vintage-btn py-2 px-4 text-[10px] tracking-widest uppercase flex items-center gap-1 shrink-0"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] italic text-vintage-ink/70 gap-2 font-serif">
              <span>Visitors are tagged server-side via HttpOnly cookie for 30 consecutive days.</span>
              <span className="font-sans font-bold text-vintage-ink not-italic text-[10px]">
                Payout Destination: <span className="text-vintage-accent">{affiliate.paypal_email}</span>
              </span>
            </div>
          </div>

          {/* 3 FINANCIAL RECONCILIATION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-vintage-ink bg-vintage-background/60 text-left space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                <span>Clearance Holding</span>
                <Clock size={14} className="text-amber-800" />
              </div>
              <div className="text-3xl font-display font-bold text-amber-900">
                ${pendingAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/60">14-day warranty hold against refund disputes</p>
            </div>

            <div className="p-5 border-2 border-vintage-accent bg-green-50/50 text-left space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-green-900">
                <span>Ready For Payout</span>
                <CheckCircle2 size={14} className="text-green-800" />
              </div>
              <div className="text-3xl font-display font-bold text-green-900">
                ${readyAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-green-900/70">Disbursed monthly (Min. $50.00 threshold)</p>
            </div>

            <div className="p-5 border border-vintage-ink bg-vintage-background/60 text-left space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                <span>Total Disbursed</span>
                <DollarSign size={14} />
              </div>
              <div className="text-3xl font-display font-bold text-vintage-ink">
                ${totalPaidAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/60">All-time PayPal payouts completed</p>
            </div>
          </div>

          {/* COMMISSIONS LEDGER TABLE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-display">Attributed Orders Ledger</h4>
              <span className="text-[10px] font-mono opacity-60 uppercase">{commissions.length} Attributed Sales</span>
            </div>

            {commissions.length === 0 ? (
              <div className="p-12 border border-vintage-ink/20 text-center italic text-xs text-vintage-ink/60 bg-vintage-background/40">
                No referral transactions recorded yet. Share your vanity link to begin earning commissions.
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
                      <th className="p-3 border-r border-vintage-ink text-right">Your Commission</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/20 font-mono text-[11px]">
                    {commissions.map((c) => {
                      const dateStr = new Date(c.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      });

                      return (
                        <tr key={c.id} className="hover:bg-vintage-background/40">
                          <td className="p-3 border-r border-vintage-ink/20">{dateStr}</td>
                          <td className="p-3 border-r border-vintage-ink/20 font-sans font-bold">{c.font_name || 'Specimen License'}</td>
                          <td className="p-3 border-r border-vintage-ink/20 text-right">${Number(c.gross_amount || 0).toFixed(2)}</td>
                          <td className="p-3 border-r border-vintage-ink/20 text-right opacity-60">${Number(c.net_store_amount || 0).toFixed(2)}</td>
                          <td className="p-3 border-r border-vintage-ink/20 text-right font-bold text-green-900">
                            +${Number(c.commission_amount || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            {c.status === 'pending_clearance' && (
                              <span className="px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-900 text-[9px] uppercase font-bold">
                                Holding (14D)
                              </span>
                            )}
                            {c.status === 'approved' && (
                              <span className="px-2 py-0.5 border border-green-300 bg-green-50 text-green-900 text-[9px] uppercase font-bold">
                                Ready Payout
                              </span>
                            )}
                            {c.status === 'paid' && (
                              <span className="px-2 py-0.5 border border-vintage-ink/20 bg-vintage-background text-vintage-ink text-[9px] uppercase font-bold">
                                Settled
                              </span>
                            )}
                            {c.status === 'voided' && (
                              <span className="px-2 py-0.5 border border-red-300 bg-red-50 text-red-900 text-[9px] uppercase font-bold">
                                Voided
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
      )}

      {/* TAB 2: ACCOUNT & PAYOUT SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="border-4 border-double border-vintage-ink p-8 bg-vintage-background/80 space-y-6">
            
            <div className="border-b border-vintage-ink pb-4">
              <span className="text-[9px] font-bold text-vintage-accent uppercase tracking-[0.3em] block">
                Configuration Vault
              </span>
              <h3 className="text-2xl font-display">
                Partner Account & Payout Preferences
              </h3>
              <p className="text-xs italic text-vintage-ink/70 mt-1">
                Keep your payout email and custom vanity route up to date.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-4 border border-green-600 bg-green-50 text-green-900 font-bold text-xs flex items-center gap-2">
                <Check size={16} /> {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="p-4 border border-red-600 bg-red-50 text-red-900 font-bold text-xs flex items-center gap-2">
                <AlertCircle size={16} /> {settingsError}
              </div>
            )}

            <form onSubmit={handleUpdateSettings} className="space-y-6">
              
              {/* PayPal Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink">
                  <Mail size={14} className="text-vintage-accent" /> PayPal Payout Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={editPaypalEmail}
                  onChange={(e) => setEditPaypalEmail(e.target.value)}
                  placeholder="payouts@yourdomain.com"
                  className="w-full border border-vintage-ink px-4 py-3 font-mono text-sm bg-vintage-paper focus:bg-white outline-none"
                />
                <span className="text-[11px] font-serif italic text-vintage-ink/60 block">
                  All monthly cleared commission earnings will be disbursed directly to this PayPal address.
                </span>
              </div>

              {/* Vanity Code Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink">
                  <Hash size={14} className="text-vintage-accent" /> Custom Vanity Code
                </label>
                <div className="flex items-center border border-vintage-ink bg-vintage-paper">
                  <span className="px-4 py-3 bg-vintage-background/60 border-r border-vintage-ink text-xs font-mono font-bold text-vintage-ink/60 select-none">
                    bombastype.com/c/
                  </span>
                  <input 
                    type="text"
                    required
                    value={editVanityCode}
                    onChange={(e) => setEditVanityCode(e.target.value.toUpperCase())}
                    placeholder="STUDIO_NAME"
                    className="grow px-4 py-3 font-mono text-sm font-bold uppercase bg-transparent outline-none"
                  />
                </div>
                <span className="text-[11px] font-serif italic text-vintage-ink/60 block">
                  Alphanumeric only (3–20 chars). Updating your code updates your referral URL immediately.
                </span>
              </div>

              {/* Fixed Details Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-vintage-ink/30 bg-vintage-paper font-mono text-xs">
                <div>
                  <span className="text-[10px] text-vintage-ink/60 uppercase block font-bold">Commission Rate:</span>
                  <span className="font-bold text-sm text-vintage-ink">
                    {(Number(affiliate.commission_rate || 0.20) * 100).toFixed(0)}% Net Store Proceeds
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-vintage-ink/60 uppercase block font-bold">Minimum Payout Threshold:</span>
                  <span className="font-bold text-sm text-vintage-ink">$50.00 USD</span>
                </div>
                <div>
                  <span className="text-[10px] text-vintage-ink/60 uppercase block font-bold">Holding Window:</span>
                  <span className="font-bold text-vintage-ink">14-Day Customer Dispute Warranty</span>
                </div>
                <div>
                  <span className="text-[10px] text-vintage-ink/60 uppercase block font-bold">Guild Status:</span>
                  <span className="font-bold text-green-900 uppercase">{affiliate.status || 'ACTIVE'}</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="vintage-btn py-3.5 px-8 text-xs tracking-widest font-bold uppercase flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>{savingSettings ? 'SAVING CHANGES...' : 'SAVE SETTINGS'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditPaypalEmail(affiliate.paypal_email || '');
                    setEditVanityCode(affiliate.affiliate_code || '');
                    setSettingsError('');
                    setSettingsSuccess('');
                  }}
                  className="py-3.5 px-6 text-xs uppercase tracking-wider border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink/5 transition-colors"
                >
                  Reset
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AffiliatePortal;
