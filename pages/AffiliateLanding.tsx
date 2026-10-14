/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap, Coins, ArrowRight, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const AffiliateLanding: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [existingAffiliate, setExistingAffiliate] = useState<any>(null);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndAffiliate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);
      if (user) {
        setPaypalEmail(user.email || '');
        const { data } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setExistingAffiliate(data);
          setAffiliateCode(data.affiliate_code);
          setPaypalEmail(data.paypal_email);
        }
      }
    };
    checkAuthAndAffiliate();
  }, []);

  const handleRegisterAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!sessionUser) {
      navigate('/user/auth');
      return;
    }

    const cleanCode = affiliateCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 3 || cleanCode.length > 20) {
      setErrorMsg('Affiliate code must be 3-20 alphanumeric characters (A-Z, 0-9, dash, underscore).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail.trim())) {
      setErrorMsg('Please enter a valid PayPal email address for payouts.');
      return;
    }

    if (!agreed) {
      setErrorMsg('You must agree to the Affiliate Partner Terms.');
      return;
    }

    setLoading(true);
    try {
      // Check if code taken by someone else
      const { data: takenCheck } = await supabase
        .from('affiliates')
        .select('id, user_id')
        .ilike('affiliate_code', cleanCode)
        .maybeSingle();

      if (takenCheck && takenCheck.user_id !== sessionUser.id) {
        throw new Error('This partner code is already reserved by another creator. Please pick another.');
      }

      const { data, error } = await supabase
        .from('affiliates')
        .upsert(
          {
            user_id: sessionUser.id,
            affiliate_code: cleanCode,
            paypal_email: paypalEmail.trim().toLowerCase(),
            status: 'active',
            commission_rate: 0.20,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      setExistingAffiliate(data);
      setSuccessMsg('Your affiliate partnership is active! You can now start sharing your links.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate partner account.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = existingAffiliate 
    ? `${window.location.origin}/c/${existingAffiliate.affiliate_code}` 
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-vintage-paper py-12 px-6 md:px-12 flex flex-col items-center text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper">
      
      {/* HEADER TOOLS */}
      <div className="w-full max-w-5xl mb-8 flex justify-between items-center text-[10px] font-bold">
        <Link to="/" className="flex items-center gap-2 hover:text-vintage-accent transition-colors tracking-widest uppercase">
          <ArrowLeft size={14} /> Back to Catalog
        </Link>
        <span className="border border-vintage-ink/20 px-3 py-1 uppercase tracking-widest text-[9px] bg-vintage-background/50">
          Partner Guild · 20% Net Commission
        </span>
      </div>

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-5xl border border-vintage-ink/20 bg-vintage-paper/50 relative flex flex-col items-center overflow-hidden">
        
        {/* HERO SECTION */}
        <div className="w-full p-8 md:p-16 text-center border-b border-vintage-ink/20">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4"
          >
            Type Foundry Associate Program
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display mb-6 leading-tight"
          >
            Recommend Typefaces,<br />
            <span className="italic font-normal">Earn 20% Net Commission.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base italic text-vintage-ink/70 max-w-2xl mx-auto leading-relaxed"
          >
            Partner with BombasType. Share artisanal display typefaces with designers, studios, and agencies. 
            Receive automatic payouts directly to your PayPal account every month.
          </motion.p>
        </div>

        {/* 3 PILLARS / HOW IT WORKS */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 border-b border-vintage-ink/20 divide-y md:divide-y-0 md:divide-x divide-vintage-ink/20">
          <div className="p-8 text-center space-y-3">
            <span className="w-10 h-10 mx-auto rounded-full border border-vintage-ink flex items-center justify-center font-display text-lg bg-vintage-background">1</span>
            <h3 className="font-display text-xl">Get Your Vanity Path</h3>
            <p className="text-xs text-vintage-ink/70 leading-relaxed italic">
              Receive a clean, aesthetic vanity URL (<code className="font-mono font-bold text-[11px] bg-vintage-background px-1 py-0.5">bombastype.com/c/NAME</code>) that is 100% immune to adblockers and tracking prevention.
            </p>
          </div>
          <div className="p-8 text-center space-y-3">
            <span className="w-10 h-10 mx-auto rounded-full border border-vintage-ink flex items-center justify-center font-display text-lg bg-vintage-background">2</span>
            <h3 className="font-display text-xl">Share With Designers</h3>
            <p className="text-xs text-vintage-ink/70 leading-relaxed italic">
              Share in your typography specimens, client decks, YouTube tutorials, or social media. Visitors are tagged for 30 full days via server cookies.
            </p>
          </div>
          <div className="p-8 text-center space-y-3">
            <span className="w-10 h-10 mx-auto rounded-full border border-vintage-ink flex items-center justify-center font-display text-lg bg-vintage-background">3</span>
            <h3 className="font-display text-xl">Monthly PayPal Payout</h3>
            <p className="text-xs text-vintage-ink/70 leading-relaxed italic">
              Earn 20% on every license sold. After a 14-day warranty holding period, earnings are paid automatically via PayPal once balance reaches $50.
            </p>
          </div>
        </div>

        {/* ONBOARDING FORM / STATUS SECTION */}
        <div className="w-full p-8 md:p-14 max-w-3xl mx-auto">
          {existingAffiliate ? (
            /* ACTIVE AFFILIATE CARD */
            <div className="border-4 border-double border-vintage-ink p-8 bg-vintage-background/70 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-4">
                <div>
                  <span className="text-[9px] font-bold text-vintage-accent uppercase tracking-[0.3em] block">Guild Partner Status</span>
                  <h4 className="text-2xl font-display italic">Active Partner ({existingAffiliate.affiliate_code})</h4>
                </div>
                <Link 
                  to="/user/dashboard" 
                  className="vintage-btn py-2 px-4 text-[10px] tracking-widest flex items-center gap-2 w-fit"
                >
                  OPEN USER DASHBOARD <ArrowRight size={12} />
                </Link>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/60">Your Clean Vanity Link (Share Everywhere)</label>
                <div className="flex items-center gap-2 bg-white/80 p-2 border border-vintage-ink">
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
                <p className="text-[10px] italic text-vintage-ink/60">
                  Tip: You can also link directly to any font using <code className="font-mono font-bold">bombastype.com/c/{existingAffiliate.affiliate_code}/[font_id]</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-vintage-ink/20 text-center">
                <div className="p-3 bg-white/40 border border-vintage-ink/10">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Payout Destination</span>
                  <span className="text-xs font-mono font-bold truncate block">{existingAffiliate.paypal_email}</span>
                </div>
                <div className="p-3 bg-white/40 border border-vintage-ink/10">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Commission Rate</span>
                  <span className="text-base font-display font-bold">{(existingAffiliate.commission_rate * 100).toFixed(0)}% Net</span>
                </div>
                <div className="p-3 bg-white/40 border border-vintage-ink/10 col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Holding Window</span>
                  <span className="text-xs font-bold uppercase">14-Day Safe Clear</span>
                </div>
              </div>
            </div>
          ) : (
            /* APPLICATION FORM */
            <form onSubmit={handleRegisterAffiliate} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-display">Activate Your Associate Membership</h3>
                <p className="text-xs italic text-vintage-ink/70">
                  Join our curated network of font partners. Instant approval with your verified account.
                </p>
              </div>

              {errorMsg && (
                <div className="p-4 border border-red-800 bg-red-50 text-red-900 text-xs font-bold text-center">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-4 border border-green-800 bg-green-50 text-green-900 text-xs font-bold text-center">
                  {successMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70 block">
                  Requested Partner Code (Vanity Slug)
                </label>
                <div className="flex items-center border border-vintage-ink bg-white/70">
                  <span className="px-3 py-3 font-mono text-xs opacity-50 border-r border-vintage-ink/20">
                    bombastype.com/c/
                  </span>
                  <input 
                    type="text" 
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                    placeholder="YOURNAME" 
                    required
                    className="w-full p-3 font-mono text-xs font-bold uppercase outline-none bg-transparent"
                  />
                </div>
                <p className="text-[10px] italic text-vintage-ink/60">
                  Letters and numbers only (e.g. HENDRA, STUDIO99). This will become your clean vanity link.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/70 block">
                  PayPal Payout Email Address
                </label>
                <input 
                  type="email" 
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="PAYMENTS@YOURDOMAIN.COM" 
                  required
                  className="w-full p-3 border border-vintage-ink bg-white/70 font-mono text-xs outline-none"
                />
                <p className="text-[10px] italic text-vintage-ink/60">
                  Commission funds will be disbursed automatically to this PayPal account.
                </p>
              </div>

              {/* TERMS DISCLOSURE */}
              <div className="p-4 border border-vintage-ink/20 bg-vintage-background/40 space-y-2 text-[11px] leading-relaxed text-vintage-ink/80 italic">
                <p className="font-bold uppercase tracking-widest not-italic text-[9px] text-vintage-accent">
                  Partner Terms & Operational Standards:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Commission is <strong>20% of net received sales</strong> (calculated after PayPal processing fees).</li>
                  <li>All commissions are held in a <strong>14-day clearance window</strong> to protect against customer refund disputes.</li>
                  <li>Minimum payout threshold is <strong>$50.00 USD</strong>. Outbound PayPal Payout processing fees are deducted at disbursement.</li>
                  <li>Self-purchasing using your own affiliate link is strictly prohibited and subject to commission voiding.</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 accent-vintage-ink" 
                />
                <span className="text-xs text-vintage-ink/80">
                  I understand and agree to the Associate Partner Terms and financial clearance rules.
                </span>
              </label>

              <button 
                type="submit" 
                disabled={loading}
                className="vintage-btn w-full py-4 bg-vintage-ink! text-vintage-background! text-xs tracking-[0.3em] font-bold hover:opacity-90 disabled:opacity-40 transition-all uppercase"
              >
                {loading ? 'ACTIVATING PARTNER PROFILE...' : 'ACTIVATE ASSOCIATE ACCOUNT'}
              </button>
            </form>
          )}
        </div>

        <div className="h-4 w-full bg-vintage-ink/5 border-t border-vintage-ink/20" />
      </div>

      <div className="mt-8 text-[9px] font-bold tracking-[0.4em] text-vintage-accent uppercase">
        ** BombasType Archival Partner Guild **
      </div>
    </div>
  );
};

export default AffiliateLanding;
