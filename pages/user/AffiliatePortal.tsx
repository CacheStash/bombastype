/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Copy, Check, ArrowRight, Clock, CheckCircle2, DollarSign, CircleDollarSign,
  AlertCircle, Share2, ExternalLink, Settings, Save, Mail, Hash,
  Tag, MapPin, Phone, Calendar, Wallet, ChevronRight, FileText,
  Zap, RefreshCw, X, Sparkles, Info, ShieldCheck, Percent, Timer, Award, Star, UserCheck, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  COUNTRIES, 
  PROVINCES_BY_COUNTRY, 
  getDummyAffiliateData, 
  syncAffiliateCoupon, 
  checkCouponAvailability,
  findCountryByName,
  getNextMonthlyPayoutDate,
  AFFILIATE_MIN_PAYOUT_USD,
  getCitiesForState,
  detectClientLocation
} from '../../utils/affiliateGeo';
import { calculateAffiliateMilestone, getClaimedMilestones, getAffiliateEarningBadge } from '../../utils/affiliateMilestone';
import { CountryCombobox } from '../../components/CountryCombobox';
import { PhoneDialCombobox } from '../../components/PhoneDialCombobox';

interface PayoutItem {
  id: string;
  paid_at: string;
  amount: number;
  fee?: number;
  net_amount?: number;
  currency: string;
  payout_batch_id: string;
  commission_count: number;
  status: string;
  notes?: string;
}

interface AffiliatePortalProps {
  isActive?: boolean;
}

const AffiliatePortal: React.FC<AffiliatePortalProps> = ({ isActive = true }) => {
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstMount = React.useRef(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'settings'>('overview');
  const [salesPage, setSalesPage] = useState(1);
  const SALES_PER_PAGE = 10;
  const [payoutPage, setPayoutPage] = useState(1);
  const PAYOUTS_PER_PAGE = 10;

  // Account Settings Form State (Defaulted to US)
  const [editFullName, setEditFullName] = useState('');
  const [originalFullName, setOriginalFullName] = useState('');
  const [editPaypalEmail, setEditPaypalEmail] = useState('');
  const [editVanityCode, setEditVanityCode] = useState('');
  const [vanityCodeAvailability, setVanityCodeAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [editPhoneCode, setEditPhoneCode] = useState('+1');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editCountry, setEditCountry] = useState('United States');
  const [editStateProvince, setEditStateProvince] = useState('California');
  const [editCity, setEditCity] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editStreetAddress, setEditStreetAddress] = useState('');
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);

  const [savingSettings, setSavingSettings] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawInputAmount, setWithdrawInputAmount] = useState('50.00');
  const [withdrawSuccess, setWithdrawSuccess] = useState<{
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    receiver: string;
    batchId: string;
  } | null>(null);
  const [withdrawError, setWithdrawError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Custom Coupon & Discount State (10% to 30%)
  const [affiliateCoupon, setAffiliateCoupon] = useState<any>(null);
  const [couponCodeCustom, setCouponCodeCustom] = useState('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(10);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; message: string } | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>('');

  const nextPayoutInfo = getNextMonthlyPayoutDate();

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchAffiliateData(false);
    } else if (isActive) {
      // Re-activated via tab switch: do a silent background sync!
      fetchAffiliateData(true);
    }
  }, [isActive]);

  const fetchAffiliateData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');

      // 1. Fetch legal full name from fontbuyer profile, fallback to user metadata
      let resolvedName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      try {
        const { data: buyerData } = await supabase
          .from('fontbuyer')
          .select('full_name, address')
          .eq('id', user.id)
          .maybeSingle();

        if (buyerData?.full_name) {
          resolvedName = buyerData.full_name;
        }
      } catch (_) {}

      if (resolvedName) {
        setEditFullName(resolvedName);
        setOriginalFullName(resolvedName);
      }

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

        // Auto Payout Preference
        const cachedPref = localStorage.getItem(`aff_auto_payout_${affData.id}`);
        if (affData.auto_payout_enabled !== undefined && affData.auto_payout_enabled !== null) {
          setAutoPayoutEnabled(affData.auto_payout_enabled !== false);
        } else if (cachedPref !== null) {
          setAutoPayoutEnabled(cachedPref === '1');
        } else {
          setAutoPayoutEnabled(true);
        }

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

        // Fetch active affiliate coupon
        try {
          const { data: couponRow } = await supabase
            .from('coupons')
            .select('*')
            .eq('affiliate_id', affData.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (couponRow) {
            setAffiliateCoupon(couponRow);
            setCouponCodeCustom(couponRow.code);
            setCouponDiscountPercent(Number(couponRow.discount_value || couponRow.discount_percentage || 10));
          } else {
            // Fallback: Check if coupon exists matching affiliate_code pattern
            const defaultCode = `${affData.affiliate_code || ''}10`;
            const { data: fallbackCoup } = await supabase
              .from('coupons')
              .select('*')
              .ilike('code', defaultCode)
              .eq('is_active', true)
              .maybeSingle();

            if (fallbackCoup) {
              setAffiliateCoupon(fallbackCoup);
              setCouponCodeCustom(fallbackCoup.code);
              setCouponDiscountPercent(Number(fallbackCoup.discount_value || fallbackCoup.discount_percentage || 10));
            } else {
              setCouponCodeCustom(defaultCode);
              setCouponDiscountPercent(10);
            }
          }
        } catch (_) {
          setCouponCodeCustom(`${affData.affiliate_code || ''}10`);
          setCouponDiscountPercent(10);
        }

        // Fetch commissions
        const { data: commData } = await supabase
          .from('affiliate_commissions')
          .select('*')
          .eq('affiliate_id', affData.id)
          .order('created_at', { ascending: false });

        // Query font_history metadata for attribution details
        const orderIds = (commData || []).map(c => c.order_id).filter(Boolean);
        const orderMetaMap = new Map<string, any>();
        if (orderIds.length > 0) {
          try {
            const { data: histData } = await supabase
              .from('font_history')
              .select('transaction_id, metadata')
              .in('transaction_id', orderIds);
            (histData || []).forEach((h: any) => {
              if (h.transaction_id && h.metadata) {
                orderMetaMap.set(h.transaction_id, h.metadata);
              }
            });
          } catch (_) {}
        }

        const loadedComms = (commData || []).map((c: any) => {
          const meta = orderMetaMap.get(c.order_id);
          return {
            ...c,
            coupon_code: c.coupon_code || meta?.coupon_code || null,
            attribution_type: c.attribution_type || meta?.attribution_type || (meta?.coupon_code ? 'coupon' : 'referral_link')
          };
        });
        setCommissions(loadedComms);

        // Fetch Payouts History (try table first, fallback to synthesized)
        try {
          const { data: pData } = await supabase
            .from('affiliate_payouts')
            .select('*')
            .eq('affiliate_id', affData.id)
            .order('paid_at', { ascending: false });

          if (pData && pData.length > 0) {
            setPayoutHistory(pData.map((p: any) => {
              const amount = Number(p.amount || 0);
              const fee = Number(p.payout_fee ?? p.fee ?? Math.min(20, +(amount * 0.02).toFixed(2)));
              const netAmount = Number(p.net_amount ?? Math.max(0, +(amount - fee).toFixed(2)));
              return {
                id: p.id,
                paid_at: p.paid_at || p.created_at,
                amount,
                fee,
                net_amount: netAmount,
                currency: p.currency || 'USD',
                payout_batch_id: p.payout_batch_id || 'PP-BATCH',
                commission_count: Array.isArray(p.commission_ids) ? p.commission_ids.length : 1,
                status: p.status || 'completed',
                notes: p.notes
              };
            }));
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

  // Real-time custom vanity code availability checker
  useEffect(() => {
    const clean = editVanityCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (clean.length < 3) {
      setVanityCodeAvailability('idle');
      return;
    }
    if (affiliate && clean === affiliate.affiliate_code) {
      setVanityCodeAvailability('idle');
      return;
    }
    setVanityCodeAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('affiliates')
          .select('id, user_id')
          .ilike('affiliate_code', clean)
          .maybeSingle();

        if (data && data.id !== affiliate?.id) {
          setVanityCodeAvailability('taken');
        } else {
          setVanityCodeAvailability('available');
        }
      } catch (_) {
        setVanityCodeAvailability('idle');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [editVanityCode, affiliate]);

  useEffect(() => {
    const pendingComms = commissions.filter(c => c.status === 'pending_clearance' && new Date(c.cleared_at) > new Date());
    if (pendingComms.length === 0) {
      setCountdownStr('');
      return;
    }
    const earliestTime = Math.min(...pendingComms.map(c => new Date(c.cleared_at).getTime()));

    const updateCountdown = () => {
      const diff = earliestTime - Date.now();
      if (diff <= 0) {
        setCountdownStr('Clearing now...');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setCountdownStr(parts.join(' '));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [commissions]);

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
      // Group per withdrawal event (batch ID, payout reference, or exact ISO timestamp)
      const withdrawKey = c.payout_batch_id || c.payout_reference || (c.paid_at ? c.paid_at.substring(0, 19) : `item-${c.id}`);
      const existing = groupMap.get(withdrawKey) || {
        id: withdrawKey,
        paid_at: c.paid_at || c.created_at,
        amount: 0,
        count: 0,
        reference: c.payout_batch_id || c.payout_reference || 'PP-DISBURSEMENT'
      };
      existing.amount += Number(c.commission_amount || 0);
      existing.count += 1;
      groupMap.set(withdrawKey, existing);
    });

    const list = Array.from(groupMap.values()).map(g => {
      const total = Number(g.amount || 0);
      const fee = +(Math.min(20, total * 0.02)).toFixed(2);
      const netAmount = +(Math.max(0, total - fee)).toFixed(2);
      return {
        id: g.id,
        paid_at: g.paid_at,
        amount: total,
        fee,
        net_amount: netAmount,
        currency: 'USD',
        payout_batch_id: g.reference,
        commission_count: g.count,
        status: 'completed'
      };
    });

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
    setEditCity('');
  };

  const toggleAutoPayout = async () => {
    const nextVal = !autoPayoutEnabled;
    setAutoPayoutEnabled(nextVal);
    if (affiliate?.id) {
      localStorage.setItem(`aff_auto_payout_${affiliate.id}`, nextVal ? '1' : '0');
      try {
        await supabase
          .from('affiliates')
          .update({ auto_payout_enabled: nextVal, updated_at: new Date().toISOString() })
          .eq('id', affiliate.id);
      } catch (e) {
        console.warn("Direct toggle update error:", e);
      }
    }
  };

  const handleCheckCouponAvailability = async () => {
    if (!couponCodeCustom || couponCodeCustom.trim().length < 3) {
      setAvailabilityResult({ available: false, message: 'Please enter at least 3 characters.' });
      return;
    }
    setCheckingAvailability(true);
    setAvailabilityResult(null);
    try {
      const res = await checkCouponAvailability(supabase, couponCodeCustom, affiliate?.id);
      setAvailabilityResult(res);
    } catch (e: any) {
      setAvailabilityResult({ available: false, message: e.message || 'Check failed.' });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');

    if (!editFullName.trim() || editFullName.trim().length < 2) {
      setSettingsError('Legal Full Name is required for partner compliance and payout verification.');
      return;
    }

    const cleanEmail = editPaypalEmail.trim().toLowerCase();
    const cleanCode = editVanityCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setSettingsError('Please provide a valid PayPal email address for payouts.');
      return;
    }

    if (cleanCode.length < 3 || cleanCode.length > 20) {
      setSettingsError('Vanity code must be between 3 and 20 alphanumeric characters (A-Z, 0-9, dash, underscore).');
      return;
    }

    if (vanityCodeAvailability === 'taken') {
      setSettingsError(`The vanity code "${cleanCode}" is already taken by another creator. Please select another.`);
      return;
    }

    if (!editPhoneNumber.trim()) {
      setSettingsError('Phone number is required for partner identification.');
      return;
    }

    if (!editCountry.trim() || !editStateProvince.trim() || !editCity.trim() || !editPostalCode.trim() || !editStreetAddress.trim()) {
      setSettingsError('All physical address details (Country, State/Province, City, Postal Code, Street Address) are required for partner compliance.');
      return;
    }

    setSavingSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication session expired. Please sign in again.");

      const res = await fetch('/api/affiliate/save-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          paypalEmail: cleanEmail,
          affiliateCode: cleanCode,
          phoneCode: editPhoneCode,
          phoneNumber: editPhoneNumber.trim(),
          country: editCountry.trim(),
          stateProvince: editStateProvince.trim(),
          city: editCity.trim(),
          postalCode: editPostalCode.trim(),
          streetAddress: editStreetAddress.trim(),
          autoPayoutEnabled: autoPayoutEnabled,
          customCouponCode: couponCodeCustom.trim().toUpperCase(),
          couponDiscount: couponDiscountPercent
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to save settings.');
      }

      if (data.affiliate) {
        setAffiliate(data.affiliate);
        setEditPaypalEmail(data.affiliate.paypal_email || '');
        setEditVanityCode(data.affiliate.affiliate_code || '');
      }
      if (data.fullName) {
        setEditFullName(data.fullName);
        setOriginalFullName(data.fullName);
      }
      if (data.coupon) {
        setAffiliateCoupon(data.coupon);
        setCouponCodeCustom(data.coupon.code);
        setCouponDiscountPercent(Number(data.coupon.discount_value || data.coupon.discount_percentage || 10));
      }

      localStorage.setItem(`aff_auto_payout_${affiliate.id}`, autoPayoutEnabled ? '1' : '0');
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
        Loading affiliate dashboard...
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="border border-vintage-ink/20 p-10 bg-vintage-paper text-center space-y-5">
        <Share2 size={36} className="mx-auto text-vintage-accent" />
        <div className="space-y-2">
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-vintage-ink">Join the BombasType Affiliate Program</h3>
          <p className="text-sm font-sans font-medium text-vintage-ink max-w-lg mx-auto leading-relaxed">
            Recommend our fonts to your audience and receive 20% net commission on every font license purchased.
          </p>
        </div>
        <div>
          <Link 
            to="/affiliate" 
            className="vintage-btn py-3 px-8 text-xs font-bold tracking-widest inline-flex items-center gap-2 uppercase"
          >
            <Share2 size={14} /> Join Affiliate
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/c/${affiliate.affiliate_code}`;
  const couponCode = couponCodeCustom || (affiliateCoupon?.code) || `${affiliate.affiliate_code}${couponDiscountPercent}`;

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

  // Total Disbursed / Settled (Gross and Net after PayPal outbound fee)
  const totalPaidGross = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const totalNetPaidAmount = payoutHistory.length > 0
    ? payoutHistory.reduce((sum, p) => sum + Number(p.net_amount ?? (p.amount - (p.fee || 0))), 0)
    : Math.max(0, +(totalPaidGross - Math.min(20, totalPaidGross * 0.02)).toFixed(2));

  // Gross referral sales & Milestone reward calculations
  const totalGrossSales = commissions.reduce((sum, c) => sum + Number(c.gross_amount || 0), 0);
  const claimedMilestones = affiliate ? getClaimedMilestones(affiliate.id, Math.floor(totalGrossSales / 1000)) : [];
  const milestoneInfo = calculateAffiliateMilestone(totalGrossSales, claimedMilestones);
  const earningBadge = getAffiliateEarningBadge(totalGrossSales);

  const isQualifiedForPayout = readyAmount >= AFFILIATE_MIN_PAYOUT_USD;
  const thresholdPercentage = Math.min(100, (readyAmount / AFFILIATE_MIN_PAYOUT_USD) * 100);
  const remainingForThreshold = Math.max(0, AFFILIATE_MIN_PAYOUT_USD - readyAmount);

  const provinceOptions = PROVINCES_BY_COUNTRY[editCountry] || [];
  const cityOptions = getCitiesForState(editCountry, editStateProvince);

  const handleOpenWithdrawModal = () => {
    if (readyAmount < AFFILIATE_MIN_PAYOUT_USD) {
      alert(`Minimum withdrawal amount is $${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD. Your cleared balance is currently $${readyAmount.toFixed(2)} USD.`);
      return;
    }
    setWithdrawInputAmount(readyAmount.toFixed(2));
    setWithdrawError('');
    setWithdrawSuccess(null);
    setShowWithdrawModal(true);
  };

  // Safe fallback alias for any button referencing the legacy name
  const handleInstantWithdraw = handleOpenWithdrawModal;

  const executeWithdrawal = async () => {
    const targetAmt = Number(withdrawInputAmount);
    if (isNaN(targetAmt) || targetAmt < AFFILIATE_MIN_PAYOUT_USD) {
      setWithdrawError(`Minimum withdrawal amount is $${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD.`);
      return;
    }
    if (targetAmt > readyAmount + 0.001) {
      setWithdrawError(`Requested amount ($${targetAmt.toFixed(2)}) exceeds your cleared balance ($${readyAmount.toFixed(2)}).`);
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const res = await fetch('/api/affiliate/request-withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ amount: targetAmt })
      });

      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.message || data.error || "Withdrawal failed.");

      await fetchAffiliateData();
      setWithdrawSuccess({
        grossAmount: Number(data.grossAmount || targetAmt),
        feeAmount: Number(data.feeAmount || 0),
        netAmount: Number(data.netAmount || data.amount || targetAmt),
        receiver: data.receiver || affiliate.paypal_email,
        batchId: data.payoutBatchId || ''
      });
    } catch (err: any) {
      setWithdrawError(err.message || "Withdrawal failed. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const totalSalesPages = Math.ceil(commissions.length / SALES_PER_PAGE) || 1;
  const paginatedCommissions = commissions.slice((salesPage - 1) * SALES_PER_PAGE, salesPage * SALES_PER_PAGE);

  const totalPayoutPages = Math.ceil(payoutHistory.length / PAYOUTS_PER_PAGE) || 1;
  const paginatedPayouts = payoutHistory.slice((payoutPage - 1) * PAYOUTS_PER_PAGE, payoutPage * PAYOUTS_PER_PAGE);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-vintage-ink">
      
      {/* HEADER SECTION WITH SUB-NAV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-6">
        <div className="flex items-center gap-3.5">
          {/* EARNING BADGE (Envato Style Star/Medal with Tier Number) */}
          <div 
            className="group relative flex items-center justify-center shrink-0 cursor-help"
            title={earningBadge.hasEarned 
              ? `${earningBadge.label} (Total Gross Sales: $${totalGrossSales.toFixed(2)})`
              : `Creator Earning Badge: Reach $100 gross sales to unlock Level 1 (Current: $${totalGrossSales.toFixed(2)})`}
          >
            <div className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center border transition-all ${
              earningBadge.hasEarned 
                ? 'bg-gradient-to-br from-[#F5DFB3] via-[#D4AF37] to-[#8E6D38] border-[#785928] text-vintage-ink shadow-md shadow-amber-900/15'
                : 'bg-vintage-paper border-vintage-ink/20 text-vintage-ink/40'
            }`}>
              <div className="flex items-center justify-center leading-none -mb-0.5">
                <Star 
                  size={11} 
                  className={earningBadge.hasEarned ? "fill-amber-900 text-amber-900" : "fill-vintage-ink/20 text-vintage-ink/30"} 
                />
              </div>
              <span className={`text-lg font-black leading-none font-display ${
                earningBadge.hasEarned ? 'text-vintage-ink' : 'text-vintage-ink/40'
              }`}>
                {earningBadge.level > 0 ? earningBadge.level : '0'}
              </span>
              <span className={`text-[7px] font-bold uppercase tracking-tighter leading-none ${
                earningBadge.hasEarned ? 'text-vintage-ink/80 font-sans' : 'text-vintage-ink/30 font-sans'
              }`}>
                LVL
              </span>
            </div>

            {/* Hover Tooltip Card */}
            <div className="absolute left-0 top-full mt-2 hidden group-hover:flex flex-col z-30 w-56 p-2.5 bg-vintage-ink text-vintage-paper text-xs shadow-xl border border-vintage-accent/40 rounded-none pointer-events-none font-sans">
              <div className="flex items-center gap-1.5 font-bold text-vintage-accent text-[11px] uppercase tracking-wider mb-1">
                <Award size={13} />
                {earningBadge.hasEarned ? `Level ${earningBadge.level} Creator` : 'Creator Earning Badge'}
              </div>
              <p className="text-[11px] leading-tight text-vintage-paper/90 mb-1.5">
                {earningBadge.hasEarned 
                  ? `Achieved author milestone badge based on total gross sales.` 
                  : `Reach $100 in gross referral sales to unlock your Level 1 badge!`}
              </p>
              <div className="text-[10px] font-mono border-t border-vintage-paper/20 pt-1 flex justify-between">
                <span className="text-vintage-paper/60">Total Gross:</span>
                <span className="font-bold text-vintage-accent">${totalGrossSales.toFixed(2)}</span>
              </div>
              {earningBadge.nextMinGross && (
                <div className="text-[10px] font-mono flex justify-between mt-0.5">
                  <span className="text-vintage-paper/60">Next Level ({earningBadge.level + 1}):</span>
                  <span className="font-bold text-vintage-paper">${earningBadge.nextMinGross}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-vintage-accent uppercase tracking-wider block font-sans">
              Affiliate Account
            </span>
            <h2 className="text-2xl sm:text-3xl font-display">
              Affiliate Code: <span className="font-bold text-vintage-ink">{affiliate.affiliate_code}</span>
            </h2>
          </div>
        </div>

        {/* SUB TAB CONTROLS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase border transition-all font-sans ${
              activeTab === 'overview'
                ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                : 'bg-vintage-paper text-vintage-ink border-vintage-ink/30 hover:border-vintage-ink hover:bg-vintage-ink/5'
            }`}
          >
            Overview & Sales
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase border transition-all flex items-center gap-2 font-sans ${
              activeTab === 'payouts'
                ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                : 'bg-vintage-paper text-vintage-ink border-vintage-ink/30 hover:border-vintage-ink hover:bg-vintage-ink/5'
            }`}
          >
            <Calendar size={14} /> Payouts & Balance
            {isQualifiedForPayout && (
              <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase border transition-all flex items-center gap-2 font-sans ${
              activeTab === 'settings'
                ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                : 'bg-vintage-paper text-vintage-ink border-vintage-ink/30 hover:border-vintage-ink hover:bg-vintage-ink/5'
            }`}
          >
            <Settings size={14} /> Account Settings
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & SALES LEDGER */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* 3 FINANCIAL RECONCILIATION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-vintage-ink/20 bg-vintage-paper text-left space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-vintage-ink font-sans">
                <span>Pending (14-Day Hold)</span>
                <Clock size={16} className="text-amber-800" />
              </div>
              <div className="text-3xl font-display font-bold text-amber-900 flex items-center">
                <DollarSign size={24} strokeWidth={2.5} className="text-vintage-accent shrink-0 -mr-0.5" />
                <span>{pendingAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-vintage-ink font-sans leading-relaxed">14-day clearance hold against refund disputes</p>
              {countdownStr ? (
                <div className="mt-2 pt-2 border-t border-vintage-ink/10 flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-900">
                  <Timer size={13} className="text-amber-800" />
                  <span>Earliest release: {countdownStr}</span>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-vintage-ink/10 text-[10px] text-vintage-ink/50 font-sans italic">
                  No active clearance holds
                </div>
              )}
            </div>

            <div className="p-5 border border-green-800/30 bg-green-50/50 text-left space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-green-950 font-sans">
                  <span>Available for Payout</span>
                  <CheckCircle2 size={16} className="text-green-800" />
                </div>
                <div className="text-3xl font-display font-bold text-green-900 flex items-center">
                  <DollarSign size={24} strokeWidth={2.5} className="text-vintage-accent shrink-0 -mr-0.5" />
                  <span>{readyAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-vintage-ink font-sans leading-relaxed">
                  {isQualifiedForPayout 
                    ? `Passed 14-day clearance. Ready for immediate withdrawal!` 
                    : `$${remainingForThreshold.toFixed(2)} more needed to unlock withdrawal ($50 min).`}
                </p>
              </div>

              <button
                onClick={handleOpenWithdrawModal}
                disabled={!isQualifiedForPayout || isWithdrawing}
                className={`w-full mt-2 vintage-btn py-2 px-3 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isQualifiedForPayout
                    ? 'bg-vintage-accent! text-white! hover:bg-vintage-ink! cursor-pointer'
                    : 'bg-vintage-ink/10 text-vintage-ink/40 border-vintage-ink/20 cursor-not-allowed shadow-none'
                }`}
                title={isQualifiedForPayout ? "Withdraw cleared funds instantly to PayPal" : "Requires $50.00 minimum cleared balance"}
              >
                {isWithdrawing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Transferring...
                  </>
                ) : (
                  <>
                    <Zap size={13} /> {isQualifiedForPayout ? `Instant Withdraw ($${readyAmount.toFixed(2)})` : `Withdraw ($50 Min)`}
                  </>
                )}
              </button>
            </div>

            <div className="p-5 border border-vintage-ink/20 bg-vintage-paper text-left space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-vintage-ink font-sans">
                <span>Lifetime Net Paid</span>
                <CircleDollarSign size={16} className="text-vintage-ink" />
              </div>
              <div className="text-3xl font-display font-bold text-vintage-ink flex items-center">
                <DollarSign size={24} strokeWidth={2.5} className="text-vintage-accent shrink-0 -mr-0.5" />
                <span>{totalNetPaidAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-vintage-ink font-sans leading-relaxed">Net payouts received to PayPal (post-fee)</p>
            </div>
          </div>

          {/* 14-DAY WARRANTY HOLD CLARITY BANNER */}
          <div className="border border-vintage-ink/20 bg-amber-50/70 p-4 flex items-start gap-3">
            <Clock size={20} className="text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans grow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                  Why is there a 14-Day Clearance Period on new sales?
                </span>
                {countdownStr && (
                  <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 border border-amber-300 inline-flex items-center gap-1 shrink-0 self-start sm:self-auto">
                    <Timer size={12} /> Next Release: {countdownStr}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed max-w-3xl">
                To protect our creator network and partner payouts against fraudulent card use, unauthorized disputes, and chargebacks, every new sale is held in a 14-day warranty clearance window. Once the 14 days expire without customer dispute, funds automatically clear into <strong>Ready For Payout</strong> and can be withdrawn immediately to your PayPal account.
              </p>
            </div>
          </div>

          {/* TRANSPARENT PAYMENT GATEWAY FEE NOTICE */}
          <div className="border border-vintage-ink/20 bg-vintage-paper p-4 flex items-start gap-3">
            <Info size={20} className="text-vintage-accent shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans grow">
              <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink block">
                Transparent Payment Gateway Fee Notice
              </span>
              <p className="text-[11px] text-vintage-ink/80 leading-relaxed max-w-3xl">
                As an independent type foundry, sales transactions already incur payment gateway fees (~4.4% + $0.30) upon checkout, meaning the store receives net revenue rather than 100% of gross sales. In addition, PayPal charges an outbound transfer fee (standard 2% cross-border transfer, capped at $20.00 USD) on automated payouts. To maintain sustainable store operations, this outbound transfer fee is deducted from the withdrawal amount. We sincerely apologize for this gateway transfer cost and deeply appreciate your understanding and valuable partnership!
              </p>
            </div>
          </div>

          {/* REFERRAL SALES & COMMISSION LEDGER (MOVED TO TOP WITH AUTO-PAGINATION) */}
          <div className="border border-vintage-ink/20 bg-vintage-paper overflow-hidden">
            <div className="p-4 border-b border-vintage-ink/20 bg-vintage-paper flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
                  Referral Sales & Commission Ledger
                </h3>
                <span className="text-xs text-vintage-ink/80 font-sans">
                  Transactions referred via your vanity slug or promo coupon code
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 bg-white border border-vintage-ink">
                {commissions.length} Sales Recorded
              </span>
            </div>

            {commissions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <AlertCircle size={32} className="mx-auto text-vintage-ink/40" />
                <p className="text-sm font-bold text-vintage-ink font-sans">No referred orders recorded yet</p>
                <p className="text-xs text-vintage-ink/80 max-w-sm mx-auto font-sans leading-relaxed">
                  Share your vanity link or discount coupon on your social platforms and portfolio to begin recording 20% net earnings.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-ink/20 bg-vintage-ink/3 font-mono uppercase text-xs font-bold text-vintage-ink">
                      <th className="p-3">Date</th>
                      <th className="p-3">Typeface / Order</th>
                      <th className="p-3">Attribution</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Net Store</th>
                      <th className="p-3 text-right">Commission (20%)</th>
                      <th className="p-3 text-right">PayPal Fee (2%)</th>
                      <th className="p-3 text-right">Net Payout</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/15 font-mono">
                    {paginatedCommissions.map((comm) => {
                      const commAmt = Number(comm.commission_amount || 0);
                      const commFee = +(Math.min(20, commAmt * 0.02)).toFixed(2);
                      const commNet = +(Math.max(0, commAmt - commFee)).toFixed(2);
                      return (
                        <tr key={comm.id} className="hover:bg-vintage-ink/5 transition-colors">
                          <td className="p-3 text-vintage-ink text-xs whitespace-nowrap font-medium">
                            {new Date(comm.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-vintage-ink block font-sans text-xs sm:text-sm">
                              {comm.font_name || 'Font License'}
                            </span>
                            <span className="text-xs text-vintage-ink/70 truncate block max-w-[200px]">
                              ID: {comm.order_id}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {comm.coupon_code || comm.attribution_type === 'coupon' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 border border-purple-800/30 text-purple-900 bg-purple-50 font-sans">
                                <Tag size={10} className="text-vintage-accent" /> Coupon: {comm.coupon_code || 'PROMO'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 border border-vintage-ink/20 text-vintage-ink/80 bg-vintage-ink/5 font-sans">
                                <Share2 size={10} className="text-vintage-ink/60" /> Shared Link
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right text-vintage-ink font-semibold">
                            ${Number(comm.gross_amount || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-vintage-ink/80 font-medium">
                            ${Number(comm.net_store_amount || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-vintage-accent text-sm">
                            +${commAmt.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-amber-900 text-xs">
                            -${commFee.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-green-900 text-sm">
                            ${commNet.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            {comm.status === 'pending_clearance' && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border border-amber-800/40 text-amber-900 bg-amber-50">
                                <Clock size={11} /> Holding
                              </span>
                            )}
                            {comm.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border border-green-800/40 text-green-900 bg-green-50">
                                <CheckCircle2 size={11} /> Cleared
                              </span>
                            )}
                            {comm.status === 'paid' && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border border-blue-800/40 text-blue-900 bg-blue-50">
                                <DollarSign size={11} /> Paid Out
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* AUTO PAGINATION CONTROLS */}
                {commissions.length > SALES_PER_PAGE && (
                  <div className="p-3 border-t border-vintage-ink/20 bg-vintage-paper flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-xs">
                    <span className="text-vintage-ink/75">
                      Showing <strong className="text-vintage-ink">{(salesPage - 1) * SALES_PER_PAGE + 1}</strong> to <strong className="text-vintage-ink">{Math.min(salesPage * SALES_PER_PAGE, commissions.length)}</strong> of <strong className="text-vintage-ink">{commissions.length}</strong> sales
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                        disabled={salesPage === 1}
                        className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase font-bold text-[10px]"
                      >
                        Prev
                      </button>
                      <span className="px-2 font-mono font-bold text-vintage-ink text-[11px]">
                        Page {salesPage} of {totalSalesPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))}
                        disabled={salesPage >= totalSalesPages}
                        className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase font-bold text-[10px]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DUAL PROMO TOOLS: VANITY LINK + AUDIENCE COUPON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TOOL 1: VANITY LINK */}
            <div className="border border-vintage-ink/20 p-5 bg-vintage-paper space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                  1. Referral Link
                </label>
                <span className="text-xs font-mono font-bold text-vintage-accent bg-vintage-accent/10 px-2 py-0.5 border border-vintage-accent/20">30-day cookie window</span>
              </div>
              
              <div className="flex items-center border border-vintage-ink/30 bg-white p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl} 
                  className="w-full bg-transparent font-mono text-xs sm:text-sm font-bold text-vintage-ink outline-none px-2 truncate"
                />
                <button 
                  onClick={handleCopyLink}
                  className="vintage-btn py-1 px-3 text-xs tracking-wider uppercase flex items-center gap-1.5 shrink-0 font-bold"
                >
                  {copiedLink ? <Check size={14} className="text-green-800" /> : <Copy size={14} />}
                  {copiedLink ? 'COPIED' : 'COPY'}
                </button>
              </div>

              {/* ADDRESS BAR AUTO-CLEAN NOTICE */}
              <div className="p-2.5 bg-vintage-accent/5 border border-vintage-accent/20 text-xs text-vintage-ink space-y-1 font-sans">
                <div className="flex items-center gap-1.5 font-bold text-vintage-accent text-[11px] uppercase tracking-wider">
                  <Info size={13} />
                  <span>Address Bar Auto-Clean Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-vintage-ink/80">
                  When visitors open your link in their address bar, the slug tag automatically dissolves into a clean URL for a pristine browsing experience. This is our standard platform behavior—your referral cookie is securely recorded for 30 days and commissions will track seamlessly!
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-vintage-ink font-sans pt-1">
                <span className="truncate pr-2">Visitors clicking this link are tagged for 30 days.</span>
                <Link to="/fonts" className="underline font-bold text-vintage-accent hover:text-vintage-ink flex items-center gap-1 whitespace-nowrap shrink-0">
                  Browse Fonts <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {/* TOOL 2: AUDIENCE PROMO COUPON */}
            <div className="border border-vintage-ink/20 p-5 bg-vintage-paper space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block flex items-center gap-1.5 font-sans">
                  <Tag size={14} className="text-vintage-accent" /> 2. {couponDiscountPercent}% OFF Promo Code
                </label>
                <span className="text-xs font-bold text-green-900 bg-green-100 px-2 py-0.5 border border-green-300">
                  Active in Checkout
                </span>
              </div>
              
              <div className="flex items-center border border-vintage-ink/30 bg-white p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={couponCode} 
                  className="w-full bg-transparent font-mono text-xs sm:text-sm font-bold text-vintage-ink outline-none px-2 tracking-wider"
                />
                <button 
                  onClick={handleCopyCoupon}
                  className="vintage-btn py-1 px-3 text-xs tracking-wider uppercase flex items-center gap-1.5 shrink-0 font-bold"
                >
                  {copiedCoupon ? <Check size={14} className="text-green-800" /> : <Copy size={14} />}
                  {copiedCoupon ? 'COPIED' : 'COPY'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-vintage-ink font-sans">
                <span>Gives your audience {couponDiscountPercent}% discount. Commission (20%) is calculated on the discounted checkout total.</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="underline hover:text-vintage-accent font-bold uppercase text-[11px] shrink-0 ml-2 cursor-pointer font-sans"
                >
                  Customize &rarr;
                </button>
              </div>
            </div>

          </div>

          {/* STRATEGY COMPARISON: REFERRAL LINK VS PROMO COUPON */}
          <div className="border border-vintage-ink/20 bg-vintage-paper p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-vintage-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-vintage-ink font-serif">
                Campaign Strategy: Referral Link vs Promo Coupon
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-4 border border-vintage-ink/15 bg-white space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-vintage-ink">1. Referral Link (/c/...)</span>
                  <span className="text-[10px] font-bold bg-vintage-ink/5 px-2 py-0.5 border border-vintage-ink/15 uppercase">Full Rate</span>
                </div>
                <p className="text-[11px] text-vintage-ink/80 leading-relaxed">
                  <strong>Buyer pays full catalog price (100%).</strong> Your 20% Net commission is credited on the full transaction value (minus PayPal fees).
                </p>
                <div className="text-[10px] font-bold space-y-0.5">
                  <div className="text-green-800">✓ Advantage: Maximum profit per individual transaction.</div>
                  <div className="text-vintage-ink/60">✕ Consideration: No discount incentive for price-sensitive buyers.</div>
                </div>
              </div>

              <div className="p-4 border border-vintage-ink/15 bg-white space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-vintage-ink">2. Promo Coupon ({couponDiscountPercent}% OFF)</span>
                  <span className="text-[10px] font-bold bg-green-100 text-green-950 px-2 py-0.5 border border-green-300 uppercase">High Conversion</span>
                </div>
                <p className="text-[11px] text-vintage-ink/80 leading-relaxed">
                  <strong>Buyer gets {couponDiscountPercent}% instant discount.</strong> Your 20% Net commission is computed from the discounted checkout total.
                </p>
                <div className="text-[10px] font-bold space-y-0.5">
                  <div className="text-green-800">✓ Advantage: Drastically higher purchase conversion & instant impulse buy.</div>
                  <div className="text-vintage-ink/60">✕ Consideration: Dollar commission is slightly lower due to the discount.</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-vintage-ink/80 bg-white p-3 border border-vintage-ink/15 flex items-start gap-2 font-sans">
              <Info size={14} className="text-vintage-accent shrink-0 mt-0.5" />
              <span>
                <strong>Flexibility Note:</strong> You can adjust your promo discount between <strong>10% (Default)</strong> and <strong>30% (Max)</strong> under the <strong>Settings</strong> tab. Offering 20%–30% discount attracts substantially more buyers, multiplying overall earnings!
              </span>
            </div>
          </div>

          {/* CREATOR MILESTONE REWARD & GAMIFICATION */}
          <div className="border border-vintage-ink/20 bg-vintage-paper p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-vintage-ink/15 pb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-vintage-accent uppercase tracking-widest block font-sans">
                  Creator Milestone Rewards
                </span>
                <h3 className="text-xl font-display text-vintage-ink flex items-center gap-2">
                  <Award size={18} className="text-amber-800" />
                  Personal Font Purchase Discounts
                </h3>
              </div>
              <div className="text-left sm:text-right font-sans">
                <span className="text-[10px] uppercase font-bold text-vintage-ink/60 block">Referral Gross Sales</span>
                <span className="text-lg font-mono font-bold text-vintage-ink">${milestoneInfo.totalGrossSales.toFixed(2)} USD</span>
              </div>
            </div>

            {/* PSYCHOLOGICAL URGENCY BANNER IF REWARD UNLOCKED */}
            {milestoneInfo.activeDiscountPercent > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-900 font-sans">
                    <Sparkles size={14} className="text-amber-700" />
                    EXCLUSIVE CREATOR REWARD: {milestoneInfo.activeDiscountPercent}% OFF ACTIVE
                  </span>
                  <Link
                    to="/fonts"
                    className="vintage-btn btn-reverse py-1.5 px-4 text-[10px] tracking-wider uppercase font-bold inline-flex items-center gap-1.5"
                  >
                    Use Discount Now &rarr;
                  </Link>
                </div>
                <p className="text-xs font-sans text-amber-900/90 leading-relaxed">
                  {milestoneInfo.warningMessage}
                </p>
                <div className="text-[10px] text-amber-800/80 font-sans italic border-t border-amber-200/60 pt-1.5">
                  * Automatically applied at checkout when logged in with this account. Single-use per tier and does not stack.
                </div>
              </div>
            )}

            {milestoneInfo.claimedInCurrentTier && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-950 text-xs font-sans flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-700" />
                  You have claimed your <strong>{milestoneInfo.rawTier}% OFF</strong> milestone reward for this tier!
                </span>
                {milestoneInfo.nextThreshold && (
                  <span className="text-[11px] font-mono text-green-800">
                    Next tier at ${milestoneInfo.nextThreshold} (${milestoneInfo.amountNeededForNext.toFixed(2)} left)
                  </span>
                )}
              </div>
            )}

            {/* PROGRESS BAR & MILESTONE TIERS */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-sans font-bold text-vintage-ink/70">
                <span>Cycle Progress ($0 &rarr; $1,000)</span>
                <span>${milestoneInfo.cycleGrossSales.toFixed(2)} / $1,000.00</span>
              </div>
              <div className="w-full h-3 bg-vintage-ink/10 border border-vintage-ink/20 rounded-none overflow-hidden relative">
                <div 
                  className="h-full bg-vintage-ink transition-all duration-500"
                  style={{ width: `${milestoneInfo.cycleProgressPercent}%` }}
                />
              </div>

              {/* 4 MILESTONE TIERS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {[
                  { threshold: 100, label: '10% OFF' },
                  { threshold: 300, label: '20% OFF' },
                  { threshold: 500, label: '30% OFF' },
                  { threshold: 1000, label: '50% OFF' },
                ].map((tier) => {
                  const achieved = milestoneInfo.cycleGrossSales >= tier.threshold;
                  const isCurrent = milestoneInfo.rawTier === (tier.threshold === 1000 ? 50 : tier.threshold === 500 ? 30 : tier.threshold === 300 ? 20 : 10);
                  return (
                    <div 
                      key={tier.threshold}
                      className={`p-2.5 border text-center transition-all ${
                        isCurrent
                          ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                          : achieved
                          ? 'border-vintage-ink bg-vintage-ink/5 text-vintage-ink'
                          : 'border-vintage-ink/20 bg-white/60 text-vintage-ink/50'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold">${tier.threshold} Target</div>
                      <div className="text-sm font-bold font-display mt-0.5">{tier.label}</div>
                      <div className="text-[9px] uppercase font-bold tracking-tight mt-1">
                        {isCurrent ? '⚡ Current Tier' : achieved ? '✓ Reached' : 'Locked'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYOUT HISTORY & DUE STATUS */}
      {activeTab === 'payouts' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* PAYOUT SCHEDULE & THRESHOLD CARD */}
          <div className="p-6 border border-vintage-ink/20 bg-vintage-paper space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vintage-ink/20 pb-4">
              <div className="flex items-start gap-3">
                <Calendar size={24} className="text-vintage-accent shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-vintage-accent block font-sans">
                      Payout Schedule
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border rounded-xs font-sans ${
                      autoPayoutEnabled 
                        ? 'bg-green-100 border-green-300 text-green-950' 
                        : 'bg-vintage-ink/5 border-vintage-ink/20 text-vintage-ink/70'
                    }`}>
                      {autoPayoutEnabled ? 'Auto-Payout Active' : 'Manual Payout Only'}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-vintage-ink mt-0.5">
                    {autoPayoutEnabled ? `Next Monthly Payout: ${nextPayoutInfo.dateString}` : 'Automated Payout: Paused'}
                  </h3>
                  <p className="text-xs sm:text-sm text-vintage-ink/80 font-sans mt-0.5">
                    {autoPayoutEnabled ? (
                      <>Disbursements occur on the <span className="font-bold text-vintage-ink">1st of every month</span> for balances reaching the <span className="font-bold text-vintage-ink">${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD</span> minimum.</>
                    ) : (
                      <>Automated monthly disbursement is paused. Your cleared earnings accumulate until you trigger Instant Withdrawal manually.</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAutoPayout}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer rounded-xs font-sans ${
                      autoPayoutEnabled 
                        ? 'bg-green-100 border-green-300 text-green-950 hover:bg-green-200' 
                        : 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200'
                    }`}
                    title="Click to toggle automated monthly payouts"
                  >
                    {autoPayoutEnabled ? '✓ Auto-Payout: ON' : '✕ Auto-Payout: OFF'}
                  </button>
                  {autoPayoutEnabled && (
                    <span className="text-xs font-mono font-bold px-3 py-1.5 bg-white border border-vintage-ink/30 inline-block rounded-xs">
                      {nextPayoutInfo.daysLeft} DAYS REMAINING
                    </span>
                  )}
                </div>
                <span className="text-xs text-vintage-ink/80 block font-sans">
                  To: <span className="font-mono font-bold text-vintage-ink">{affiliate.paypal_email}</span>
                </span>
              </div>
            </div>

            {/* Threshold Qualification Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-xs text-vintage-ink font-sans">
                  $50 Minimum Threshold Progress
                </span>
                <span className="font-mono font-bold text-vintage-accent text-xs sm:text-sm">
                  ${readyAmount.toFixed(2)} / ${AFFILIATE_MIN_PAYOUT_USD.toFixed(2)} USD ({thresholdPercentage.toFixed(0)}%)
                </span>
              </div>

              <div className="w-full bg-white border border-vintage-ink/30 h-3.5 rounded-none overflow-hidden p-0.5">
                <div 
                  className={`h-full transition-all duration-700 ${
                    isQualifiedForPayout ? 'bg-green-700' : 'bg-amber-600'
                  }`}
                  style={{ width: `${thresholdPercentage}%` }}
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-sans">
                  {isQualifiedForPayout ? (
                    <span className="text-green-900 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> You meet the $50 minimum threshold. You can withdraw your cleared balance of ${readyAmount.toFixed(2)} USD instantly to {affiliate.paypal_email}.
                    </span>
                  ) : (
                    <span className="text-amber-950 flex items-center gap-1.5 font-medium">
                      <Clock size={16} className="text-amber-800" /> Currently accumulating: ${remainingForThreshold.toFixed(2)} USD needed to unlock withdrawal ($50 min).
                    </span>
                  )}
                </div>

                <button
                  onClick={handleOpenWithdrawModal}
                  disabled={!isQualifiedForPayout || isWithdrawing}
                  className={`vintage-btn py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                    isQualifiedForPayout
                      ? 'bg-vintage-accent! text-white! hover:bg-vintage-ink! cursor-pointer'
                      : 'bg-vintage-ink/10 text-vintage-ink/40 border-vintage-ink/20 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isWithdrawing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Disbursing...
                    </>
                  ) : (
                    <>
                      <Zap size={13} /> {isQualifiedForPayout ? `⚡ Withdraw Now ($${readyAmount.toFixed(2)})` : `Locked ($50 Min)`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 3 BALANCE BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-green-800/30 bg-green-50/50 text-left space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-green-950 block font-sans">
                Ready for Next Monthly Run
              </span>
              <div className="text-3xl font-display font-bold text-green-900">
                ${readyAmount.toFixed(2)}
              </div>
              <p className="text-xs text-vintage-ink font-sans">
                Passed 14-day warranty clearance
              </p>
            </div>

            <div className="p-5 border border-vintage-ink/20 bg-vintage-paper text-left space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block font-sans">
                In-Warranty Holding
              </span>
              <div className="text-3xl font-display font-bold text-amber-900">
                ${pendingAmount.toFixed(2)}
              </div>
              <p className="text-xs text-vintage-ink font-sans">
                Protected by 14-day clearance buffer
              </p>
            </div>

            <div className="p-5 border border-vintage-ink/20 bg-vintage-paper text-left space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                Lifetime Paid Out (Net)
              </span>
              <div className="text-3xl font-display font-bold text-vintage-ink">
                ${totalNetPaidAmount.toFixed(2)}
              </div>
              <p className="text-xs text-vintage-ink font-sans">
                Net successfully transferred to PayPal
              </p>
            </div>
          </div>

          {/* SETTLED PAYOUTS LEDGER */}
          <div className="border border-vintage-ink/20 bg-vintage-paper overflow-hidden">
            <div className="p-4 border-b border-vintage-ink/20 bg-vintage-paper flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
                  Completed Payouts ({payoutHistory.length})
                </h3>
                <span className="text-xs text-vintage-ink/80 font-sans">
                  Official payout receipts to your PayPal account
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 bg-white border border-vintage-ink/30">
                ${totalNetPaidAmount.toFixed(2)} Net Settled
              </span>
            </div>

            {payoutHistory.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Wallet size={32} className="mx-auto text-vintage-ink/40" />
                <p className="text-sm font-bold text-vintage-ink font-sans">No historical payouts yet</p>
                <p className="text-xs text-vintage-ink/80 max-w-sm mx-auto font-sans leading-relaxed">
                  When your cleared balance reaches $50.00 USD on the 1st of the month, payments are disbursed to {affiliate.paypal_email} and documented here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-ink/20 bg-vintage-ink/3 font-mono uppercase text-xs font-bold text-vintage-ink">
                      <th className="p-3">Payout Date</th>
                      <th className="p-3">Reference / Batch ID</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3 text-right">Gross Sent</th>
                      <th className="p-3 text-right">PayPal Fee (2% max $20)</th>
                      <th className="p-3 text-right">Net Received</th>
                      <th className="p-3 text-center">Orders Settled</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/15 font-mono">
                    {paginatedPayouts.map((p) => {
                      const fee = p.fee ?? Math.min(20, +(p.amount * 0.02).toFixed(2));
                      const netReceived = p.net_amount ?? Math.max(0, +(p.amount - fee).toFixed(2));
                      return (
                        <tr key={p.id} className="hover:bg-vintage-ink/5 transition-colors">
                          <td className="p-3 text-vintage-ink text-xs whitespace-nowrap font-medium">
                            {new Date(p.paid_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-3 font-mono font-bold text-vintage-accent truncate max-w-[180px]">
                            {p.payout_batch_id}
                          </td>
                          <td className="p-3 text-vintage-ink truncate max-w-[200px] font-medium">
                            {affiliate.paypal_email}
                          </td>
                          <td className="p-3 text-right font-medium text-vintage-ink">
                            ${p.amount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-amber-900">
                            -${fee.toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-green-900 text-sm font-mono">
                              ${netReceived.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-vintage-ink/60 font-sans block">
                              {p.currency}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold">
                            {p.commission_count}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border border-green-800/40 text-green-900 bg-green-50">
                              <Check size={11} /> Completed
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* AUTO PAGINATION CONTROLS */}
                {payoutHistory.length > PAYOUTS_PER_PAGE && (
                  <div className="p-3 border-t border-vintage-ink/20 bg-vintage-paper flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-xs">
                    <span className="text-vintage-ink/75">
                      Showing <strong className="text-vintage-ink">{(payoutPage - 1) * PAYOUTS_PER_PAGE + 1}</strong> to <strong className="text-vintage-ink">{Math.min(payoutPage * PAYOUTS_PER_PAGE, payoutHistory.length)}</strong> of <strong className="text-vintage-ink">{payoutHistory.length}</strong> disbursements
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPayoutPage(p => Math.max(1, p - 1))}
                        disabled={payoutPage === 1}
                        className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase font-bold text-[10px]"
                      >
                        Prev
                      </button>
                      <span className="px-2 font-mono font-bold text-vintage-ink text-[11px]">
                        Page {payoutPage} of {totalPayoutPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPayoutPage(p => Math.min(totalPayoutPages, p + 1))}
                        disabled={payoutPage >= totalPayoutPages}
                        className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase font-bold text-[10px]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRANSPARENT PAYMENT GATEWAY FEE NOTICE (PAYOUTS SECTION) */}
          <div className="border border-vintage-ink/20 bg-vintage-paper p-4 flex items-start gap-3">
            <Info size={20} className="text-vintage-accent shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans grow">
              <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink block">
                Transparent Payment Gateway Fee Notice
              </span>
              <p className="text-[11px] text-vintage-ink/80 leading-relaxed max-w-3xl">
                As an independent type foundry, sales transactions already incur payment gateway fees (~4.4% + $0.30) upon checkout, meaning the store receives net revenue rather than 100% of gross sales. In addition, PayPal charges an outbound transfer fee (standard 2% cross-border transfer, capped at $20.00 USD) on automated payouts. To maintain sustainable store operations, this outbound transfer fee is deducted from the withdrawal amount. We sincerely apologize for this gateway transfer cost and deeply appreciate your understanding and valuable partnership!
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ACCOUNT & PAYOUT SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="border border-vintage-ink/20 bg-vintage-paper p-6 sm:p-8 space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xl font-display text-vintage-ink">
                Affiliate Account & Payment Profile
              </h3>
              <p className="text-xs text-vintage-ink/75 mt-1 font-sans">
                Keep your PayPal payout email, referral code, and address details updated.
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

            <form onSubmit={handleUpdateSettings} className="space-y-6 font-sans">
              
              {/* Account Username & Authentication Info Card */}
              <div className="p-4 border border-vintage-ink/20 bg-vintage-ink/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent block">
                    Registered Login Account (Username)
                  </span>
                  <div className="text-sm font-bold font-mono text-vintage-ink flex items-center gap-1.5 mt-0.5">
                    <Mail size={14} className="text-vintage-accent" />
                    {userEmail || affiliate.paypal_email}
                  </div>
                  <span className="text-[11px] text-vintage-ink/70 block mt-0.5">
                    This is your primary login identity. Payout disbursements are sent to your PayPal email below.
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 bg-white border border-vintage-ink/20 text-vintage-ink self-start sm:self-center">
                  Verified Account
                </span>
              </div>

              {/* Legal Full Name Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink font-sans">
                  <User size={14} className="text-vintage-accent" /> Legal Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full border border-vintage-ink/30 px-4 py-3 font-sans text-sm bg-white outline-none focus:border-vintage-ink text-vintage-ink"
                />
                <span className="text-xs text-vintage-ink/80 font-sans block">
                  Your legal personal or business entity name for financial payouts, tax reporting, and purchaser profile sync.
                </span>
              </div>

              {/* PayPal Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink font-sans">
                  <Mail size={14} className="text-vintage-accent" /> PayPal Payout Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={editPaypalEmail}
                  onChange={(e) => setEditPaypalEmail(e.target.value)}
                  placeholder="payouts@yourdomain.com"
                  className="w-full border border-vintage-ink/30 px-4 py-3 font-mono text-sm bg-vintage-paper focus:bg-white outline-none focus:border-vintage-ink text-vintage-ink"
                />
                <span className="text-xs text-vintage-ink/80 font-sans block">
                  All cleared commission earnings will be disbursed directly to this PayPal address.
                </span>
              </div>

              {/* Monthly Auto-Payout Toggle */}
              <div className="p-4 border border-vintage-ink/20 bg-vintage-ink/3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-vintage-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink">Monthly Automated Disbursement</span>
                  </div>
                  <p className="text-xs text-vintage-ink/80 leading-relaxed max-w-lg font-sans">
                    When enabled, cleared commissions ($50.00+ minimum) are automatically paid out on the 1st of each month via PayPal. If disabled, your balance accumulates indefinitely until you trigger Instant Withdrawal manually.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPayoutEnabled(!autoPayoutEnabled)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap self-start sm:self-center font-sans ${
                    autoPayoutEnabled 
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' 
                      : 'border-vintage-ink/30 bg-white text-vintage-ink hover:bg-vintage-paper'
                  }`}
                >
                  {autoPayoutEnabled ? '✓ Auto-Payout ON' : '✕ Auto-Payout OFF (Manual Only)'}
                </button>
              </div>

              {/* Vanity Code Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink font-sans">
                  <Hash size={14} className="text-vintage-accent" /> Custom Referral Code
                </label>
                <div className="flex items-center border border-vintage-ink/30 bg-white">
                  <span className="px-4 py-3 bg-vintage-ink/5 border-r border-vintage-ink/20 text-xs font-mono font-bold text-vintage-ink select-none">
                    bombastype.com/c/
                  </span>
                  <input 
                    type="text"
                    required
                    value={editVanityCode}
                    onChange={(e) => setEditVanityCode(e.target.value.toUpperCase())}
                    placeholder="STUDIO_NAME"
                    className="grow px-4 py-3 font-mono text-sm font-bold uppercase bg-transparent outline-none text-vintage-ink"
                  />
                  {vanityCodeAvailability === 'checking' && (
                    <span className="px-3 text-xs text-vintage-ink/60 font-sans flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin" /> Checking...
                    </span>
                  )}
                  {vanityCodeAvailability === 'available' && (
                    <span className="px-3 text-xs text-emerald-800 font-bold font-sans flex items-center gap-1">
                      <Check size={14} className="text-emerald-700" /> Available
                    </span>
                  )}
                  {vanityCodeAvailability === 'taken' && (
                    <span className="px-3 text-xs text-rose-800 font-bold font-sans flex items-center gap-1">
                      <AlertCircle size={14} className="text-rose-700" /> Taken
                    </span>
                  )}
                </div>
                {vanityCodeAvailability === 'taken' && (
                  <span className="text-xs text-rose-700 font-bold font-sans block">
                    This custom referral code is already taken by another creator. Please choose another code.
                  </span>
                )}
                <span className="text-xs text-vintage-ink/80 font-sans block leading-relaxed">
                  Alphanumeric only (3–20 chars). Updating your code sets your custom referral link (<code>bombastype.com/c/{editVanityCode || 'CODE'}</code>). Note: When opened in an address bar, the slug cleans itself to show a pristine link while retaining your 30-day referral attribution.
                </span>
              </div>

              {/* Promo Coupon Customization & Availability Check */}
              <div className="p-5 border border-vintage-ink/20 bg-vintage-paper space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-vintage-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink font-sans">
                      Audience Promo Coupon & Discount Percentage
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 border border-vintage-ink/20 text-vintage-ink">
                    Current: {couponDiscountPercent}% OFF
                  </span>
                </div>

                {/* Coupon Code Input + Check Availability Button */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink/80 block font-sans">
                    Custom Coupon Code
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text"
                      value={couponCodeCustom}
                      onChange={(e) => {
                        setCouponCodeCustom(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                        setAvailabilityResult(null);
                      }}
                      placeholder="MYSTUDIO10"
                      className="grow px-4 py-2.5 font-mono text-sm font-bold uppercase bg-white border border-vintage-ink/30 outline-none text-vintage-ink"
                    />
                    <button
                      type="button"
                      onClick={handleCheckCouponAvailability}
                      disabled={checkingAvailability || !couponCodeCustom}
                      className="vintage-btn px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      {checkingAvailability ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" /> Checking...
                        </>
                      ) : (
                        'Check Availability'
                      )}
                    </button>
                  </div>

                  {availabilityResult && (
                    <div className={`p-2.5 border text-xs font-bold flex items-center gap-2 mt-2 font-sans ${
                      availabilityResult.available 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950' 
                        : 'border-rose-300 bg-rose-50 text-rose-950'
                    }`}>
                      {availabilityResult.available ? <Check size={14} className="text-emerald-700 shrink-0" /> : <AlertCircle size={14} className="text-rose-700 shrink-0" />}
                      <span>{availabilityResult.message}</span>
                    </div>
                  )}
                  <span className="text-xs text-vintage-ink/70 font-sans block">
                    Verify whether your desired promo code is available before saving.
                  </span>
                </div>

                {/* Discount Percentage Selector (10% to 30%) */}
                <div className="space-y-2 pt-2 border-t border-vintage-ink/15">
                  <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink/80 block flex items-center justify-between font-sans">
                    <span>Discount Percentage Offered (10% Min – 30% Max)</span>
                    <span className="font-mono font-bold text-vintage-ink">{couponDiscountPercent}% OFF</span>
                  </label>

                  <div className="grid grid-cols-5 gap-2 font-sans">
                    {[10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const oldPct = couponDiscountPercent;
                          setCouponDiscountPercent(pct);
                          if (couponCodeCustom === `${editVanityCode}${oldPct}` || !couponCodeCustom) {
                            setCouponCodeCustom(`${editVanityCode}${pct}`);
                          }
                          setAvailabilityResult(null);
                        }}
                        className={`py-2 text-xs font-bold uppercase border transition-all cursor-pointer ${
                          couponDiscountPercent === pct 
                            ? 'bg-vintage-ink text-vintage-paper border-vintage-ink shadow-xs' 
                            : 'bg-white text-vintage-ink border-vintage-ink/30 hover:bg-vintage-paper'
                        }`}
                      >
                        {pct}%{pct === 10 ? ' (Default)' : pct === 30 ? ' (Max)' : ''}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-vintage-ink/80 leading-relaxed bg-white/80 p-2.5 border border-vintage-ink/15 font-sans">
                    <strong>Economic Trade-off:</strong> Default is 10% OFF. You may raise it up to 30% OFF to make font purchases irresistible to your audience. While higher discounts slightly reduce net commission per sale, they dramatically boost checkout conversion rate and overall sales volume!
                  </p>
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5 text-vintage-ink font-sans">
                  <Phone size={14} className="text-vintage-accent" /> Phone Number
                </label>
                <div className="flex border border-vintage-ink/30 bg-white">
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
                    placeholder="4155550198"
                    className="w-full px-4 py-3 font-mono text-sm font-bold outline-none bg-transparent text-vintage-ink"
                  />
                </div>
              </div>

              {/* Physical Address Section */}
              <div className="p-5 border border-vintage-ink/20 bg-vintage-paper space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-vintage-ink block flex items-center gap-1.5 font-sans">
                  <MapPin size={16} className="text-vintage-accent" /> Physical Address
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
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
                    <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                      State / Province
                    </label>
                    {provinceOptions.length > 0 ? (
                      <select
                        value={editStateProvince}
                        onChange={(e) => setEditStateProvince(e.target.value)}
                        className="w-full p-3 border border-vintage-ink/30 bg-white font-mono text-xs font-bold outline-none cursor-pointer text-vintage-ink"
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
                        className="w-full p-3 border border-vintage-ink/30 bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                      City / District
                    </label>
                    <input 
                      type="text" 
                      list="affiliate-settings-city-list"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="e.g. San Francisco" 
                      required
                      className="w-full p-3 border border-vintage-ink/30 bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                    />
                    {cityOptions.length > 0 && (
                      <datalist id="affiliate-settings-city-list">
                        {cityOptions.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                      Postal / ZIP Code
                    </label>
                    <input 
                      type="text" 
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      placeholder="e.g. 94105" 
                      required
                      className="w-full p-3 border border-vintage-ink/30 bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                    Street Address
                  </label>
                  <input 
                    type="text" 
                    value={editStreetAddress}
                    onChange={(e) => setEditStreetAddress(e.target.value)}
                    placeholder="e.g. 525 Market St, Suite 3200" 
                    required
                    className="w-full p-3 border border-vintage-ink/30 bg-white font-mono text-xs font-bold outline-none text-vintage-ink"
                  />
                </div>
              </div>

              {/* Fixed Details Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-vintage-ink/20 bg-vintage-paper font-sans text-xs">
                <div>
                  <span className="text-xs text-vintage-ink uppercase block font-bold tracking-wider">Commission Rate:</span>
                  <span className="font-bold text-sm text-vintage-ink font-mono mt-0.5 block">
                    {(Number(affiliate.commission_rate || 0.20) * 100).toFixed(0)}% Net Store Proceeds
                  </span>
                </div>
                <div>
                  <span className="text-xs text-vintage-ink uppercase block font-bold tracking-wider">Minimum Payout Threshold:</span>
                  <span className="font-bold text-sm text-vintage-ink font-mono mt-0.5 block">$50.00 USD</span>
                </div>
                <div>
                  <span className="text-xs text-vintage-ink uppercase block font-bold tracking-wider">Holding Window:</span>
                  <span className="font-bold text-vintage-ink block mt-0.5">14-Day Customer Dispute Warranty</span>
                </div>
                <div>
                  <span className="text-xs text-vintage-ink uppercase block font-bold tracking-wider">Account Status:</span>
                  <span className="font-bold text-green-900 uppercase block mt-0.5">{affiliate.status || 'ACTIVE'}</span>
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
                    setEditFullName(originalFullName);
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

      {/* WITHDRAWAL CONFIRMATION MODAL (BOMBASTYPE REFINED VINTAGE) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
          <div className="bg-vintage-paper border border-vintage-ink/30 shadow-2xl max-w-md w-full p-6 space-y-5 text-vintage-ink relative rounded-xs max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-vintage-ink/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xs bg-vintage-ink/5 border border-vintage-ink/20 flex items-center justify-center">
                  <Wallet size={16} className="text-vintage-accent" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif uppercase tracking-tight text-vintage-ink">Confirm Withdrawal</h3>
                  <p className="text-[10px] font-bold text-vintage-ink/60 uppercase tracking-wider">PayPal Payout Transfer</p>
                </div>
              </div>
              <button 
                onClick={() => { if (!isWithdrawing) { setShowWithdrawModal(false); setWithdrawError(''); setWithdrawSuccess(null); } }}
                disabled={isWithdrawing}
                className="p-1 text-vintage-ink/60 hover:text-vintage-ink border border-transparent hover:border-vintage-ink/20 transition-colors cursor-pointer rounded-xs"
              >
                <X size={18} />
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 border border-green-300 bg-green-50/80 space-y-3 text-center rounded-xs">
                  <CheckCircle2 size={36} className="text-green-700 mx-auto" />
                  <h4 className="text-sm font-bold uppercase text-green-950 font-serif">Transfer Completed!</h4>
                  <p className="text-xs text-green-900 leading-relaxed font-sans font-medium">
                    <span className="font-bold text-base font-mono text-green-950">${withdrawSuccess.netAmount.toFixed(2)} USD</span> has been sent directly to your PayPal account:
                  </p>
                  <p className="font-mono text-xs font-bold bg-white/80 border border-green-300 py-1 px-3 rounded-xs inline-block text-green-950">
                    {withdrawSuccess.receiver}
                  </p>

                  <div className="pt-2 border-t border-green-200/80 text-[11px] font-sans text-green-900/90 space-y-1 text-left px-2">
                    <div className="flex justify-between">
                      <span>Settled from Cleared Balance:</span>
                      <span className="font-mono font-bold">${withdrawSuccess.grossAmount.toFixed(2)} USD</span>
                    </div>
                    {withdrawSuccess.feeAmount > 0 && (
                      <div className="flex justify-between text-amber-900">
                        <span>PayPal Gateway Transfer Fee:</span>
                        <span className="font-mono font-bold">-${withdrawSuccess.feeAmount.toFixed(2)} USD</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-green-950 pt-1 border-t border-green-200/50">
                      <span>Net Transferred to PayPal:</span>
                      <span className="font-mono">${withdrawSuccess.netAmount.toFixed(2)} USD</span>
                    </div>
                  </div>

                  {withdrawSuccess.batchId && (
                    <p className="text-[10px] font-mono text-green-800/80 pt-1">
                      PayPal Batch ID: {withdrawSuccess.batchId}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setShowWithdrawModal(false); setWithdrawSuccess(null); }}
                  className="w-full py-2.5 bg-vintage-ink text-vintage-paper font-bold text-xs uppercase tracking-wider border border-vintage-ink hover:bg-vintage-accent transition-all cursor-pointer rounded-xs"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                {/* Editable Amount Input Card */}
                <div className="p-4 border border-vintage-ink/20 bg-vintage-ink/5 space-y-3 rounded-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink/70 block font-sans">
                      Withdrawal Amount (USD)
                    </label>
                    <span className="text-[10px] font-mono text-vintage-ink/80">
                      Available: <span className="font-bold text-vintage-ink">${readyAmount.toFixed(2)}</span>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-vintage-ink">
                      $
                    </span>
                    <input 
                      type="number"
                      step="0.01"
                      min={AFFILIATE_MIN_PAYOUT_USD}
                      max={readyAmount}
                      value={withdrawInputAmount}
                      onChange={(e) => setWithdrawInputAmount(e.target.value)}
                      disabled={isWithdrawing}
                      className="w-full pl-8 pr-4 py-2 border border-vintage-ink/30 font-mono font-bold text-xl text-vintage-ink bg-white focus:outline-hidden focus:border-vintage-ink rounded-xs"
                    />
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex gap-2 text-[10px] font-bold uppercase">
                    <button
                      type="button"
                      onClick={() => setWithdrawInputAmount('50.00')}
                      disabled={isWithdrawing || readyAmount < 50}
                      className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-colors cursor-pointer rounded-xs"
                    >
                      $50.00 Min
                    </button>
                    {readyAmount >= 100 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawInputAmount('100.00')}
                        disabled={isWithdrawing}
                        className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-colors cursor-pointer rounded-xs"
                      >
                        $100.00
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setWithdrawInputAmount(readyAmount.toFixed(2))}
                      disabled={isWithdrawing}
                      className="px-2.5 py-1 border border-vintage-ink/30 bg-white hover:bg-vintage-ink hover:text-vintage-paper transition-colors cursor-pointer ml-auto rounded-xs"
                    >
                      Max (${readyAmount.toFixed(2)})
                    </button>
                  </div>
                </div>

                {/* Dynamic Fee & Net Payout Calculation */}
                {(() => {
                  const targetNum = Number(withdrawInputAmount) || 0;
                  const calcFee = targetNum >= AFFILIATE_MIN_PAYOUT_USD ? Math.min(20.00, Math.round(targetNum * 0.02 * 100) / 100) : 0;
                  const calcNet = Math.max(0, Math.round((targetNum - calcFee) * 100) / 100);

                  return (
                    <div className="p-3.5 border border-vintage-ink/20 bg-vintage-paper space-y-2 rounded-xs shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink/75 block font-sans">
                        Payout Breakdown Summary
                      </span>
                      <div className="space-y-1.5 text-xs font-sans">
                        <div className="flex justify-between items-center text-vintage-ink">
                          <span className="text-[11px] text-vintage-ink/80">Gross Settled from Balance:</span>
                          <span className="font-mono font-bold">${targetNum.toFixed(2)} USD</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-900">
                          <span className="text-[11px]">PayPal Gateway Outbound Fee (2%, max $20):</span>
                          <span className="font-mono font-bold">-${calcFee.toFixed(2)} USD</span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-vintage-ink/15 text-green-950 font-bold">
                          <span className="text-[11px] uppercase tracking-wider">Estimated Net Received in PayPal:</span>
                          <span className="font-mono text-sm text-green-900 font-bold">~${calcNet.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Recipient Account Detail */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-vintage-ink/10">
                    <span className="font-medium text-vintage-ink/70 uppercase text-[11px]">PayPal Destination</span>
                    <span className="font-mono font-bold text-vintage-ink bg-vintage-ink/5 px-2 py-0.5 border border-vintage-ink/10 text-xs rounded-xs">
                      {affiliate.paypal_email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-vintage-ink/10">
                    <span className="font-medium text-vintage-ink/70 uppercase text-[11px]">Partner Code</span>
                    <span className="font-mono font-bold text-vintage-ink">{affiliate.affiliate_code}</span>
                  </div>
                </div>

                {/* Warning Callout */}
                <div className="p-3 border border-amber-300 bg-amber-50/80 space-y-1 text-xs rounded-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-amber-950 text-[11px]">
                    <AlertCircle size={14} className="text-amber-700 shrink-0" />
                    <span>Double-Check Recipient Email</span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-snug font-sans">
                    Please ensure the recipient PayPal address above is accurate and active. Transfers sent to an incorrect PayPal account cannot be reversed or refunded by the platform.
                  </p>
                </div>

                {withdrawError && (
                  <div className="p-3 border border-red-300 bg-red-50 text-red-900 text-xs font-bold rounded-xs">
                    {withdrawError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowWithdrawModal(false); setWithdrawError(''); }}
                    disabled={isWithdrawing}
                    className="flex-1 py-2.5 border border-vintage-ink/20 hover:border-vintage-ink text-vintage-ink text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer rounded-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeWithdrawal}
                    disabled={isWithdrawing}
                    className="flex-1 py-2.5 bg-vintage-ink text-vintage-paper hover:bg-vintage-accent text-xs font-bold uppercase tracking-wider border border-vintage-ink transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer rounded-xs"
                  >
                    {isWithdrawing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Zap size={13} /> Confirm & Send
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AffiliatePortal;
