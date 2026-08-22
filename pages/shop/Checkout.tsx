/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Download, ShieldCheck, DollarSign, Tag } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';

const Checkout: React.FC = () => {
  const { cart, clearCart, checkExistingTrials } = useCart();
  const navigate = useNavigate();

  // --- LOGIC STATES ---
  const [user, setUser] = useState<User | null>(null);
  const [trialConflicts, setTrialConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); 
  const [address, setAddress] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [subscribe, setSubscribe] = useState(true);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [successfulOrderId, setSuccessfulOrderId] = useState<string | null>(null);

  // COUPON STATES
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // BT Prefix Rebranding
  const orderId = useMemo(() => `BT-${Math.floor(100000 + Math.random() * 900000)}`, []);
  const total = cart.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  // CALCULATE FINAL TOTAL WITH COUPON
  const finalTotal = useMemo(() => {
    if (!appliedCoupon) return total;
    let discountAmount = 0;
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = total * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = Number(appliedCoupon.discount_value) || 0;
    }
    const calculated = total - discountAmount;
    return calculated > 0 ? Number(calculated.toFixed(2)) : 0;
  }, [total, appliedCoupon]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} COPIED TO CLIPBOARD`);
  };

  // --- AUTH & PROFILE LOGIC ---
  useEffect(() => {
    const fetchBuyerProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('fontbuyer')
        .select('full_name, address')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setName(data.full_name || '');
        setAddress(data.address || '');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || '');
        fetchBuyerProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || '');
        fetchBuyerProfile(session.user.id);
      } else {
        setUser(null); setEmail(''); setName(''); setAddress('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  
  // --- TRIAL VALIDATION LOGIC ---
  useEffect(() => {
    const validateTrials = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email) && cart.some(item => item.price === 0)) {
        const claimedIds = await checkExistingTrials(email);
        const conflicts = cart
          .filter(item => item.price === 0 && claimedIds.includes(item.id))
          .map(item => item.name);
        setTrialConflicts(conflicts);
      } else {
        setTrialConflicts([]);
      }
    };
    validateTrials();
  }, [email, cart, checkExistingTrials]);

  // --- COUPON HANDLERS ---
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponMessage(null);
    
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', couponCodeInput.trim())
        .eq('is_active', true)
        .single();

      if (error || !coupon) throw new Error("INVALID_OR_INACTIVE_COUPON");

      const now = new Date();
      const startDate = new Date(coupon.start_date);
      const endDate = new Date(coupon.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (now < startDate || now > endDate) throw new Error("COUPON_EXPIRED");

      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        throw new Error("COUPON_USAGE_LIMIT_REACHED");
      }

      setAppliedCoupon(coupon);
      setCouponMessage({ type: 'success', text: `TOKEN APPLIED: ${coupon.discount_type === 'percentage' ? coupon.discount_value + '% OFF' : '$' + coupon.discount_value + ' OFF'}` });
    } catch (err: any) {
      setAppliedCoupon(null);
      let msg = "INVALID COUPON CODE";
      if (err.message === "COUPON_EXPIRED") msg = "THIS COUPON HAS EXPIRED OR IS NOT YET ACTIVE";
      if (err.message === "COUPON_USAGE_LIMIT_REACHED") msg = "COUPON USAGE LIMIT HAS BEEN REACHED";
      setCouponMessage({ type: 'error', text: msg });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponMessage(null);
  };

  // --- PURCHASE SUCCESS HANDLER ---
  const handlePurchaseSuccess = async (finalOrderId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          address,
          fontName: cart.map(i => i.name).join(', '),
          type: 'full',
          metadata: { 
            order_id: finalOrderId,
            cart_items: cart 
          }
        })
      });

      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "API_CHECKOUT_FAILED");

      if (subscribe) {
        await supabase.from('fontsubscribers').upsert(
          { email: email.toLowerCase().trim(), source: 'checkout_purchase', status: 'active' }, 
          { onConflict: 'email' }
        ).select();
      }

      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id);
      }
      
      setIsPaid(true);
      setPurchasedItems([...cart]);
      clearCart();
      setSuccessfulOrderId(finalOrderId);
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SECURE DOWNLOAD HANDLER ---
  const handleSecureDownload = async (fileName: string, type: 'trial' | 'full' = 'full') => {
    const { data: { session } } = await supabase.auth.getSession();
    const targetOrder = successfulOrderId || orderId;

    if (!fileName || fileName === 'null' || fileName === 'undefined') {
      return alert("DOWNLOAD_ERROR: FILE_NOT_FOUND.");
    }

    try {
      const url = `/api/download-zip?file=${encodeURIComponent(fileName)}&order=${encodeURIComponent(targetOrder)}&type=${type}&email=${encodeURIComponent(email)}`;
      const res = await fetch(url, {
        headers: { 'Authorization': session ? `Bearer ${session.access_token}` : '' }
      });
      
      if (!res.ok) throw new Error("UNAUTHORIZED_OR_FILE_NOT_FOUND");

      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      const contentDisposition = res.headers.get('Content-Disposition');
      let downloadName = `BT_Font_Asset.zip`;
      
      if (contentDisposition && contentDisposition.includes('filename=')) {
        downloadName = contentDisposition.split('filename=')[1].split(';')[0].replace(/["']/g, '').trim();
      }
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlBlob);
    } catch (e: any) {
      alert("DOWNLOAD_FAILED: " + e.message);
    }
  };

  // --- FREE TRIAL HANDLER ---
  const handleFreeTrial = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("PLEASE ENTER A VALID EMAIL ADDRESS");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/claim-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, name, address, type: 'trial',
          metadata: { order_id: orderId, cart_items: cart }
        })
      });

      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "API_TRIAL_FAILED");

      if (subscribe) {
        await supabase.from('fontsubscribers').upsert(
          { email: email.toLowerCase().trim(), source: 'checkout_trial', status: 'active' }, 
          { onConflict: 'email' }
        ).select();
      }
      setPurchasedItems([...cart]);
      setIsPaid(true);
      clearCart();
      setSuccessfulOrderId(orderId);
    } catch (err: any) {
      alert("ERROR: " + (err.message === "TRIAL_ALREADY_CLAIMED" ? "DEMO_ALREADY_CLAIMED" : err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PayPalScriptProvider options={{ clientId: "BAAr90ETql33exxbBATrkJlqLOeEDbIvsRKhk6NXu1_e_YNVLv3ykM7WjuAenJdjS1syyLgGHr27h4Qxlg", currency: "USD", intent: "capture", locale: "en_US" }}>
      <div className="min-h-screen bg-vintage-paper py-12 px-6 md:px-12 flex flex-col items-center text-vintage-ink print:bg-white">
          
        {/* HEADER TOOLS */}
        <div className="w-full max-w-5xl mb-12 flex justify-between items-center text-[10px] font-bold print:hidden">
          <Link to="/cart" className="flex items-center gap-2 hover:text-vintage-accent transition-colors">
            <ArrowLeft size={14} /> BACK TO SUMMARY
          </Link>
          <Link to="/fonts" className="vintage-btn py-1.5 px-4 text-[9px] hover:bg-vintage-ink! hover:text-vintage-background!">
            <Plus size={12} className="mr-2" /> BROWSE ARCHIVE
          </Link>
        </div>

        {/* MAIN RECEIPT CONTENT */}
        <div className="w-full max-w-5xl border border-vintage-ink/10 relative flex flex-col items-center overflow-hidden print:border-none bg-vintage-paper/50 shadow-none">

          <div className="w-full p-8 md:p-16 pt-20 pb-20">
            {/* Header: BOMBASTYPE */}
            <section className="text-center mb-16 md:mb-24 max-w-3xl mx-auto relative z-10 px-4 pt-12">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4"
              >
                Official Payment & Asset Receipt
              </motion.p>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight"
              >
                BombasType
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base md:text-lg lg:text-xl italic text-vintage-ink/60 mb-6 leading-relaxed normal-case"
              >
                Typography is an investment in identity. <br className="hidden md:block" /> 
                Your access to the archive is now secured and permanently recorded.
              </motion.p>
            </section>

            {/* Transaction Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-[9px] md:text-[11px] mb-12 border-b border-vintage-ink/10 border-dashed pb-12 font-bold tracking-widest">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                  <span className="text-vintage-accent uppercase">Order ID</span> <span>{orderId}</span>
                </div>
                <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                  <span className="text-vintage-accent uppercase">Date</span> <span>{new Date().toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                  <span className="text-vintage-accent uppercase">Time</span> <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="space-y-3 md:text-right">
                <div className="flex justify-between md:justify-end md:gap-12 border-b border-vintage-ink/5 pb-1">
                  <span className="text-vintage-accent uppercase">Terminal</span> <span>TYPE_LAB_01</span>
                </div>
                <div className="flex justify-between md:justify-end md:gap-12 border-b border-vintage-ink/5 pb-1">
                  <span className="text-vintage-accent uppercase">Status</span>
                  <span className={isPaid ? "text-green-700" : finalTotal === 0 ? "text-vintage-accent" : "text-red-700 animate-pulse"}>
                    {isPaid ? "PAID" : (finalTotal === 0 ? "FREE" : "UNPAID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-8 mb-12">
              {(isPaid ? purchasedItems : cart).map((item) => (
                <div key={item.cartId} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xl md:text-3xl font-display tracking-tight capitalize">
                      {item.name.toLowerCase()}
                    </span>
                    <div className="flex items-start text-vintage-ink">
                      <DollarSign size={20} className="mt-2 md:mt-1.5 text-vintage-accent" strokeWidth={3} />
                      <span className="text-xl md:text-3xl font-display leading-none">{Number(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[9px] text-vintage-accent font-bold tracking-[0.2em]">
                    <span>{item.tier} TIER — {item.usages.join(', ')}</span>
                    <span>QTY: 1</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount Row */}
            {appliedCoupon && (
              <div className="flex justify-between items-center mb-6 text-vintage-accent font-bold text-sm md:text-base border-b border-vintage-ink/10 border-dashed pb-6">
                <span>EXCLUSIVE TOKEN ({appliedCoupon.code})</span>
                <span>-${(total - finalTotal).toFixed(2)}</span>
              </div>
            )}

            {/* TOTAL */}
            <div className="border-y-2 border-vintage-ink py-10 flex justify-between items-center mb-12">
              <span className="text-lg md:text-xl font-bold tracking-[0.3em]">GRAND TOTAL</span>
              <div className="flex flex-col items-end">
                {appliedCoupon && (
                  <span className="text-lg md:text-2xl font-bold tracking-tighter line-through opacity-30 text-vintage-ink mb-1">
                    ${total.toFixed(2)}
                  </span>
                )}
                <div className="flex items-start text-vintage-ink">
                  <DollarSign size={45} className="mt-9 md:mt-9 text-vintage-accent" strokeWidth={2.5} />
                  <span className="text-7xl md:text-9xl font-display tracking-tighter leading-none">{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {!isPaid && (
              <div className="space-y-10">
                {/* 00. PURCHASER INFO */}
                <div className="p-8 border border-vintage-accent/30 bg-vintage-accent/5">
                  <label className="block text-[10px] font-bold tracking-[0.3em] mb-6 text-vintage-accent italic">00. PROVIDE_PURCHASER_INFO*</label>
                  <div className="flex flex-col gap-px bg-vintage-ink/10 border border-vintage-ink/10 overflow-hidden mb-6">
                    <input 
                      type="text" value={name} 
                      onChange={(e) => setName(e.target.value.replace(/\b\w/g, l => l.toUpperCase()))}
                      className="w-full p-5 bg-vintage-background font-bold outline-none text-sm placeholder:text-vintage-ink/20 border-b border-vintage-ink/10" 
                      placeholder="FULL NAME" required 
                    />
                    <input 
                      type="email" value={email} 
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      className="w-full p-5 bg-vintage-background font-bold outline-none text-sm placeholder:text-vintage-ink/20 border-b border-vintage-ink/10" 
                      placeholder="EMAIL@DOMAIN.COM" required 
                    />
                    <textarea 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value.replace(/\b\w/g, l => l.toUpperCase()))}
                      className="w-full p-5 bg-vintage-background font-bold outline-none text-sm placeholder:text-vintage-ink/20 min-h-24 resize-none uppercase" 
                      placeholder="COMPLETE ADDRESS (STREET, CITY, ZIP CODE)" required 
                    />
                  </div>

                  {trialConflicts.length > 0 && (
                    <div className="mb-6 p-4 bg-red-900 text-white text-[10px] font-bold tracking-widest leading-relaxed">
                      DUPLICATE_TRIAL_DETECTED: YOU ALREADY CLAIMED THE DEMO FOR: {trialConflicts.join(', ')}. PLEASE REMOVE THEM FROM YOUR CART.
                    </div>
                  )}

                  <label className="flex items-center gap-4 cursor-pointer group select-none">
                    <div className="relative w-5 h-5 border border-vintage-ink flex items-center justify-center bg-transparent">
                      <input type="checkbox" checked={subscribe} onChange={() => setSubscribe(!subscribe)} className="sr-only" />
                      {subscribe && <div className="w-3 h-3 bg-vintage-ink" />}
                    </div>
                    <span className="text-[10px] font-bold tracking-widest opacity-60 group-hover:opacity-100 transition-opacity uppercase">Subscribe to newsletter & new releases</span>
                  </label>

                  {total === 0 && name && address && email && trialConflicts.length === 0 && (
                    <button onClick={handleFreeTrial} disabled={loading} className="vintage-btn w-full mt-8 py-6 text-xs bg-vintage-ink! text-vintage-background! tracking-[0.4em] hover:opacity-90 transition-all">
                      {loading ? "PROCESSING..." : "CLAIM FREE DEMO ACCESS"}
                    </button>
                  )}
                </div>

                {/* DELIVERY PROTOCOL */}
                <div className="p-8 border border-vintage-ink/10 space-y-8 bg-vintage-ink/3">
                  <div className="space-y-6">
                    <h4 className="text-[12px] md:text-sm font-bold tracking-[0.3em] flex items-center gap-3 text-vintage-accent">
                      <ShieldCheck size={18} /> ASSET_DELIVERY_PROTOCOL:
                    </h4>
                    <div className="text-sm md:text-base font-medium leading-relaxed text-vintage-ink/90 normal-case italic space-y-5">
                      <p>
                        Files for <span className="bg-vintage-ink text-vintage-background px-2 py-0.5 not-italic font-bold">PAID PURCHASES</span> are delivered via secure links to your email through our backup server.
                      </p>
                      <p>
                        Your <span className="text-vintage-ink underline uppercase not-italic font-bold tracking-tight">User Dashboard Vault</span> remains the ultimate secure fortress for 24/7 access.
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-vintage-ink/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-vintage-ink/10 p-5 bg-vintage-ink/3 flex justify-between items-center group">
                      <div>
                        <span className="text-[8px] font-bold text-vintage-accent block uppercase tracking-widest mb-1">Username</span>
                        <span className="text-xs font-bold">{email || "YOUR_EMAIL"}</span>
                      </div>
                      <button onClick={() => handleCopy(email, "USERNAME")} className="p-2 hover:text-vintage-accent transition-colors"><Copy size={14}/></button>
                    </div>
                    <div className="border border-vintage-ink/10 p-5 bg-vintage-ink/3 flex justify-between items-center group">
                      <div>
                        <span className="text-[8px] font-bold text-vintage-accent block uppercase tracking-widest mb-1">Access Key</span>
                        <span className="text-xs font-bold">{orderId}</span>
                      </div>
                      <button onClick={() => handleCopy(orderId, "ACCESS KEY")} className="p-2 hover:text-vintage-accent transition-colors"><Copy size={14}/></button>
                    </div>
                  </div>
                </div>

                {/* COUPON SECTION */}
                {total > 0 && (
                  <div className="p-8 border border-vintage-ink/10 bg-vintage-accent/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-vintage-accent flex items-center gap-2">
                        <Tag size={14} /> BARGAIN / PROMO TOKEN
                      </span>
                      <span className="text-[8px] font-bold tracking-widest text-vintage-ink/40 uppercase italic">
                        Claim Negotiated Deal*
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                        disabled={!!appliedCoupon || isApplyingCoupon}
                        className="flex-1 border border-vintage-ink/20 p-4 bg-vintage-background font-bold uppercase text-xs tracking-widest outline-none focus:border-vintage-ink disabled:opacity-50"
                        placeholder="PASTE COUPON CODE HERE"
                      />
                      {!appliedCoupon ? (
                        <button 
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCodeInput.trim()}
                          className="vintage-btn bg-vintage-ink! text-vintage-background! px-8 text-[10px] font-bold tracking-[0.3em] uppercase hover:opacity-90 disabled:opacity-30"
                        >
                          {isApplyingCoupon ? 'VERIFYING...' : 'APPLY'}
                        </button>
                      ) : (
                        <button 
                          onClick={handleRemoveCoupon}
                          className="vintage-btn bg-red-900! text-white! px-8 text-[10px] font-bold tracking-[0.3em] uppercase hover:opacity-90"
                        >
                          REMOVE
                        </button>
                      )}
                    </div>

                    {couponMessage && (
                      <p className={`text-[10px] font-bold tracking-widest uppercase ${couponMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {couponMessage.type === 'success' ? '✓ ' : '✕ '}{couponMessage.text}
                      </p>
                    )}
                  </div>
                )}

                {/* PAYPAL GATEWAY */}
                {finalTotal > 0 && (
                  <div className="p-8 border-2 border-dashed border-vintage-ink/20 bg-vintage-ink/3 flex flex-col items-center gap-8">
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[10px] font-bold tracking-[0.4em] text-vintage-ink">SECURE PAYMENT GATEWAY</span>
                      <span className="text-[8px] font-bold tracking-widest text-vintage-accent mt-1 uppercase">Paypal / Credit Card (USD)</span>
                    </div>

                    <div className={`w-full max-w-md transition-all ${(loading || !name || !address || !email || trialConflicts.length > 0) ? 'opacity-10 grayscale pointer-events-none' : 'opacity-100'}`}>
                      <PayPalButtons 
                        style={{ 
                          layout: "vertical", 
                          shape: "rect", 
                          label: "pay", 
                          height: 50 
                        }}
                        onClick={(data, actions) => {
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                            alert("PLEASE PROVIDE A VALID RECEIVER EMAIL (BLOCK 00) BEFORE PROCEEDING.");
                            return actions.reject();
                          }
                          return actions.resolve();
                        }}
                        createOrder={(_data, actions) => actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [{ 
                            amount: { currency_code: "USD", value: finalTotal.toFixed(2) }, 
                            description: `BOMBASTYPE Font Purchase - Order ${orderId}` 
                          }]
                        })}
                        onApprove={async (_data, actions) => {
                          const details = await actions.order?.capture();
                          if (details?.status === "COMPLETED") {
                            await handlePurchaseSuccess(orderId);
                            alert(`TRANSACTION SUCCESSFUL! WELCOME, ${details?.payer?.name?.given_name || 'BUYER'}.`);
                          }
                        }}
                        onError={(err) => {
                          console.error("PayPal Error:", err);
                          alert("GATEWAY_ERROR: COULD NOT INITIALIZE TRANSACTION.");
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 100% DISCOUNT CLAIM BUTTON */}
                {total > 0 && finalTotal === 0 && (
                  <div className="p-8 border border-vintage-accent bg-vintage-accent/10 text-center space-y-4">
                    <h4 className="text-2xl font-display text-vintage-accent tracking-tight">100% Token Discount Granted</h4>
                    <p className="text-[10px] font-bold text-vintage-ink/60 uppercase tracking-[0.2em]">
                      No payment gateway required. Proceed to claim your assets directly.
                    </p>
                    <button 
                      onClick={() => handlePurchaseSuccess(orderId)}
                      disabled={loading || !name || !address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || trialConflicts.length > 0}
                      className="vintage-btn w-full py-6 text-xs bg-vintage-ink! text-vintage-background! tracking-[0.4em] hover:opacity-90 transition-all disabled:opacity-30"
                    >
                      {loading ? "PROCESSING..." : "COMPLETE FREE CLAIM"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SUCCESS / INSTANT DOWNLOAD */}
            {isPaid && (
              <div className="mb-12 p-10 border-4 border-double border-green-800 bg-green-50/50 text-center animate-in zoom-in-95">
                <h4 className="text-3xl font-display italic text-green-900 mb-4 tracking-tight">Access Granted</h4>
                <p className="text-[10px] font-bold mb-8 text-green-900/60 uppercase tracking-[0.2em]">
                  {purchasedItems.length} asset(s) verified & registered to {email}.
                </p>
                <div className="flex flex-col gap-3">
                  {purchasedItems.map((item) => (
                    <button 
                      key={item.cartId} 
                      onClick={() => handleSecureDownload(item.price === 0 ? item.trialFileUrl : item.font_files?.[0], item.price === 0 ? 'trial' : 'full')}
                      className="vintage-btn bg-vintage-ink! text-vintage-background! py-5 text-xs tracking-[0.3em] flex items-center justify-center gap-4 hover:opacity-90"
                    >
                      <Download size={16} /> DOWNLOAD_{item.name.replace(/\s+/g, '_').toUpperCase()}{Number(item.price) === 0 ? '_TRIAL' : ''}_ZIP
                    </button>
                  ))}
                  <Link 
                    to="/user/auth" 
                    className="vintage-btn py-5 mt-6 border-vintage-ink/20 text-vintage-ink/60 hover:bg-vintage-ink! hover:text-vintage-background! flex items-center justify-center gap-4 group"
                  >
                    LOGIN TO LIBRARY DASHBOARD <Plus size={18} className="group-hover:rotate-90 transition-transform"/>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-full bg-vintage-ink/5" />
        </div>
        
        <div className="mt-12 text-[10px] font-bold tracking-[0.5em] text-vintage-accent uppercase">** End of Archive Record **</div>
      </div>
    </PayPalScriptProvider>
  );
};

export default Checkout;