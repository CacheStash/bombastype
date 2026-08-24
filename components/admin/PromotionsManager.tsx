/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2, Calendar, Trash2, Edit3, Search, Send, Calculator, MailCheck, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PromotionsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'coupons'>('campaigns');
  const [promos, setPromos] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [fonts, setFonts] = useState<any[]>([]);
  const [buyersList, setBuyersList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [isSendingCoupon, setIsSendingCoupon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Bargain Calculator State
  const [calcOriginalPrice, setCalcOriginalPrice] = useState<string>('350');
  const [calcTargetPrice, setCalcTargetPrice] = useState<string>('270');

  // Form State Kupon Baru
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('1');
  const [couponEndDate, setCouponEndDate] = useState('');

  // Form State Dispatch Kupon ke Buyer
  const [searchTxOrEmail, setSearchTxOrEmail] = useState('');
  const [selectedBuyerEmail, setSelectedBuyerEmail] = useState('');
  const [selectedBuyerName, setSelectedBuyerName] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Form State Campaign
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [promoName, setPromoName] = useState('');
  const [discount, setDiscount] = useState('');
  const [fontSearch, setFontSearch] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('specific');
  const [selectedFonts, setSelectedFonts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPromos();
    fetchFonts();
    fetchCoupons();
    fetchBuyersData();
  }, []);

  // Handle klik di luar autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPromos = async () => {
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (data) setPromos(data);
    setLoading(false);
  };

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data || []);
  };

  const fetchFonts = async () => {
    const { data } = await supabase.from('fonts').select('id, name');
    if (data) setFonts(data);
  };

  const fetchBuyersData = async () => {
    try {
      // 1. Ambil data profil fontbuyer (sumber Hello, Full Name)
      const { data: buyers } = await supabase
        .from('fontbuyer')
        .select('id, email, full_name');

      // 2. Ambil data history transaksi
      const { data: history } = await supabase
        .from('font_history')
        .select('user_id, transaction_id, created_at')
        .order('created_at', { ascending: false });

      if (buyers && buyers.length > 0) {
        const buyerMap: Record<string, { email: string, name: string }> = {};
        buyers.forEach(b => {
          buyerMap[b.id] = {
            email: b.email || '',
            name: b.full_name || 'Customer'
          };
        });

        const combinedList: any[] = [];
        const seenTx = new Set<string>();

        // Masukkan yang memiliki transaksi
        (history || []).forEach(h => {
          const profile = buyerMap[h.user_id];
          if (profile && profile.email && !seenTx.has(`${profile.email}-${h.transaction_id}`)) {
            seenTx.add(`${profile.email}-${h.transaction_id}`);
            combinedList.push({
              email: profile.email,
              name: profile.name,
              transaction_id: h.transaction_id || 'N/A'
            });
          }
        });

        // Masukkan buyer yang belum ada di history list
        buyers.forEach(b => {
          if (!combinedList.some(item => item.email.toLowerCase() === b.email.toLowerCase())) {
            combinedList.push({
              email: b.email,
              name: b.full_name || 'Customer',
              transaction_id: 'REGISTERED_BUYER'
            });
          }
        });

        setBuyersList(combinedList);
      }
    } catch (e) {
      console.error("Failed to load buyers:", e);
    }
  };

  const handleEdit = (p: any) => {
    setEditingPromo(p);
    setPromoName(p.name);
    setDiscount(p.discount_percent.toString());
    setTargetType(p.type === 'global' ? 'all' : 'specific');
    setSelectedFonts(p.font_ids || []);
    setStartDate(p.start_date);
    setEndDate(p.end_date);
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingPromo(null);
    setPromoName('');
    setDiscount('');
    setEndDate('');
    setSelectedFonts([]);
    setFontSearch('');
  };

  const handleApplyBargain = () => {
    const orig = parseFloat(calcOriginalPrice) || 0;
    const target = parseFloat(calcTargetPrice) || 0;
    if (orig <= 0 || target <= 0 || target >= orig) {
      return alert("Target price must be lower than original price!");
    }
    const percent = (((orig - target) / orig) * 100).toFixed(2);
    setCouponDiscount(percent);
    setCouponCode(`DEAL${Math.round(parseFloat(percent))}OFF`);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponDiscount || !couponEndDate) return alert("Please complete coupon records!");
    
    setIsSaving(true);
    try {
      const payload = {
        code: couponCode.trim().toUpperCase(),
        discount_type: 'percentage',
        discount_value: parseFloat(couponDiscount),
        max_uses: parseInt(couponMaxUses) || 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: couponEndDate,
        is_active: true
      };

      const { error } = await supabase.from('coupons').insert([payload]);
      if (error) throw error;

      alert("Coupon successfully registered!");
      setIsAddingCoupon(false);
      setCouponCode('');
      setCouponDiscount('');
      setCouponEndDate('');
      fetchCoupons();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Revoke this coupon permanently?")) return;
    await supabase.from('coupons').delete().eq('id', id);
    fetchCoupons();
  };

  const handleSelectBuyerSuggestion = (buyer: any) => {
    setSelectedBuyerEmail(buyer.email);
    setSelectedBuyerName(buyer.name || 'Customer');
    setSearchTxOrEmail(`${buyer.email} (${buyer.transaction_id})`);
    setShowSuggestions(false);
  };

  const handleOpenSendModal = (coupon?: any) => {
    if (coupon) {
      setSelectedCouponId(coupon.id);
    } else if (coupons.length > 0) {
      setSelectedCouponId(coupons[0].id);
    }
    setIsSendingCoupon(true);
  };

  const activeCouponData = coupons.find(c => c.id === selectedCouponId);

  const handleDispatchCouponEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyerEmail || !activeCouponData) {
      return alert("Please select a buyer and an active coupon!");
    }

    setIsDispatching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        email: selectedBuyerEmail.trim().toLowerCase(),
        name: selectedBuyerName.trim() || "Customer",
        couponCode: activeCouponData.code,
        discountText: `${activeCouponData.discount_value}% OFF`,
        validUntil: new Date(activeCouponData.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        usageLimit: `Valid for ${activeCouponData.max_uses || 1} use only`
      };

      const res = await fetch('/api/admin/send-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json() as any;
      if (!res.ok) throw new Error(resData.error || "FAILED_TO_SEND");

      alert(`COUPON EMAIL DISPATCHED SUCCESSFULLY TO: ${selectedBuyerEmail}`);
      setIsSendingCoupon(false);
      setSearchTxOrEmail('');
      setSelectedBuyerEmail('');
      setSelectedBuyerName('');
    } catch (err: any) {
      alert("Dispatch error: " + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName || !discount || !endDate) return alert("Please complete the campaign records!");
    
    setIsSaving(true);
    try {
      const payload = {
        name: promoName,
        discount_percent: parseFloat(discount),
        start_date: startDate,
        end_date: endDate,
        type: targetType === 'all' ? 'global' : 'bundle',
        font_ids: targetType === 'all' ? fonts.map(f => f.id) : selectedFonts,
        is_active: true
      };

      const { error } = editingPromo 
        ? await supabase.from('promotions').update(payload).eq('id', editingPromo.id)
        : await supabase.from('promotions').insert([payload]);

      if (error) throw error;

      alert(editingPromo ? "Campaign record updated!" : "New campaign commissioned!");
      handleClose();
      fetchPromos();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Terminate this campaign permanently?")) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromos();
  };

  // Filter buyer list berdasarkan input search
  const filteredBuyers = buyersList.filter(b => {
    const q = searchTxOrEmail.toLowerCase().trim();
    if (!q) return true;
    return (
      b.email.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.transaction_id?.toLowerCase().includes(q)
    );
  });

  // --- VIEW: FORM CAMPAIGN ---
  if (isAdding) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b border-vintage-ink pb-8 mb-8">
          <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">
            {editingPromo ? 'Refine Provision' : 'New Provision'}
          </h2>
          <button onClick={handleClose} className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-vintage-accent transition-colors">← Back to Folio</button>
        </div>

        <div className="max-w-4xl">
          <form onSubmit={handleSavePromo} className="space-y-10">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Campaign Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Summer Solstice Archive..." 
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-display text-3xl focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/60"
                value={promoName} 
                onChange={e => setPromoName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Reduction Percentage (%)</label>
                <input 
                  type="number" 
                  placeholder="30"
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold text-xl outline-none placeholder:text-vintage-ink/60"
                  value={discount} 
                  onChange={e => setDiscount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Commencement Date</label>
                <input 
                  type="date" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none cursor-pointer"
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Expiration Date</label>
                <input 
                  type="date" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none cursor-pointer"
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent block">Targeted Inventory</label>
              <div className="flex gap-8 border-b border-vintage-ink/10 pb-4">
                <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer group">
                  <input type="radio" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="accent-vintage-ink" /> 
                  <span className="group-hover:text-vintage-accent transition-colors">Global Archive</span>
                </label>
                <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer group">
                  <input type="radio" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} className="accent-vintage-ink" /> 
                  <span className="group-hover:text-vintage-accent transition-colors">Select Typefaces</span>
                </label>
              </div>

              {targetType === 'specific' && (
                <div className="border border-vintage-ink/10 p-6 bg-vintage-ink/2 space-y-6 animate-in fade-in duration-300">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search Inventory..."
                      className="w-full bg-transparent border-b border-vintage-ink/20 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-vintage-ink transition-all placeholder:text-vintage-ink/60"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                    />
                    <Search className="absolute right-0 top-2 opacity-20" size={14} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                    {fonts
                      .filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
                      .map(f => (
                      <label key={f.id} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tighter cursor-pointer hover:bg-vintage-ink/5 p-2 transition-colors border border-transparent hover:border-vintage-ink/10">
                        <input 
                          type="checkbox" 
                          checked={selectedFonts.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedFonts([...selectedFonts, f.id]);
                            else setSelectedFonts(selectedFonts.filter(id => id !== f.id));
                          }}
                          className="accent-vintage-ink"
                        /> {f.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-8">
              <button 
                type="submit" 
                disabled={isSaving}
                className="vintage-btn btn-reverse px-16 py-5 text-[11px] w-full md:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin mr-2 inline" size={16} />
                ) : (
                  <><Plus size={16} className="mr-2 inline" /> {editingPromo ? "Commit Update" : "Launch Campaign"}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-vintage-ink pb-8 gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Promotions & Coupons</h2>
          <div className="flex gap-3 mt-4">
            <button 
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-vintage-ink transition-all duration-300 ${
                activeTab === 'campaigns' 
                  ? 'bg-vintage-ink text-vintage-paper shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-transparent text-vintage-ink/60 hover:text-vintage-ink hover:bg-vintage-ink/5'
              }`}
            >
              Store Campaigns
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('coupons')}
              className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-vintage-ink transition-all duration-300 ${
                activeTab === 'coupons' 
                  ? 'bg-vintage-ink text-vintage-paper shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-transparent text-vintage-ink/60 hover:text-vintage-ink hover:bg-vintage-ink/5'
              }`}
            >
              Buyer Coupons (Bargain)
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {activeTab === 'campaigns' ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="vintage-btn btn-reverse px-10 py-4 text-[11px]"
            >
              <Plus size={16} className="inline mr-2" /> New Provision
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleOpenSendModal()}
                disabled={coupons.length === 0}
                className="vintage-btn bg-vintage-accent! text-vintage-paper! px-8 py-4 text-[11px] disabled:opacity-30"
              >
                <Send size={15} className="inline mr-2" /> Send Coupon to Buyer
              </button>
              <button 
                onClick={() => setIsAddingCoupon(true)}
                className="vintage-btn btn-reverse px-8 py-4 text-[11px]"
              >
                <Plus size={16} className="inline mr-2" /> Generate Coupon
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-vintage-ink/80 mb-6 px-1">Active Ledger Provisions</h3>
          {loading ? (
            <div className="p-20 text-center italic opacity-40 font-serif">Consulting Campaign Registry...</div>
          ) : promos.length === 0 ? (
            <div className="p-20 border border-dashed border-vintage-ink/20 text-center">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-30 italic">No active provisions found in folio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {promos.map(p => (
                <div key={p.id} className="vintage-card bg-white/40 flex flex-col justify-between group hover:border-vintage-accent transition-all duration-500">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-vintage-ink text-vintage-paper px-3 py-1 text-[10px] font-bold tracking-widest border border-vintage-ink uppercase">
                        {p.discount_percent}% Reduction
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-vintage-ink/40 uppercase tracking-tighter">
                        <Calendar size={12} /> {new Date(p.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="text-2xl font-display text-vintage-ink leading-tight mb-2 uppercase">{p.name}</h3>
                    <p className="text-[10px] font-bold text-vintage-accent uppercase tracking-[0.2em] italic mb-6">
                      {p.type === 'global' ? 'Studio-wide Provision' : `${p.font_ids?.length} Selected Artifacts`}
                    </p>
                  </div>

                  <div className="flex gap-6 pt-4 border-t border-vintage-ink/10">
                    <button 
                      onClick={() => handleEdit(p)} 
                      className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-2"
                    >
                      <Edit3 size={14} /> Refine
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Terminate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-vintage-ink/80 mb-6 px-1">Exclusive Bargain & Promo Tokens</h3>
          {coupons.length === 0 ? (
            <div className="p-20 border border-dashed border-vintage-ink/20 text-center">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-30 italic">No coupons generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coupons.map(c => (
                <div key={c.id} className="vintage-card bg-white/40 flex flex-col justify-between group hover:border-vintage-accent transition-all duration-500">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-vintage-accent text-vintage-paper px-3 py-1 text-[10px] font-bold tracking-widest border border-vintage-accent uppercase">
                        {c.code}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-vintage-ink/40 uppercase tracking-tighter">
                        <Calendar size={12} /> {new Date(c.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="text-3xl font-display text-vintage-ink leading-tight mb-2">{c.discount_value}% OFF</h3>
                    <p className="text-[10px] font-bold text-vintage-ink/60 uppercase tracking-[0.2em] italic mb-6">
                      Redemptions: {c.used_count} / {c.max_uses || '∞'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-vintage-ink/10">
                    <button 
                      onClick={() => handleOpenSendModal(c)}
                      className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent hover:underline flex items-center gap-1.5"
                    >
                      <Send size={13} /> Send to Buyer
                    </button>
                    <button 
                      onClick={() => handleDeleteCoupon(c.id)} 
                      className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: GENERATOR KUPON & KALKULATOR */}
      {isAddingCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-vintage-paper border border-vintage-ink/20 p-8 max-w-lg w-full shadow-2xl text-vintage-ink animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b border-vintage-ink/10 pb-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.3em] text-vintage-accent uppercase block mb-1">Coupon Minting</span>
                <h3 className="text-3xl font-display uppercase">Bargain Token Generator</h3>
              </div>
              <button onClick={() => setIsAddingCoupon(false)} className="p-1 hover:text-vintage-accent transition-colors"><X size={20} /></button>
            </div>

            {/* KALKULATOR */}
            <div className="p-5 bg-vintage-ink/3 border border-vintage-ink/10 mb-6 space-y-4">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-vintage-accent flex items-center gap-2">
                <Calculator size={14} /> BARGAIN CALCULATOR (Auto Percentage)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] font-bold uppercase block text-vintage-ink/50 mb-1">Original Price ($)</label>
                  <input 
                    type="number" 
                    value={calcOriginalPrice} 
                    onChange={e => setCalcOriginalPrice(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 bg-transparent p-2 font-display text-lg outline-none focus:border-vintage-ink" 
                    placeholder="350"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold uppercase block text-vintage-ink/50 mb-1">Deal Target ($)</label>
                  <input 
                    type="number" 
                    value={calcTargetPrice} 
                    onChange={e => setCalcTargetPrice(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 bg-transparent p-2 font-display text-lg outline-none focus:border-vintage-ink" 
                    placeholder="270"
                  />
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleApplyBargain}
                className="vintage-btn w-full py-2.5 text-[9px] font-bold uppercase tracking-widest bg-vintage-ink! text-vintage-background!"
              >
                Compute & Apply Percentage
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">Token Code</label>
                  <input 
                    type="text" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value.toUpperCase())} 
                    className="w-full border-b border-vintage-ink/20 py-2 bg-transparent font-bold uppercase text-sm outline-none focus:border-vintage-ink" 
                    placeholder="DEAL23OFF" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">Discount (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={couponDiscount} 
                    onChange={e => setCouponDiscount(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 py-2 bg-transparent font-bold text-sm outline-none focus:border-vintage-ink" 
                    placeholder="22.86" 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">Usage Limit</label>
                  <input 
                    type="number" 
                    value={couponMaxUses} 
                    onChange={e => setCouponMaxUses(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 py-2 bg-transparent font-bold text-sm outline-none focus:border-vintage-ink" 
                    placeholder="1" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">Expiry Date</label>
                  <input 
                    type="date" 
                    value={couponEndDate} 
                    onChange={e => setCouponEndDate(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 py-2 bg-transparent font-bold text-xs uppercase outline-none focus:border-vintage-ink cursor-pointer" 
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="vintage-btn btn-reverse w-full py-5 text-[10px] tracking-[0.3em] uppercase flex justify-center items-center gap-2 mt-4"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Save & Activate Token"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPATCH COUPON TO BUYER (Z-INDEX 100 & AUTOFILL FULL NAME) */}
      {isSendingCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-vintage-paper border border-vintage-ink max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl text-vintage-ink animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6 border-b border-vintage-ink/10 pb-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.3em] text-vintage-accent uppercase block mb-1">Direct Outreach</span>
                <h3 className="text-3xl font-display uppercase flex items-center gap-2">
                  <MailCheck size={26} /> Send Coupon Gift
                </h3>
              </div>
              <button onClick={() => setIsSendingCoupon(false)} className="p-1 hover:text-vintage-accent transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleDispatchCouponEmail} className="space-y-6">
              {/* Buyer Selector / Search Box */}
              <div ref={searchContainerRef} className="space-y-2 relative">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/70">
                  Search Order ID or Buyer Email
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={searchTxOrEmail}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setSearchTxOrEmail(e.target.value);
                      setSelectedBuyerEmail(e.target.value);
                      setShowSuggestions(true);
                    }}
                    placeholder="Type BT-123456 or buyer@email.com..."
                    className="w-full border-b border-vintage-ink/20 py-3 bg-transparent text-sm font-bold outline-none focus:border-vintage-ink uppercase placeholder:normal-case placeholder:text-vintage-ink/30 pr-8"
                    required
                  />
                  <Search className="absolute right-0 top-3 opacity-30 pointer-events-none" size={16} />
                </div>

                {/* Suggestions Autocomplete Dropdown */}
                {showSuggestions && filteredBuyers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-vintage-ink/20 bg-vintage-paper shadow-2xl max-h-48 overflow-y-auto divide-y divide-vintage-ink/5">
                    {filteredBuyers.slice(0, 8).map((b, i) => (
                      <div 
                        key={i} 
                        onClick={() => handleSelectBuyerSuggestion(b)}
                        className="p-3 text-xs hover:bg-vintage-ink/5 cursor-pointer flex justify-between items-center transition-colors group"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-vintage-ink group-hover:text-vintage-accent transition-colors">{b.email}</span>
                          <span className="text-[10px] opacity-60 font-serif italic">{b.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-vintage-ink/5 px-2 py-0.5 border border-vintage-ink/10">
                          {b.transaction_id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipient Name Field (Autofilled dari database fontbuyer) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">Buyer Name</label>
                  {selectedBuyerName && (
                    <span className="text-[9px] text-green-800 font-bold flex items-center gap-1">
                      <UserCheck size={12} /> Synced with Buyer Record
                    </span>
                  )}
                </div>
                <input 
                  type="text" 
                  value={selectedBuyerName} 
                  onChange={e => setSelectedBuyerName(e.target.value.replace(/\b\w/g, l => l.toUpperCase()))} 
                  className="w-full border-b border-vintage-ink/20 py-2 bg-transparent font-bold text-sm outline-none focus:border-vintage-ink" 
                  placeholder="Customer / Full Name" 
                />
              </div>

              {/* Coupon Selector */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-vintage-ink/70">
                  Select Active Coupon to Send
                </label>
                <select 
                  value={selectedCouponId}
                  onChange={e => setSelectedCouponId(e.target.value)}
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold text-sm outline-none focus:border-vintage-ink uppercase cursor-pointer"
                  required
                >
                  {coupons.map(c => (
                    <option key={c.id} value={c.id} className="bg-vintage-paper text-vintage-ink font-mono font-bold">
                      {c.code} — {c.discount_value}% OFF (Expires: {new Date(c.end_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Box */}
              {activeCouponData && (
                <div className="p-4 border border-dashed border-vintage-ink/40 bg-white/70 space-y-2 font-mono text-xs">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent block mb-2">Live Template Data:</span>
                  <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                    <span className="opacity-50">Recipient:</span>
                    <span className="font-bold">{selectedBuyerEmail || "Pending Selection..."}</span>
                  </div>
                  <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                    <span className="opacity-50">Greeting:</span>
                    <span className="font-bold">Hello {selectedBuyerName || "Customer"},</span>
                  </div>
                  <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                    <span className="opacity-50">Coupon Code:</span>
                    <span className="font-bold bg-gray-100 px-2 py-0.5">{activeCouponData.code}</span>
                  </div>
                  <div className="flex justify-between border-b border-vintage-ink/5 pb-1">
                    <span className="opacity-50">Discount:</span>
                    <span className="font-bold">{activeCouponData.discount_value}% OFF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-50">Valid Until:</span>
                    <span className="font-bold">{new Date(activeCouponData.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isDispatching || !selectedBuyerEmail}
                className="vintage-btn btn-reverse w-full py-5 text-[10px] tracking-[0.3em] uppercase flex justify-center items-center gap-2 mt-4 disabled:opacity-40"
              >
                {isDispatching ? <Loader2 className="animate-spin" size={16} /> : "Dispatch Email via GAS"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsManager;