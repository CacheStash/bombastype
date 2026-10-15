/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Copy, Check, ArrowRight, Clock, CheckCircle2, DollarSign, 
  AlertCircle, Share2, ExternalLink, Settings, Save, Mail, Hash,
  Tag, MapPin, Phone, Calendar, Wallet, ChevronRight, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  COUNTRIES, 
  PROVINCES_BY_COUNTRY, 
  getDummyAffiliateData, 
  syncAffiliateCoupon, 
  findCountryByName,
  getNextMonthlyPayoutDate,
  AFFILIATE_MIN_PAYOUT_USD
} from '../../utils/affiliateGeo';
import { CountryCombobox } from '../../components/CountryCombobox';
import { PhoneDialCombobox } from '../../components/PhoneDialCombobox';

interface PayoutItem {
  id: string;
  paid_at: string;
  amount: number;
  currency: string;
  payout_batch_id: string;
  commission_count: number;
  status: string;
  notes?: string;
}

const AffiliatePortal: React.FC = () => {
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'settings'>('overview');

  // Account Settings Form State
  const [editPaypalEmail, setEditPaypalEmail] = useState('');
  const [editVanityCode, setEditVanityCode] = useState('');
  const [editPhoneCode, setEditPhoneCode] = useState('+62');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editCountry, setEditCountry] = useState('Indonesia');
  const [editStateProvince, setEditStateProvince] = useState('DKI Jakarta');
  const [editCity, setEditCity] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editStreetAddress, setEditStreetAddress] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const nextPayoutInfo = getNextMonthlyPayoutDate();

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
        setEditPaypalEmail(affData.paypal_email || user.email || '');
        setEditVanityCode(affData.affiliate_code || '');
        if (affData.phone_code) setEditPhoneCode(affData.phone_code);
        if (affData.phone_number) setEditPhoneNumber(affData.phone_number);
        if (affData.country) {
          setEditCountry(affData.country);
          if (affData.state_province) setEditStateProvince(affData.state_province);
        }
        if (affData.city) setEditCity(affData.city);
        if (affData.postal_code) setEditPostalCode(affData.postal_code);
        if (affData.street_address) setEditStreetAddress(affData.street_address);

        // Pre-fill dummy data if test account has empty address
        if (!affData.phone_number && user.email === 'gotrainer19@gmail.com') {
          const dummy = getDummyAffiliateData(user.email);
          if (dummy) {
            setEditPhoneCode(dummy.phone_code);
            setEditPhoneNumber(dummy.phone_number);
            setEditCountry(dummy.country);
            setEditStateProvince(dummy.state_province);
            setEditCity(dummy.city);
            setEditPostalCode(dummy.postal_code);
            setEditStreetAddress(dummy.street_address);
          }
        }

        // Fetch commissions
        const { data: commData } = await supabase
          .from('affiliate_commissions')
          .select('*')
          .eq('affiliate_id', affData.id)
          .order('created_at', { ascending: false });

        const loadedComms = commData || [];
        setCommissions(loadedComms);

        // Fetch Payouts History (try table first, fallback to synthesized)
        try {
          const { data: pData } = await supabase
            .from('affiliate_payouts')
            .select('*')
            .eq('affiliate_id', affData.id)
            .order('paid_at', { ascending: false });

          if (pData && pData.length > 0) {
            setPayoutHistory(pData.map((p: any) => ({
              id: p.id,
              paid_at: p.paid_at || p.created_at,
              amount: Number(p.amount || 0),
              currency: p.currency || 'USD',
              payout_batch_id: p.payout_batch_id || 'PP-BATCH',
              commission_count: Array.isArray(p.commission_ids) ? p.commission_ids.length : 1,
              status: p.status || 'completed',
              notes: p.notes
            })));
          } else {
            synthesizePayoutHistory(loadedComms);
          }
        } catch {
          synthesizePayoutHistory(loadedComms);
        }
      }
    }
    setLoading(false);
  };

  const synthesizePayoutHistory = (allComms: any[]) => {
    const paidComms = allComms.filter(c => c.status === 'paid');
    const groupMap = new Map<string, {
      id: string;
      paid_at: string;
      amount: number;
      count: number;
      reference: string;
    }>();

    paidComms.forEach(c => {
      const dateKey = c.paid_at ? c.paid_at.substring(0, 10) : 'settled';
      const existing = groupMap.get(dateKey) || {
        id: dateKey,
        paid_at: c.paid_at || c.created_at,
        amount: 0,
        count: 0,
        reference: c.payout_reference || 'PP-DISBURSEMENT'
      };
      existing.amount += Number(c.commission_amount || 0);
      existing.count += 1;
      groupMap.set(dateKey, existing);
    });

    const list = Array.from(groupMap.values()).map(g => ({
      id: g.id,
      paid_at: g.paid_at,
      amount: g.amount,
      currency: 'USD',
      payout_batch_id: g.reference,
      commission_count: g.count,
      status: 'completed'
    }));

    list.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    setPayoutHistory(list);
  };

  const handleCountryChange = (selectedCountry: string, dialCode?: string) => {
    setEditCountry(selectedCountry);
    if (dialCode) {
      setEditPhoneCode(dialCode);
    } else {
      const countryObj = findCountryByName(selectedCountry);
      if (countryObj) {
        setEditPhoneCode(countryObj.dial);
      }
    }
    const provinces = PROVINCES_BY_COUNTRY[selectedCountry];
    if (provinces && provinces.length > 0) {
      setEditStateProvince(provinces[0]);
    } else {
      setEditStateProvince('');
    }
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

    if (!editPhoneNumber.trim()) {
      setSettingsError('Phone number is required for partner identification.');
      return;
    }

    if (!editStreetAddress.trim() || !editCity.trim() || !editPostalCode.trim()) {
      setSettingsError('Physical address details (Street, City, Postal Code) are required.');
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

      const fullUpdate = {
        paypal_email: cleanEmail,
        affiliate_code: cleanCode,
        phone_code: editPhoneCode,
        phone_number: editPhoneNumber.trim(),
        country: editCountry.trim(),
        state_province: editStateProvince.trim(),
        city: editCity.trim(),
        postal_code: editPostalCode.trim(),
        street_address: editStreetAddress.trim(),
        updated_at: new Date().toISOString()
      };

      let updatedData = null;
      const { data, error } = await supabase
        .from('affiliates')
        .update(fullUpdate)
        .eq('id', affiliate.id)
        .select()
        .single();

      if (error) {
        console.warn('Update with full address failed, falling back to base fields:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('affiliates')
          .update({
            paypal_email: cleanEmail,
            affiliate_code: cleanCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliate.id)
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        updatedData = fallbackData;
      } else {
        updatedData = data;
      }

      // Sync audience coupon with updated code
      await syncAffiliateCoupon(supabase, affiliate.id, cleanCode);

      setAffiliate(updatedData);
      setEditPaypalEmail(updatedData.paypal_email);
      setEditVanityCode(updatedData.affiliate_code);
      setSettingsSuccess('Affiliate account profile & audience coupon updated successfully!');
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
  const couponCode = `${affiliate.affiliate_code}10`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  const now = new Date();

  // Cleared / Due: status approved OR (pending_clearance with cleared_at <= now)
  const readyAmount = commissions
    .filter(c => c.status === 'approved' || (c.status === 'pending_clearance' && new Date(c.cleared_at) <= now))
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  // Clearance Holding: pending_clearance still within 14-day warranty window
  const pendingAmount = commissions
    .filter(c => c.status === 'pending_clearance' && new Date(c.cleared_at) > now)
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  // Total Disbursed / Settled
  const totalPaidAmount = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const isQualifiedForPayout = readyAmount >= AFFILIATE_MIN_PAYOUT_USD;
  const thresholdPercentage = Math.min(100, (readyAmount / AFFILIATE_MIN_PAYOUT_USD) * 100);
  const remainingForThreshold = Math.max(0, AFFILIATE_MIN_PAYOUT_USD - readyAmount);

  const provinceOptions = PROVINCES_BY_COUNTRY[editCountry] || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-vintage-ink">
      
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
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-vintage-ink transition-all flex items-center gap-1.5 ${
              activeTab === 'payouts'
                ? 'bg-vintage-ink text-vintage-paper'
                : 'bg-vintage-paper text-vintage-ink hover:bg-vintage-ink/5'
            }`}
          >
            <Calendar size={12} /> Payouts & Due Ledger
            {isQualifiedForPayout && (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
            )}
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
          
          {/* DUAL PROMO TOOLS: VANITY LINK + AUDIENCE COUPON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TOOL 1: VANITY LINK */}
            <div className="border-4 border-double border-vintage-ink p-5 bg-vintage-background/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent block">
                  1. Personal Vanity Link
                </label>
                <span className="text-[9px] font-mono text-vintage-ink/70">30-day cookie window</span>
              </div>
              
              <div className="flex items-center border border-vintage-ink bg-vintage-paper p-1.5">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl} 
                  className="w-full bg-transparent font-mono text-xs font-bold text-vintage-ink outline-none px-2 truncate"
                />
                <button 
                  onClick={handleCopyLink}
                  className="vintage-btn py-1.5 px-3 text-[10px] tracking-widest uppercase flex items-center gap-1 shrink-0 font-bold"
                >
                  {copiedLink ? <Check size={12} className="text-green-800" /> : <Copy size={12} />}
                  {copiedLink ? 'COPIED' : 'COPY'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] italic text-vintage-ink/70">
                <span>Visitors clicking this link are tagged for 30 days.</span>
                <Link to="/font/salvatore" className="underline hover:text-vintage-accent flex items-center gap-1">
                  Specimens <ExternalLink size={10} />
                </Link>
              </div>
            </div>

            {/* TOOL 2: AUDIENCE PROMO COUPON */}
            <div className="border-4 border-double border-vintage-ink p-5 bg-vintage-background/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent block flex items-center gap-1">
                  <Tag size={12} /> 2. Audience 10% OFF Promo Code
                </label>
                <span className="text-[9px] font-bold text-green-900 bg-green-100 px-1.5 py-0.5 border border-green-300">
                  Active in Checkout
                </span>
              </div>
              
              <div className="flex items-center border border-vintage-ink bg-vintage-paper p-1.5">
                <input 
                  type="text" 
                  readOnly 
                  value={couponCode} 
                  className="w-full bg-transparent font-mono text-xs font-bold text-vintage-ink outline-none px-2 tracking-wider"
                />
                <button 
                  onClick={handleCopyCoupon}
                  className="vintage-btn py-1.5 px-3 text-[10px] tracking-widest uppercase flex items-center gap-1 shrink-0 font-bold"
                >
                  {copiedCoupon ? <Check size={12} className="text-green-800" /> : <Copy size={12} />}
                  {copiedCoupon ? 'COPIED' : 'COPY'}
                </button>
              </div>

              <div className="text-[10px] italic text-vintage-ink/70">
                Gives your audience 10% discount while directly crediting your 20% Net commission.
              </div>
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
                <span>Ready For Payout (Due)</span>
                <CheckCircle2 size={14} className="text-green-800" />
              </div>
              <div className="text-3xl font-display font-bold text-green-900">
                ${readyAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/60">
                {isQualifiedForPayout 
                  ? `Threshold reached ($50+). Scheduled for monthly run on ${nextPayoutInfo.dateString}.` 
                  : `$${remainingForThreshold.toFixed(2)} more needed to trigger payout ($50 min).`}
              </p>
            </div>

            <div className="p-5 border border-vintage-ink bg-vintage-paper text-left space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-vintage-ink/60">
                <span>Total Disbursed</span>
                <DollarSign size={14} className="text-vintage-ink/60" />
              </div>
              <div className="text-3xl font-display font-bold text-vintage-ink">
                ${totalPaidAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/60">Lifetime payouts received to PayPal</p>
            </div>
          </div>

          {/* COMMISSIONS & SALES TRANSACTION TABLE */}
          <div className="border border-vintage-ink bg-vintage-paper overflow-hidden">
            <div className="p-4 border-b border-vintage-ink bg-vintage-background flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-vintage-ink">
                  Referral Sales & Commission Ledger
                </h3>
                <span className="text-[11px] font-serif italic text-vintage-ink/70">
                  Transactions referred via your vanity slug or promo coupon code
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 bg-white border border-vintage-ink">
                {commissions.length} Sales Recorded
              </span>
            </div>

            {commissions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <AlertCircle size={28} className="mx-auto text-vintage-ink/30" />
                <p className="text-sm font-bold text-vintage-ink">No referred orders recorded yet</p>
                <p className="text-xs font-serif italic text-vintage-ink/60 max-w-sm mx-auto">
                  Share your vanity link or discount coupon on your social platforms and portfolio to begin recording 20% net earnings.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-ink bg-vintage-background/40 font-mono uppercase text-[10px] text-vintage-ink/70">
                      <th className="p-3">Date</th>
                      <th className="p-3">Typeface / Order</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Net Store</th>
                      <th className="p-3 text-right">Your 20% Net</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/20 font-mono">
                    {commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-vintage-ink/5 transition-colors">
                        <td className="p-3 text-vintage-ink/80 text-[11px] whitespace-nowrap">
                          {new Date(comm.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-vintage-ink block font-sans text-xs">
                            {comm.font_name || 'Specimen License'}
                          </span>
                          <span className="text-[10px] text-vintage-ink/50 truncate block max-w-[200px]">
                            ID: {comm.order_id}
                          </span>
                        </td>
                        <td className="p-3 text-right text-vintage-ink">
                          ${Number(comm.gross_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-vintage-ink/70">
                          ${Number(comm.net_store_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-vintage-accent text-sm">
                          +${Number(comm.commission_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {comm.status === 'pending_clearance' && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border border-amber-800 text-amber-900 bg-amber-50">
                              <Clock size={10} /> Holding
                            </span>
                          )}
                          {comm.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border border-green-800 text-green-900 bg-green-50">
                              <CheckCircle2 size={10} /> Cleared
                            </span>
                          )}
                          {comm.status === 'paid' && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border border-blue-800 text-blue-900 bg-blue-50">
                              <DollarSign size={10} /> Paid Out
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAYOUT HISTORY & DUE STATUS */}
      {activeTab === 'payouts' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* PAYOUT SCHEDULE & THRESHOLD CARD */}
          <div className="p-6 border-2 border-vintage-ink bg-vintage-background/80 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-4">
              <div className="flex items-start gap-3">
                <Calendar size={24} className="text-vintage-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent block">
                    Disbursement Schedule
                  </span>
                  <h3 className="text-xl font-display font-bold">
                    Next Monthly Payout: {nextPayoutInfo.dateString}
                  </h3>
                  <p className="text-xs text-vintage-ink/70">
                    Disbursements occur on the <span className="font-bold">1st of every month</span> for balances reaching the <span className="font-bold">${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD</span> minimum.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold px-3 py-1 bg-vintage-paper border border-vintage-ink inline-block">
                  {nextPayoutInfo.daysLeft} DAYS REMAINING
                </span>
                <span className="text-[10px] text-vintage-ink/60 block mt-1">
                  To: <span className="font-mono font-bold">{affiliate.paypal_email}</span>
                </span>
              </div>
            </div>

            {/* Threshold Qualification Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  $50 Minimum Threshold Progress
                </span>
                <span className="font-mono font-bold text-vintage-accent">
                  ${readyAmount.toFixed(2)} / ${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD ({thresholdPercentage.toFixed(0)}%)
                </span>
              </div>

              <div className="w-full bg-vintage-paper border border-vintage-ink h-3.5 rounded-none overflow-hidden p-0.5">
                <div 
                  className={`h-full transition-all duration-700 ${
                    isQualifiedForPayout ? 'bg-green-700' : 'bg-amber-600'
                  }`}
                  style={{ width: `${thresholdPercentage}%` }}
                />
              </div>

              <div className="text-xs italic pt-1">
                {isQualifiedForPayout ? (
                  <span className="text-green-900 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Congratulations! You meet the $50 minimum threshold. Your cleared balance of ${readyAmount.toFixed(2)} USD is queued for the {nextPayoutInfo.dateString} monthly payout run.
                  </span>
                ) : (
                  <span className="text-amber-900 flex items-center gap-1.5">
                    <Clock size={14} /> Currently accumulating: ${remainingForThreshold.toFixed(2)} USD needed to qualify. Any balance under $50 rolls over automatically to subsequent monthly runs without expiration.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 BALANCE BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border-2 border-vintage-accent bg-green-50/50 text-left space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-green-900 block">
                Ready for Next Monthly Run
              </span>
              <div className="text-3xl font-display font-bold text-green-900">
                ${readyAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/70">
                Passed 14-day warranty clearance
              </p>
            </div>

            <div className="p-5 border border-vintage-ink bg-vintage-background/60 text-left space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900 block">
                In-Warranty Holding
              </span>
              <div className="text-3xl font-display font-bold text-amber-900">
                ${pendingAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/70">
                Protected by 14-day clearance buffer
              </p>
            </div>

            <div className="p-5 border border-vintage-ink bg-vintage-paper text-left space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">
                Lifetime Paid Out
              </span>
              <div className="text-3xl font-display font-bold text-vintage-ink">
                ${totalPaidAmount.toFixed(2)}
              </div>
              <p className="text-[10px] italic text-vintage-ink/70">
                Total successfully transferred to PayPal
              </p>
            </div>
          </div>

          {/* SETTLED PAYOUTS LEDGER */}
          <div className="border border-vintage-ink bg-vintage-paper overflow-hidden">
            <div className="p-4 border-b border-vintage-ink bg-vintage-background flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-vintage-ink">
                  Completed Payout Disbursements ({payoutHistory.length})
                </h3>
                <span className="text-[11px] font-serif italic text-vintage-ink/70">
                  Official disbursement receipts to your PayPal account
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 bg-white border border-vintage-ink">
                ${totalPaidAmount.toFixed(2)} Total Settled
              </span>
            </div>

            {payoutHistory.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Wallet size={28} className="mx-auto text-vintage-ink/30" />
                <p className="text-sm font-bold text-vintage-ink">No historical payouts yet</p>
                <p className="text-xs font-serif italic text-vintage-ink/60 max-w-sm mx-auto">
                  When your cleared balance reaches $50.00 USD on the 1st of the month, payments are disbursed to {affiliate.paypal_email} and documented here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-ink bg-vintage-background/40 font-mono uppercase text-[10px] text-vintage-ink/70">
                      <th className="p-3">Payout Date</th>
                      <th className="p-3">Reference / Batch ID</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Orders Settled</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/20 font-mono">
                    {payoutHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-vintage-ink/5 transition-colors">
                        <td className="p-3 text-vintage-ink/80 text-[11px] whitespace-nowrap">
                          {new Date(p.paid_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-3 font-mono font-bold text-vintage-accent truncate max-w-[180px]">
                          {p.payout_batch_id}
                        </td>
                        <td className="p-3 text-vintage-ink/80 truncate max-w-[200px]">
                          {affiliate.paypal_email}
                        </td>
                        <td className="p-3 text-right font-bold text-green-900 text-sm">
                          ${p.amount.toFixed(2)} {p.currency}
                        </td>
                        <td className="p-3 text-center">
                          {p.commission_count}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border border-green-800 text-green-900 bg-green-50">
                            <Check size={10} /> Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: ACCOUNT & PAYOUT SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="border border-vintage-ink bg-vintage-paper p-6 sm:p-8 space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xl font-display italic text-vintage-ink">
                Partner Account Profile & Payment Configuration
              </h3>
              <p className="text-xs font-serif italic text-vintage-ink/70 mt-1">
                Keep your payout destination, vanity credentials, and physical address up-to-date.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-4 border border-green-800 bg-green-50 text-green-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {settingsSuccess}
              </div>
            )}

            {settingsError && (
              <div className="p-4 border border-red-800 bg-red-50 text-red-900 text-xs font-bold flex items-center gap-2">
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
                  Alphanumeric only (3–20 chars). Updating your code syncs your vanity URL and promo coupon (<code className="font-bold">{editVanityCode || 'CODE'}10</code>).
                </span>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink">
                  <Phone size={14} className="text-vintage-accent" /> Phone Number (With Dial Code)
                </label>
                <div className="flex border border-vintage-ink bg-vintage-paper">
                  <PhoneDialCombobox
                    value={editPhoneCode}
                    onChange={setEditPhoneCode}
                    theme="vintage"
                  />
                  <input 
                    type="tel"
                    required
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="81234567890"
                    className="w-full px-4 py-3 font-mono text-sm font-bold outline-none bg-transparent text-vintage-ink"
                  />
                </div>
              </div>

              {/* Physical Address Section */}
              <div className="p-4 border border-vintage-ink bg-vintage-background/60 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-vintage-accent block flex items-center gap-1.5">
                  <MapPin size={14} /> Physical Address / Tax Verification
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                      Country (Type to search or choose)
                    </label>
                    <CountryCombobox
                      value={editCountry}
                      onChange={handleCountryChange}
                      theme="vintage"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                      State / Province
                    </label>
                    {provinceOptions.length > 0 ? (
                      <select
                        value={editStateProvince}
                        onChange={(e) => setEditStateProvince(e.target.value)}
                        className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none cursor-pointer text-vintage-ink"
                      >
                        {provinceOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={editStateProvince}
                        onChange={(e) => setEditStateProvince(e.target.value)}
                        placeholder="State or Region" 
                        required
                        className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                      City / District
                    </label>
                    <input 
                      type="text" 
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="e.g. Jakarta Selatan" 
                      required
                      className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                      Postal / ZIP Code
                    </label>
                    <input 
                      type="text" 
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      placeholder="e.g. 12190" 
                      required
                      className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                    Street Address
                  </label>
                  <input 
                    type="text" 
                    value={editStreetAddress}
                    onChange={(e) => setEditStreetAddress(e.target.value)}
                    placeholder="Street name, suite, unit, building" 
                    required
                    className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                  />
                </div>
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
                    if (affiliate.phone_code) setEditPhoneCode(affiliate.phone_code);
                    if (affiliate.phone_number) setEditPhoneNumber(affiliate.phone_number);
                    if (affiliate.country) setEditCountry(affiliate.country);
                    if (affiliate.state_province) setEditStateProvince(affiliate.state_province);
                    if (affiliate.city) setEditCity(affiliate.city);
                    if (affiliate.postal_code) setEditPostalCode(affiliate.postal_code);
                    if (affiliate.street_address) setEditStreetAddress(affiliate.street_address);
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
