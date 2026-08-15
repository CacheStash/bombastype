/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Info, ArrowRight, Check, X, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

interface TierPrices { solo: number; team: number; studio: number; enterprise: number; }
interface WebTierPrices { small_50k: number; medium_500k: number; large_5m: number; enterprise_unlimited: number; }
interface LicensePrices {
  desktop: TierPrices; logo_branding: TierPrices; app: TierPrices;
  broadcast: TierPrices; server: TierPrices; social_web: WebTierPrices;
  corporate_full_suite: number;
}

interface CartCardProps {
  fontId: string; fontName: string; prices: LicensePrices; font_files: string[];
  trialFileUrl?: string; discount?: number; directCheckout?: boolean; initialOption?: 'trial' | 'corporate';
}

const CartCard: React.FC<CartCardProps> = ({ 
  fontId, fontName, prices, font_files, trialFileUrl, 
  discount = 0, directCheckout = false, initialOption 
}) => {
  const { addToCart, closeConfigurator } = useCart();
  const navigate = useNavigate();
  
  const [selectedUsages, setSelectedUsages] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({
    desktop: 'solo', social_web: 'small_50k', logo_branding: 'personal', app: 'solo', server: 'solo', broadcast: 'solo'
  });

  const [isCorporate, setIsCorporate] = useState(initialOption === 'corporate');
  const [isTrial, setIsTrial] = useState(initialOption === 'trial');
  const [isAdded, setIsAdded] = useState(false);

  // --- LOGIC BLOCKS ---
  useEffect(() => {
    if (initialOption === 'trial') { setIsTrial(true); setIsCorporate(false); setSelectedUsages([]); } 
    else if (initialOption === 'corporate') { setIsCorporate(true); setIsTrial(false); setSelectedUsages([]); }
  }, [initialOption, fontId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const higherTierUsages = ['logo_branding', 'app', 'broadcast', 'server'];
  const hasHigherTier = useMemo(() => selectedUsages.some(u => higherTierUsages.includes(u)), [selectedUsages]);

  const tierMap: Record<string, { key: string; label: string }[]> = {
    desktop: [{key:'solo',label:'1 USER ONLY'}, {key:'team',label:'UP TO 30 USERS'}, {key:'studio',label:'UP TO 100 USERS'}, {key:'enterprise',label:'UNLIMITED USERS'}],
    social_web: [{key:'small_50k',label:'50K VIEWS'}, {key:'medium_500k',label:'500K VIEWS'}, {key:'large_5m',label:'2M VIEWS'}, {key:'enterprise_unlimited',label:'UNLIMITED VIEWS'}],
    logo_branding: [{key:'personal',label:'PERSONAL'}, {key:'solo',label:'1-10 EMPLOYEES'}, {key:'team',label:'11-50 EMPLOYEES'}, {key:'studio',label:'51-250 EMPLOYEES'}, {key:'enterprise',label:'251+ EMPLOYEES'}],
    app: [{key:'solo',label:'1 TITLE ONLY'}, {key:'team',label:'UP TO 10 TITLES'}, {key:'studio',label:'UP TO 50 TITLES'}, {key:'enterprise',label:'UNLIMITED TITLES'}],
    server: [{key:'solo',label:'SINGLE SERVER'}, {key:'studio',label:'UP TO 50 SERVERS'}, {key:'enterprise',label:'UNLIMITED SERVERS'}],
    broadcast: [{key:'solo',label:'REGIONAL'}, {key:'studio',label:'NATIONAL'}, {key:'enterprise',label:'WORLDWIDE'}]
  };

  const webTierDetails: Record<string, string> = {
    small_50k: 'UP TO 50K VIEWS', medium_500k: 'UP TO 500K VIEWS', large_5m: 'UP TO 2M VIEWS', enterprise_unlimited: 'UNLIMITED VIEWS'
  };

  useEffect(() => {
    if (isTrial || isCorporate || !prices) return;
    let currentSum = 0;
    selectedUsages.forEach(u => {
      const categoryData = (prices as any)[u];
      if (categoryData) currentSum += Number(categoryData[selectedTiers[u]]) || 0;
    });
    let bundleDiscount = selectedUsages.length === 3 ? 0.15 : selectedUsages.length === 4 ? 0.20 : selectedUsages.length >= 5 ? 0.25 : 0;
    const afterBundle = currentSum * (1 - bundleDiscount);
    if (prices.corporate_full_suite > 0 && afterBundle >= prices.corporate_full_suite) {
      setIsCorporate(true); setIsTrial(false); setSelectedUsages([]); 
    }
  }, [selectedUsages, selectedTiers, prices, isTrial, isCorporate]);

  const isValidSelection = useMemo(() => isTrial || isCorporate || selectedUsages.length > 0, [isTrial, isCorporate, selectedUsages]);

  const totalPrice = useMemo(() => {
    if (!prices || isTrial) return 0;
    if (isCorporate) {
      const baseCorporate = Number(prices.corporate_full_suite) || 0;
      return discount > 0 
        ? Number((baseCorporate * (1 - discount / 100)).toFixed(2)) 
        : baseCorporate;
    }
    let total = 0, qualifyingCount = 0;
    selectedUsages.forEach(usage => {
      const itemPrice = Number((prices as any)[usage]?.[selectedTiers[usage]]) || 0;
      total += itemPrice;
      if (itemPrice >= 250) qualifyingCount++;
    });
    let bundleDiscount = qualifyingCount === 3 ? 0.15 : qualifyingCount === 4 ? 0.20 : qualifyingCount >= 5 ? 0.25 : 0;
    const baseAfterBundle = total * (1 - bundleDiscount);
    return discount > 0 
      ? Number((baseAfterBundle * (1 - discount / 100)).toFixed(2)) 
      : Number(baseAfterBundle.toFixed(2));
  }, [selectedUsages, selectedTiers, isCorporate, isTrial, prices, discount]);

  const savingsInfo = useMemo(() => {
    if (!prices || isTrial) return null;
    let originalPrice = 0;
    if (isCorporate) {
      Object.keys(tierMap).forEach(u => {
        const tiers = (prices as any)[u];
        if (tiers) {
          const values = Object.values(tiers).map(v => Number(v) || 0);
          originalPrice += Math.max(...values);
        }
      });
    } else {
      if (selectedUsages.length === 0) return null;
      selectedUsages.forEach(u => { 
        originalPrice += Number((prices as any)[u]?.[selectedTiers[u]]) || 0; 
      });
    }
    const savedAmount = Number((originalPrice - totalPrice).toFixed(2));
    return savedAmount > 0 ? { amount: savedAmount.toFixed(2), percent: Math.round((savedAmount / originalPrice) * 100) } : null;
  }, [prices, isCorporate, isTrial, selectedUsages, selectedTiers, totalPrice, tierMap]);

  // --- HANDLERS ---
  const handleAdd = (redirect: boolean = false) => {
    const finalUsages = [...selectedUsages];
    if (hasHigherTier && !finalUsages.includes('desktop')) finalUsages.push('desktop');
    const currentWebTier = selectedTiers['social_web'];
    addToCart({
      cartId: crypto.randomUUID(), id: fontId, fontId: fontName, name: fontName, price: totalPrice,
      font_files: font_files, trialFileUrl: trialFileUrl,
      tier: isTrial ? 'DEMO' : (isCorporate ? 'CORPORATE' : selectedTiers[selectedUsages[selectedUsages.length - 1] || 'desktop'].toUpperCase()),
      usages: isTrial ? ['PERSONAL USE'] : (isCorporate ? ['ALL-IN-ONE'] : finalUsages),
      webTierLabel: selectedUsages.includes('social_web') && !isCorporate && !isTrial ? currentWebTier : undefined,
      metadata: { mpv: selectedUsages.includes('social_web') && !isCorporate && !isTrial ? webTierDetails[currentWebTier] : undefined }
    });
    if (redirect) { navigate('/checkout'); closeConfigurator(); } else { setIsAdded(true); }
  };

  const toggleUsage = (id: string) => {
    if (isCorporate) return;
    setIsTrial(false); 
    setSelectedUsages(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const handleCorporateToggle = () => {
    const becomingCorporate = !isCorporate;
    setIsCorporate(becomingCorporate); setIsTrial(false);
    if (becomingCorporate) setSelectedUsages([]);
  };

  const handleTrialToggle = () => {
    const becomingTrial = !isTrial;
    setIsTrial(becomingTrial);
    if (becomingTrial) { setIsCorporate(false); setSelectedUsages([]); }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-vintage-ink/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-vintage-paper border border-vintage-ink/20 relative font-sans text-vintage-ink overflow-hidden uppercase shadow-2xl"
      >
        <button onClick={closeConfigurator} className="absolute top-6 right-6 z-30 p-2 hover:rotate-90 transition-transform duration-500 text-vintage-ink/40 hover:text-vintage-ink">
          <X size={24} />
        </button>

        <div className="p-6 md:p-12 pt-14 pb-14 overflow-y-auto max-h-[90vh] custom-scrollbar">
          <div className="border-b border-vintage-ink/10 pb-8 mb-10 text-left">
            <span className="text-[10px] tracking-[0.4em] font-bold text-vintage-accent block mb-2">LICENSE CONFIGURATOR</span>
            <h2 className="text-5xl md:text-7xl font-display leading-[0.8] tracking-tighter">{fontName}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-12">
              <label className="text-[9px] font-bold tracking-[0.3em] mb-6 block text-vintage-ink/40">LICENSE CATEGORIES (SELECTABLE)</label>
              
              <div className="flex flex-col gap-4">
                {/* TRIAL BUTTON */}
                <button onClick={handleTrialToggle} 
                  className={`vintage-btn flex items-center justify-between py-5 px-6 transition-all duration-300 ${
                    isTrial 
                    ? 'bg-vintage-ink! text-vintage-background!' 
                    : 'bg-transparent border-vintage-ink/20'
                  }`}>
                  <span className="text-[11px] font-bold tracking-[0.2em]">TRY IT FIRST (FREE DEMO VERSION)</span>
                  {isTrial ? <Check size={16} /> : <Plus size={16} className="opacity-40" />}
                </button>

                {/* USAGE BUTTONS */}
                {[
                  { id: 'desktop', label: 'DESKTOP / PRINT' },
                  { id: 'social_web', label: 'SOCIAL MEDIA & WEB' },
                  { id: 'logo_branding', label: 'LOGO & BRANDING' },
                  { id: 'app', label: 'APP / GAME / EBOOK' },
                  { id: 'server', label: 'SERVER' },
                  { id: 'broadcast', label: 'BROADCAST' },
                ].map((u) => {
                  const isActive = selectedUsages.includes(u.id);
                  const isDisabled = isCorporate;

                  return (
                    <div key={u.id} className="space-y-3">
                      <button onClick={() => toggleUsage(u.id)} disabled={isDisabled} 
                        className={`vintage-btn w-full flex items-center justify-between py-5 px-6 transition-all duration-300 ${
                          isDisabled ? 'opacity-10 cursor-not-allowed' : 
                          isActive ? 'bg-vintage-ink! text-vintage-background!' : 'bg-transparent border-vintage-ink/20'
                        }`}>
                        <span className="text-[11px] font-bold tracking-[0.2em]">{u.label}</span>
                        <Plus size={16} className={`transition-transform duration-500 ${isActive ? 'rotate-45' : 'opacity-40'}`} />
                      </button>
                      
                      <AnimatePresence>
                        {isActive && !isCorporate && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="flex flex-wrap gap-1 pl-4 border-l border-vintage-ink/10 overflow-hidden"
                          >
                            {tierMap[u.id].map((t) => (
                              <button key={t.key} onClick={() => setSelectedTiers(prev => ({...prev, [u.id]: t.key}))}
                                className={`vintage-btn flex-1 min-w-35 py-3 px-2 text-[9px] font-bold tracking-widest transition-all duration-300 ${
                                  selectedTiers[u.id] === t.key 
                                  ? 'bg-vintage-ink! text-vintage-background!' 
                                  : 'bg-transparent border-vintage-ink/10 text-vintage-ink/60'
                                }`}>
                                {t.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                
                {/* CORPORATE BUTTON */}
                <button onClick={handleCorporateToggle} 
                  className={`vintage-btn flex items-center justify-between py-5 px-6 border-2 mt-4 transition-all duration-300 ${
                    isCorporate 
                    ? 'bg-vintage-ink! text-vintage-background! shadow-lg' 
                    : 'bg-transparent border-vintage-accent/30 text-vintage-accent'
                  }`}>
                  <span className="text-[11px] font-bold tracking-[0.2em]">CORPORATE (ALL-IN-ONE PACKAGE)</span>
                  {isCorporate ? <Check size={18} /> : <Plus size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-8">
            {isTrial && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 bg-vintage-ink/3 border border-vintage-ink/10 border-dashed">
                <span className="text-[10px] font-bold block mb-1 tracking-widest text-vintage-accent uppercase">Demo Terms:</span>
                <p className="text-[10px] normal-case leading-relaxed font-serif italic text-vintage-ink/60">
                  Personal use only. Character set is restricted. Professional/Client work requires a full license.
                </p>
              </motion.div>
            )}

            {isCorporate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 bg-vintage-accent/3 border border-vintage-accent/20 border-dashed">
                <span className="text-[10px] font-bold block mb-1 tracking-widest text-vintage-accent uppercase">Corporate Suite:</span>
                <p className="text-[10px] normal-case leading-relaxed font-serif italic text-vintage-ink/60">
                  Covers all digital and physical touchpoints for large-scale organizations with unlimited seats.
                </p>
              </motion.div>
            )}

            {!isCorporate && !isTrial && selectedUsages.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-vintage-accent text-vintage-paper text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Bundle 3+ licenses (min $250 each) for up to 25% discount.
                </p>
              </motion.div>
            )}
          </div>

          <div className="border-t border-vintage-ink/10 border-dashed mt-12 pt-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-10">
            <div className="flex flex-col text-center md:text-left">
              <span className="text-[9px] font-bold tracking-[0.3em] text-vintage-ink/40 mb-3 uppercase">Investment Total</span>
              <div className="flex items-start justify-center md:justify-start">
                <span className="text-2xl font-bold mt-2 mr-1 tracking-tighter text-vintage-ink">$</span>
                <span className="text-8xl font-display tracking-tighter leading-[0.7] text-vintage-ink">{Number(totalPrice).toFixed(2)}</span>
              </div>
              {savingsInfo && (
                <div className="mt-4">
                  <span className="text-[10px] font-bold text-vintage-accent tracking-widest uppercase italic">
                    — You save ${savingsInfo.amount} ({savingsInfo.percent}% OFF)
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center md:items-end gap-6 w-full md:w-auto">
              <Link to="/license" className="text-[10px] font-bold tracking-widest text-vintage-ink/40 hover:text-vintage-accent transition-colors flex items-center gap-2 uppercase">
                <Info size={14} /> License Information
              </Link>
              
              {!isAdded ? (
                <div className="flex gap-2 w-full md:w-auto">
                  {!directCheckout && (
                    <button onClick={() => handleAdd(false)} disabled={!isValidSelection}
                      className="vintage-btn flex-1 md:w-48 bg-transparent py-5 px-4 font-bold text-[10px] tracking-[0.3em] hover:bg-vintage-ink hover:text-vintage-background disabled:opacity-10 uppercase">
                      Add to Cart
                    </button>
                  )}
                  <button onClick={() => handleAdd(true)} disabled={!isValidSelection}
                    className={`vintage-btn flex-1 ${directCheckout ? 'md:w-72' : 'md:w-48'} bg-vintage-ink! text-vintage-background! py-5 px-4 flex items-center justify-center gap-3 transition-all duration-500 hover:opacity-90 font-bold text-[10px] tracking-[0.3em] disabled:opacity-10 group uppercase`}>
                    Checkout
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-2 w-full md:w-72">
                  <Link to="/cart" onClick={closeConfigurator} className="vintage-btn bg-vintage-ink! text-vintage-background! w-full py-5 px-8 flex items-center justify-center gap-4 hover:opacity-90 transition-all">
                    <ShoppingCart size={18} /> <span className="text-[11px] font-bold tracking-[0.3em]">VIEW CART</span>
                  </Link>
                  <button onClick={closeConfigurator} className="vintage-btn w-full py-3 text-[9px] font-bold border border-vintage-ink/20 text-vintage-ink/40 hover:text-vintage-ink transition-colors uppercase">
                    Continue Browsing
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CartCard;