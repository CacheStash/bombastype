/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap, Coins, ArrowRight, Copy, Check, Tag, MapPin, Phone, UserCheck, RefreshCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { COUNTRIES, PROVINCES_BY_COUNTRY, getDummyAffiliateData, syncAffiliateCoupon, findCountryByName, getCitiesForState, detectClientLocation } from '../utils/affiliateGeo';
import { CountryCombobox } from '../components/CountryCombobox';
import { PhoneDialCombobox } from '../components/PhoneDialCombobox';
import { InContextCardWrapper, InContextAddSectionButton } from '../components/admin/InContextCardWrapper';

interface ContentItem {
  id?: string;
  title: string;
  content: string;
  section_id: string;
  category: string;
  sort_order: number;
  type?: string;
}

const AffiliateLanding: React.FC = () => {
  const [affiliateItems, setAffiliateItems] = useState<ContentItem[]>([]);

  const fetchAffiliateContent = async () => {
    try {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'affiliate')
        .order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        setAffiliateItems(data);
      }
    } catch (err) {
      console.error('Failed to load affiliate site content:', err);
    }
  };

  useEffect(() => {
    fetchAffiliateContent();
  }, []);

  const getItem = (secId: string, fallbackTitle: string, fallbackContent: string) => {
    const found = affiliateItems.find(i => i.section_id === secId || i.section_id === secId.replace('AF', ''));
    if (found) {
      return {
        id: found.id,
        title: found.title || fallbackTitle,
        content: found.content || fallbackContent,
        section_id: found.section_id || secId,
        category: 'affiliate',
        sort_order: found.sort_order ?? 0,
        type: found.type || 'page'
      };
    }
    return {
      title: fallbackTitle,
      content: fallbackContent,
      section_id: secId,
      category: 'affiliate',
      sort_order: parseInt(secId.replace('AF', '')) - 1 || 0,
      type: 'page'
    };
  };

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [existingAffiliate, setExistingAffiliate] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [codeAvailability, setCodeAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Phone & Address State (Defaulted to US)
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('United States');
  const [stateProvince, setStateProvince] = useState('California');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Client location auto-suggestion for country & dial code
    detectClientLocation().then((geo) => {
      setCountry(prev => (prev === 'United States' ? geo.country : prev));
      setPhoneCode(prev => (prev === '+1' ? geo.phoneCode : prev));
      if (geo.stateProvince) {
        setStateProvince(prev => (prev === 'California' ? geo.stateProvince : prev));
      }
    }).catch(() => {});
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

        // Pre-fill full name and address from fontbuyer if exists
        const { data: buyer } = await supabase
          .from('fontbuyer')
          .select('full_name, address')
          .eq('id', user.id)
          .maybeSingle();
        if (buyer?.full_name) setFullName(buyer.full_name);

        if (data) {
          setExistingAffiliate(data);
          setAffiliateCode(data.affiliate_code || '');
          setPaypalEmail(data.paypal_email || user.email || '');
          if (data.phone_code) setPhoneCode(data.phone_code);
          if (data.phone_number) setPhoneNumber(data.phone_number);
          if (data.country) {
            setCountry(data.country);
            if (data.state_province) setStateProvince(data.state_province);
          }
          if (data.city) setCity(data.city);
          if (data.postal_code) setPostalCode(data.postal_code);
          if (data.street_address) setStreetAddress(data.street_address);
        } else {
          // Pre-fill dummy data for test account gotrainer19
          const dummy = getDummyAffiliateData(user.email);
          if (dummy) {
            setAffiliateCode(dummy.affiliate_code);
            setPaypalEmail(dummy.paypal_email);
            setPhoneCode(dummy.phone_code);
            setPhoneNumber(dummy.phone_number);
            setCountry(dummy.country);
            setStateProvince(dummy.state_province);
            setCity(dummy.city);
            setPostalCode(dummy.postal_code);
            setStreetAddress(dummy.street_address);
          } else if (buyer?.address) {
            setStreetAddress(buyer.address);
          }
        }
      }
    };
    checkAuthAndAffiliate();
  }, []);

  // Real-time custom slug code availability checker
  useEffect(() => {
    const clean = affiliateCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (clean.length < 3) {
      setCodeAvailability('idle');
      return;
    }
    setCodeAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        if (existingAffiliate?.affiliate_code && existingAffiliate.affiliate_code.toUpperCase() === clean) {
          setCodeAvailability('available');
          return;
        }

        const { data: isTaken, error } = await supabase.rpc('affiliate_code_exists', {
          check_code: clean
        });

        if (error) {
          console.warn('RPC affiliate_code_exists check failed:', error.message);
          setCodeAvailability('idle');
          return;
        }

        if (isTaken) {
          setCodeAvailability('taken');
        } else {
          setCodeAvailability('available');
        }
      } catch (_) {
        setCodeAvailability('idle');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [affiliateCode, sessionUser, existingAffiliate]);

  const handleCountryChange = (selectedCountry: string, dialCode?: string) => {
    setCountry(selectedCountry);
    if (dialCode) {
      setPhoneCode(dialCode);
    } else {
      const countryObj = findCountryByName(selectedCountry);
      if (countryObj) {
        setPhoneCode(countryObj.dial);
      }
    }
    const provinces = PROVINCES_BY_COUNTRY[selectedCountry];
    if (provinces && provinces.length > 0) {
      setStateProvince(provinces[0]);
    } else {
      setStateProvince('');
    }
    setCity('');
  };

  const handleRegisterAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!sessionUser) {
      navigate('/user/auth');
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Legal Full Name is required for affiliate partner verification and tax compliance.');
      return;
    }

    const cleanCode = affiliateCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 3 || cleanCode.length > 20) {
      setErrorMsg('Affiliate code must be 3-20 alphanumeric characters (A-Z, 0-9, dash, underscore).');
      return;
    }

    if (codeAvailability === 'taken') {
      setErrorMsg(`The partner code "${cleanCode}" is already taken by another creator. Please pick another.`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail.trim())) {
      setErrorMsg('Please enter a valid PayPal email address for payouts.');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMsg('Phone number is required to complete your partner profile.');
      return;
    }

    if (!country.trim() || !stateProvince.trim() || !city.trim() || !postalCode.trim() || !streetAddress.trim()) {
      setErrorMsg('All physical address details (Country, State/Province, City, Postal Code, Street Address) are required for partner payouts.');
      return;
    }

    if (!agreed) {
      setErrorMsg('You must agree to the Affiliate Partner Terms.');
      return;
    }

    setLoading(true);
    try {
      // Check if code taken by someone else
      if (!existingAffiliate?.affiliate_code || existingAffiliate.affiliate_code.toUpperCase() !== cleanCode) {
        const { data: isTaken } = await supabase.rpc('affiliate_code_exists', {
          check_code: cleanCode
        });

        if (isTaken) {
          throw new Error('This partner code is already reserved by another creator. Please pick another.');
        }
      }

      const fullPayload = {
        user_id: sessionUser.id,
        affiliate_code: cleanCode,
        paypal_email: paypalEmail.trim().toLowerCase(),
        phone_code: phoneCode,
        phone_number: phoneNumber.trim(),
        country: country.trim(),
        state_province: stateProvince.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        street_address: streetAddress.trim(),
        status: 'active',
        commission_rate: 0.20,
        updated_at: new Date().toISOString()
      };

      let affRecord: any = null;
      const { data, error } = await supabase
        .from('affiliates')
        .upsert(fullPayload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.warn('Upsert with full address fields failed, falling back to base fields:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
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
        if (fallbackError) throw fallbackError;
        affRecord = fallbackData;
      } else {
        affRecord = data;
      }

      // Two-Way Sync to fontbuyer (Primary Buyer Profile)
      const fullAddress = [
        streetAddress.trim(),
        city.trim(),
        [stateProvince.trim(), postalCode.trim()].filter(Boolean).join(' '),
        country.trim()
      ].filter(Boolean).join(', ');

      await supabase.from('fontbuyer').upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: fullName.trim(),
        address: fullAddress
      });

      // Automatically generate/sync the 10% OFF promo coupon for their audience
      await syncAffiliateCoupon(supabase, affRecord.id, cleanCode);

      setExistingAffiliate(affRecord);
      setSuccessMsg('Your affiliate partnership is active! Your vanity link and audience coupon are ready.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate partner account.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = existingAffiliate 
    ? `${window.location.origin}/c/${existingAffiliate.affiliate_code}` 
    : '';

  const couponCode = existingAffiliate 
    ? `${existingAffiliate.affiliate_code}10` 
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCoupon = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  const provinceOptions = PROVINCES_BY_COUNTRY[country] || [];
  const cityOptions = getCitiesForState(country, stateProvince);

  return (
    <div className="min-h-screen bg-vintage-paper py-12 px-6 md:px-12 flex flex-col items-center text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper">
      
      {/* HEADER TOOLS */}
      <div className="w-full max-w-5xl mb-8 flex justify-between items-center text-xs font-bold">
        <Link to="/" className="flex items-center gap-2 hover:text-vintage-accent transition-colors tracking-widest uppercase text-vintage-ink">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
        <span className="border border-vintage-ink px-3 py-1 uppercase tracking-widest text-xs font-bold bg-vintage-background text-vintage-ink">
          Affiliate Program · 20% Net Commission
        </span>
      </div>

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-5xl border border-vintage-ink bg-vintage-paper relative flex flex-col items-center overflow-hidden">
        
        {/* HERO SECTION */}
        <div className="w-full p-8 md:p-16 text-center border-b border-vintage-ink">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4"
          >
            Type Foundry Associate Program
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display mb-6 leading-tight text-vintage-ink"
          >
            Recommend Typefaces,<br />
            <span className="italic font-normal">Earn 20% Net Commission.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-vintage-ink max-w-2xl mx-auto leading-relaxed"
          >
            Partner with BombasType. Share artisanal display typefaces with designers, studios, and agencies. 
            Receive automatic payouts directly to your PayPal account every month.
          </motion.p>
        </div>

        {/* 3 PILLARS / HOW IT WORKS */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 border-b border-vintage-ink divide-y md:divide-y-0 md:divide-x divide-vintage-ink">
          {(() => {
            const a1 = getItem('AF01', 'Vanity Link & Promo Coupon', 'Receive a clean vanity URL (<code class="font-mono font-bold text-xs bg-vintage-ink/10 px-1.5 py-0.5 text-vintage-ink">bombastype.com/c/NAME</code>) plus an auto-generated 10% OFF discount coupon for your followers.');
            return (
              <InContextCardWrapper item={a1} category="affiliate" pagePath="/affiliate" onRefresh={fetchAffiliateContent}>
                <div className="p-8 text-center space-y-3 h-full">
                  <span className="w-10 h-10 mx-auto rounded-full border border-vintage-ink flex items-center justify-center font-display text-lg bg-vintage-background text-vintage-ink">1</span>
                  <h3 className="font-display text-xl text-vintage-ink">{a1.title}</h3>
                  <div className="text-sm text-vintage-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: a1.content }} />
                </div>
              </InContextCardWrapper>
            );
          })()}

          {(() => {
            const a2 = getItem('AF02', 'Share With Designers', 'Share in your specimens, client presentations, or social channels. Visitors are attributed via 30-day server cookies or upon coupon redemption.');
            return (
              <InContextCardWrapper item={a2} category="affiliate" pagePath="/affiliate" onRefresh={fetchAffiliateContent}>
                <div className="p-8 text-center space-y-3 h-full">
                  <span className="w-10 h-10 mx-auto rounded-full border border-vintage-ink flex items-center justify-center font-display text-lg bg-vintage-background text-vintage-ink">2</span>
                  <h3 className="font-display text-xl text-vintage-ink">{a2.title}</h3>
                  <div className="text-sm text-vintage-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: a2.content }} />
                </div>
              </InContextCardWrapper>
            );
          })()}

          {(() => {
            const a3 = getItem('AF03', 'Monthly PayPal Payout', 'Earn 20% on every license sold. After a 14-day warranty holding period, earnings are paid automatically via PayPal once balance reaches $50.');
            return (
              <InContextCardWrapper item={a3} category="affiliate" pagePath="/affiliate" onRefresh={fetchAffiliateContent}>
                <div className="p-8 text-center space-y-3 h-full">
                  <span className="w-10 h-10 mx-auto rounded-full border border-vintage-ink flex items-center justify-center font-display text-lg bg-vintage-background text-vintage-ink">3</span>
                  <h3 className="font-display text-xl text-vintage-ink">{a3.title}</h3>
                  <div className="text-sm text-vintage-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: a3.content }} />
                </div>
              </InContextCardWrapper>
            );
          })()}
        </div>

        {/* ONBOARDING FORM / STATUS SECTION */}
        <div className="w-full p-8 md:p-14 max-w-3xl mx-auto">
          {existingAffiliate ? (
            /* ACTIVE AFFILIATE CARD */
            <div className="border border-vintage-ink/20 p-8 bg-vintage-background space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink pb-4">
                <div>
                  <span className="text-xs font-bold text-vintage-accent uppercase tracking-[0.25em] block mb-1">Affiliate Account Status</span>
                  <h4 className="text-2xl font-display text-vintage-ink">Active Affiliate ({existingAffiliate.affiliate_code})</h4>
                </div>
                <Link 
                  to="/user/dashboard" 
                  className="vintage-btn py-2 px-4 text-xs tracking-widest flex items-center gap-2 w-fit font-bold"
                >
                  OPEN USER DASHBOARD <ArrowRight size={14} />
                </Link>
              </div>

              {/* DUAL PROMO TOOLS: VANITY LINK + AUDIENCE COUPON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TOOL 1: VANITY LINK */}
                <div className="p-4 bg-white border border-vintage-ink space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent block">
                      1. Vanity Share URL
                    </span>
                    <span className="text-[9px] font-mono text-vintage-ink/70">30-day cookie</span>
                  </div>
                  <div className="flex items-center gap-2 bg-vintage-paper p-1.5 border border-vintage-ink">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareUrl} 
                      className="w-full bg-transparent font-mono text-xs outline-none text-vintage-ink font-bold truncate"
                    />
                    <button 
                      onClick={handleCopyLink}
                      className="vintage-btn py-1 px-2.5 text-[10px] tracking-widest flex items-center gap-1 shrink-0 font-bold"
                    >
                      {copiedLink ? <Check size={12} className="text-green-800" /> : <Copy size={12} />}
                      {copiedLink ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                  <p className="text-[10px] text-vintage-ink leading-tight">
                    Share directly on social media, bios, and font specimen showcase decks.
                  </p>
                </div>

                {/* TOOL 2: AUDIENCE COUPON */}
                <div className="p-4 bg-white border border-vintage-ink space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent block flex items-center gap-1">
                      <Tag size={12} /> 2. Audience Promo Code
                    </span>
                    <span className="text-[9px] font-bold text-green-800 bg-green-100 px-1.5 py-0.5">10% OFF</span>
                  </div>
                  <div className="flex items-center gap-2 bg-vintage-paper p-1.5 border border-vintage-ink">
                    <input 
                      type="text" 
                      readOnly 
                      value={couponCode} 
                      className="w-full bg-transparent font-mono text-xs outline-none text-vintage-ink font-bold tracking-wider"
                    />
                    <button 
                      onClick={handleCopyCoupon}
                      className="vintage-btn py-1 px-2.5 text-[10px] tracking-widest flex items-center gap-1 shrink-0 font-bold"
                    >
                      {copiedCoupon ? <Check size={12} className="text-green-800" /> : <Copy size={12} />}
                      {copiedCoupon ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                  <p className="text-[10px] text-vintage-ink leading-tight">
                    Buyers who apply this code at checkout receive 10% OFF and credit your 20% commission.
                  </p>
                </div>
              </div>

              {/* RECONCILIATION BADGES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-vintage-ink text-center">
                <div className="p-3 bg-white border border-vintage-ink">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink block mb-1">Payout Destination</span>
                  <span className="text-xs font-mono font-bold text-vintage-ink truncate block">{existingAffiliate.paypal_email}</span>
                </div>
                <div className="p-3 bg-white border border-vintage-ink">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink block mb-1">Commission Rate</span>
                  <span className="text-sm font-display font-bold text-vintage-ink">{(existingAffiliate.commission_rate * 100).toFixed(0)}% Net</span>
                </div>
                <div className="p-3 bg-white border border-vintage-ink">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink block mb-1">Audience Benefit</span>
                  <span className="text-sm font-display font-bold text-green-900">10% OFF</span>
                </div>
                <div className="p-3 bg-white border border-vintage-ink">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink block mb-1">Holding Window</span>
                  <span className="text-xs font-bold uppercase text-vintage-ink">14-Day Safe</span>
                </div>
              </div>
            </div>
          ) : (
            /* APPLICATION FORM */
            <form onSubmit={handleRegisterAffiliate} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-display text-vintage-ink">Activate Your Associate Membership</h3>
                <p className="text-sm text-vintage-ink">
                  Join our curated network of font partners. Instant approval with your verified buyer account.
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

              {/* LOGGED IN ACCOUNT BADGE */}
              {sessionUser && (
                <div className="p-3 bg-vintage-background border border-vintage-ink flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-vintage-ink">
                    <UserCheck size={16} className="text-green-800" />
                    Verified Account: <span className="font-mono">{sessionUser.email}</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-900 bg-green-100 px-2 py-0.5 border border-green-300">
                    Logged In
                  </span>
                </div>
              )}

              {/* 0. LEGAL FULL NAME */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block flex items-center gap-1.5 font-sans">
                  <UserCheck size={14} className="text-vintage-accent" /> Legal Full Name *
                </label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value.replace(/\b\w/g, l => l.toUpperCase()))}
                  placeholder="e.g. Johnathan Doe" 
                  required
                  className="w-full p-3 border border-vintage-ink bg-white font-sans text-sm outline-none text-vintage-ink font-bold"
                />
                <p className="text-xs text-vintage-ink mt-1 block font-sans">
                  Your legal identity for partner compliance and tax validation. Synced with your buyer account.
                </p>
              </div>

              {/* 1. VANITY SLUG */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block">
                  Requested Partner Code (Vanity Slug & Promo Base) *
                </label>
                <div className="flex items-center border border-vintage-ink bg-white">
                  <span className="px-3 py-3 font-mono text-sm font-bold border-r border-vintage-ink bg-vintage-ink/5 text-vintage-ink">
                    bombastype.com/c/
                  </span>
                  <input 
                    type="text" 
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                    placeholder="YOURNAME" 
                    required
                    className="w-full p-3 font-mono text-sm font-bold uppercase outline-none bg-transparent text-vintage-ink"
                  />
                </div>

                {/* Live Vanity Code Availability Feedback */}
                {codeAvailability === 'checking' && (
                  <span className="text-xs font-sans text-vintage-ink/70 flex items-center gap-1 mt-1">
                    <RefreshCcw size={12} className="animate-spin" /> Checking availability...
                  </span>
                )}
                {codeAvailability === 'available' && (
                  <span className="text-xs font-sans text-emerald-800 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle size={13} /> Partner code "{affiliateCode.trim().toUpperCase()}" is available!
                  </span>
                )}
                {codeAvailability === 'taken' && (
                  <span className="text-xs font-sans text-red-800 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle size={13} /> Partner code "{affiliateCode.trim().toUpperCase()}" is already taken by another creator.
                  </span>
                )}

                <p className="text-xs text-vintage-ink mt-1 block">
                  Creates link <code className="font-bold">/c/{affiliateCode || 'YOURNAME'}</code> and promo code <code className="font-bold">{(affiliateCode || 'YOURNAME')}10</code> (10% OFF for your audience).
                </p>
              </div>

              {/* 2. PAYPAL PAYOUT EMAIL */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block">
                  PayPal Payout Email Address
                </label>
                <input 
                  type="email" 
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="PAYMENTS@YOURDOMAIN.COM" 
                  required
                  className="w-full p-3 border border-vintage-ink bg-white font-mono text-sm outline-none text-vintage-ink font-bold"
                />
                <p className="text-xs text-vintage-ink mt-1 block">
                  Official payout destination for all cleared 20% Net commission transfers.
                </p>
              </div>

              {/* 3. PHONE NUMBER WITH COUNTRY DIAL CODE */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block flex items-center gap-1.5">
                  <Phone size={14} /> Phone Number
                </label>
                <div className="flex border border-vintage-ink bg-white">
                  <PhoneDialCombobox
                    value={phoneCode}
                    onChange={setPhoneCode}
                    theme="vintage"
                  />
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="4155550198" 
                    required
                    className="w-full p-3 font-mono text-sm font-bold outline-none bg-transparent text-vintage-ink"
                  />
                </div>
              </div>

              {/* 4. ADDRESS INFORMATION */}
              <div className="p-4 border border-vintage-ink bg-vintage-background/60 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-vintage-accent block flex items-center gap-1.5">
                  <MapPin size={14} /> Physical Address / Billing Location
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                      Country (Type to search or choose)
                    </label>
                    <CountryCombobox
                      value={country}
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
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
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
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
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
                      list="affiliate-landing-city-list"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. San Francisco" 
                      required
                      className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                    />
                    {cityOptions.length > 0 && (
                      <datalist id="affiliate-landing-city-list">
                        {cityOptions.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block">
                      Postal / ZIP Code
                    </label>
                    <input 
                      type="text" 
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 94105" 
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
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 525 Market St, Suite 3200" 
                    required
                    className="w-full p-2.5 border border-vintage-ink bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                  />
                </div>
              </div>

              {/* TERMS DISCLOSURE */}
              <div className="p-5 border border-vintage-ink bg-vintage-background space-y-3 text-sm leading-relaxed text-vintage-ink">
                <p className="font-bold uppercase tracking-wider text-xs text-vintage-accent block">
                  Partner Terms & Operational Standards:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-vintage-ink">
                  <li>Commission is <strong>20% of net received sales</strong> (calculated after PayPal processing fees).</li>
                  <li>All commissions are held in a <strong>14-day clearance window</strong> to protect against customer refund disputes.</li>
                  <li>Minimum payout threshold is <strong>$50.00 USD</strong>. Outbound PayPal Payout processing fees are deducted at disbursement.</li>
                  <li>Self-purchasing using your own affiliate link or coupon is strictly prohibited and subject to commission voiding.</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 accent-vintage-ink" 
                />
                <span className="text-sm text-vintage-ink font-medium">
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

        <div className="h-4 w-full bg-vintage-ink/5 border-t border-vintage-ink" />
      </div>

      <InContextAddSectionButton category="affiliate" pagePath="/affiliate" onRefresh={fetchAffiliateContent} />

      <div className="mt-8 text-xs font-bold tracking-[0.3em] text-vintage-ink uppercase">
        ** BombasType Affiliate Partner Program **
      </div>
    </div>
  );
};

export default AffiliateLanding;
