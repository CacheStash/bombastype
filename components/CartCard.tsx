import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Info, ArrowRight, Check, X, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

interface TierPrices {
  solo: number;
  team: number;
  studio: number;
  enterprise: number;
}

interface WebTierPrices {
  small_50k: number;
  medium_500k: number;
  large_5m: number;
  enterprise_unlimited: number;
}

interface LicensePrices {
  desktop: TierPrices;
  logo_branding: TierPrices;
  app: TierPrices;
  broadcast: TierPrices;
  server: TierPrices;
  social_web: WebTierPrices;
  corporate_full_suite: number;
}

interface CartCardProps {
  fontId: string; // FIXED: Tambahkan ID ke props interface
  fontName: string;
  prices: LicensePrices;
  font_files: string[];
  trialFileUrl?: string;
  discount?: number;
directCheckout?: boolean; // FIXED: Properti baru untuk menyembunyikan 'Add to Cart'
initialOption?: 'trial' | 'corporate';
}

import { useNavigate } from 'react-router-dom'; // FIXED: Wajib tambah ini

const CartCard: React.FC<CartCardProps> = ({ fontId, fontName, prices, font_files, trialFileUrl, discount = 0, directCheckout = false, initialOption }) => {
  const { addToCart, closeConfigurator } = useCart();
  const navigate = useNavigate(); // FIXED: Inisialisasi navigasi
  const [selectedTier, setSelectedTier] = useState<'solo' | 'team' | 'studio' | 'enterprise'>('solo');
  // FIXED: Memulai tanpa pilihan otomatis (Empty State)
  const [selectedUsages, setSelectedUsages] = useState<string[]>([]);

  // State granular tiers per kategori lisensi
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({
    desktop: 'solo', social_web: 'small_50k', logo_branding: 'personal', app: 'solo', server: 'solo', broadcast: 'solo'
  });

  const [isCorporate, setIsCorporate] = useState(initialOption === 'corporate');
  const [isTrial, setIsTrial] = useState(initialOption === 'trial');
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (initialOption === 'trial') {
      setIsTrial(true);
      setIsCorporate(false);
      setSelectedUsages([]);
    } else if (initialOption === 'corporate') {
      setIsCorporate(true);
      setIsTrial(false);
      setSelectedUsages([]);
    }
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
    small_50k: 'UP TO 50K VIEWS',
    medium_500k: 'UP TO 500K VIEWS',
    large_5m: 'UP TO 2M VIEWS',
    enterprise_unlimited: 'UNLIMITED VIEWS'
  };

  // FIXED: Logic Auto-Switch HANYA jika nominal harga (Eceran + Bundle) >= Corporate
  useEffect(() => {
    if (isTrial || isCorporate || !prices) return;

    let currentSum = 0;
    selectedUsages.forEach(u => {
      const categoryData = (prices as any)[u];
      if (categoryData) currentSum += categoryData[selectedTiers[u]] || 0;
    });

    let bundleDiscount = 0;
    if (selectedUsages.length === 3) bundleDiscount = 0.15;
    else if (selectedUsages.length === 4) bundleDiscount = 0.20;
    else if (selectedUsages.length >= 5) bundleDiscount = 0.25;

    const afterBundle = currentSum * (1 - bundleDiscount);

    if (prices.corporate_full_suite > 0 && afterBundle >= prices.corporate_full_suite) {
      setIsCorporate(true);
      setIsTrial(false);
      setSelectedUsages([]); 
    }
  }, [selectedUsages, selectedTiers, prices]);



  const isValidSelection = useMemo(() => {
    return isTrial || isCorporate || selectedUsages.length > 0;
  }, [isTrial, isCorporate, selectedUsages]);


  const totalPrice = useMemo(() => {
    if (!prices || isTrial) return 0;
   if (isCorporate) {

      const baseCorporatePrice = prices.corporate_full_suite || 0;
      return discount > 0 
        ? Math.round(baseCorporatePrice * (1 - discount / 100)) 
        : baseCorporatePrice;
    }
    
    let total = 0;
    // FIXED: Hitung total harga sekaligus hitung berapa banyak lisensi yang memenuhi syarat diskon (>= 250)
    let qualifyingCount = 0;
    selectedUsages.forEach(usage => {
      const tierKey = selectedTiers[usage];
      const categoryData = (prices as any)[usage];
      if (categoryData && typeof categoryData === 'object') {
        const itemPrice = categoryData[tierKey] || 0;
        total += itemPrice;
        // Hanya lisensi seharga $250 ke atas yang dihitung masuk ke kuota bundling
        if (itemPrice >= 250) qualifyingCount++;
      }
    });

    // BUNDLE SAVINGS: Diterapkan berdasarkan jumlah 'qualifyingCount' (lisensi >= 250)
    let bundleDiscount = 0;
    if (qualifyingCount === 3) bundleDiscount = 0.15;
    else if (qualifyingCount === 4) bundleDiscount = 0.20;
    else if (qualifyingCount >= 5) bundleDiscount = 0.25;

    const baseAfterBundle = total * (1 - bundleDiscount);
    return discount > 0 ? Math.round(baseAfterBundle * (1 - discount / 100)) : Math.round(baseAfterBundle);
  }, [selectedUsages, selectedTiers, isCorporate, isTrial, prices, discount]);

  

    // FIXED: Logika hitung penghematan (Original Price vs Total Price)
  const savingsInfo = useMemo(() => {
    if (!prices || isTrial) return null;
    let originalPrice = 0;

    if (isCorporate) {
      Object.keys(tierMap).forEach(u => {
        const tiers = (prices as any)[u];
        if (tiers) {
          const values = Object.values(tiers) as number[];
          originalPrice += Math.max(...values);
        }
      });
    } else {
      if (selectedUsages.length === 0) return null;
      // Bandingkan total eceran terpilih SEBELUM diskon bundling & promo
      selectedUsages.forEach(u => {
        originalPrice += (prices as any)[u]?.[selectedTiers[u]] || 0;
      });
    }

    const savedAmount = originalPrice - totalPrice;
    const savedPercent = originalPrice > 0 ? Math.round((savedAmount / originalPrice) * 100) : 0;

    return savedAmount > 0 ? { amount: savedAmount, percent: savedPercent } : null;
}, [prices, isCorporate, isTrial, selectedUsages, selectedTiers, totalPrice, tierMap]);

    const finalUsages = [...selectedUsages];
    if (hasHigherTier && !finalUsages.includes('desktop')) {
      finalUsages.push('desktop');
    }

const handleAdd = (redirect: boolean = false) => {
    const finalUsages = [...selectedUsages];
    if (hasHigherTier && !finalUsages.includes('desktop')) {
      finalUsages.push('desktop');
    }

    // FIXED: Menggunakan selectedTiers['social_web'] untuk mengganti webTier yang hilang
    const currentWebTier = selectedTiers['social_web'];
    const metadata = {
      mpv: selectedUsages.includes('social_web') && !isCorporate && !isTrial 
           ? webTierDetails[currentWebTier] 
           : undefined
    };

    addToCart({
      cartId: crypto.randomUUID(),
      id: fontId, 
      fontId: fontName, 
      name: fontName,
      price: totalPrice,
      font_files: font_files,
      trialFileUrl: trialFileUrl,
      // FIXED: Mengambil tier dari kategori tertinggi yang dipilih untuk label di Cart
      tier: isTrial ? 'DEMO' : (isCorporate ? 'CORPORATE' : selectedTiers[selectedUsages[selectedUsages.length - 1] || 'desktop'].toUpperCase()),
      usages: isTrial ? ['PERSONAL USE'] : (isCorporate ? ['ALL-IN-ONE'] : finalUsages),
      webTierLabel: selectedUsages.includes('social_web') && !isCorporate && !isTrial ? currentWebTier : undefined,
      metadata: metadata 
    });

    if (redirect) {
      navigate('/checkout'); // FIXED: Langsung ke halaman checkout
      closeConfigurator();
    } else {
      setIsAdded(true);
    }
  };

 const toggleUsage = (id: string) => {
    // FIXED: Nonaktifkan pemilihan kategori jika mode Corporate aktif
    if (isCorporate) return;
    
    // FIXED: Memilih paid license otomatis mematikan mode Trial
    setIsTrial(false); 
    
    setSelectedUsages(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleCorporateToggle = () => {
    const becomingCorporate = !isCorporate;
    setIsCorporate(becomingCorporate);
    setIsTrial(false); // FIXED: Memilih Corporate otomatis mematikan mode Trial
    if (becomingCorporate) setSelectedUsages([]); // Bersihkan pilihan eceran
  };

  const handleTrialToggle = () => {
    const becomingTrial = !isTrial;
    setIsTrial(becomingTrial);
    // FIXED: Memilih Trial otomatis mematikan semua opsi berbayar agar bisa pindah antar opsi dengan lancar
    if (becomingTrial) {
      setIsCorporate(false);
      setSelectedUsages([]);
    }
  };

  const TicketEdges = () => (
    <div className="flex justify-between w-full px-2 -mx-2 overflow-hidden pointer-events-none select-none">
      {[...Array(25)].map((_, i) => (
        <div key={i} className="w-4 h-4 bg-[#EDEBE6] rounded-full -mt-2" />
      ))}
    </div>
  );

  return (
    <div className="w-[95vw] max-w-212.5 bg-white border-x border-black relative font-sans text-black overflow-hidden uppercase shadow-2xl">
      <div className="absolute top-0 left-0 w-full z-20"><TicketEdges /></div>
      
      <button onClick={closeConfigurator} className="absolute top-6 right-6 z-30 p-1 hover:bg-black hover:text-white transition-colors border border-black">
        <X size={20} />
      </button>

      <div className="p-6 md:p-12 pt-14 pb-14">
        <div className="border-b border-black pb-8 mb-10 text-left">
          <span className="text-[10px] tracking-[0.3em] font-bold text-gray-400 block mb-2">LICENSE CONFIGURATOR</span>
          <h2 className="text-5xl md:text-7xl font-normal tracking-tighter leading-[0.8]">{fontName}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* 02. LICENSE CATEGORIES & SPECIFIC TIERS */}
          <div className="md:col-span-12">
            <label className="text-[10px] font-bold tracking-[0.2em] mb-6 block text-black/40 uppercase">LICENSE CATEGORIES (CAN SELECT MULTIPLE)</label>
            <div className="flex flex-col gap-4 mb-3">
              {/* FIXED: Tombol TRY IT FIRST di posisi paling atas & otomatis disabled jika ada paid license */}
              <button onClick={handleTrialToggle} 
                className={`flex items-center justify-between p-5 border border-black transition-all ${isTrial ? 'bg-black text-white' : 'bg-transparent hover:bg-black/5'}`}>
                <span className="text-[11px] font-black tracking-widest">TRY IT FIRST (FREE DEMO VERSION)</span>
                {isTrial ? <Check size={16} /> : <Plus size={16} />}
              </button>

              {[
                { id: 'desktop', label: 'DESKTOP / PRINT' },
                { id: 'social_web', label: 'SOCIAL MEDIA & WEB' },
                { id: 'logo_branding', label: 'LOGO & BRANDING' },
                { id: 'app', label: 'APP / GAME / EBOOK' },
                { id: 'server', label: 'SERVER' },
                { id: 'broadcast', label: 'BROADCAST' },
              ].map((u) => {
                const isActive = selectedUsages.includes(u.id);
                // FIXED: Opsi eceran mati jika Corporate dipilih
                const isDisabled = isCorporate;

                return (
                  <div key={u.id} className="space-y-2">
                    {/* UI: 1-Column Layout License Button */}
                    <button onClick={() => toggleUsage(u.id)} 
                      disabled={isDisabled} 
                      className={`w-full flex items-center justify-between p-5 border border-black transition-all ${
                        isDisabled ? 'opacity-20 cursor-not-allowed' : isActive ? 'bg-black text-white' : 'bg-transparent hover:bg-black/5'
                      }`}>
                      <span className="text-[11px] font-black tracking-widest">{u.label}</span>
                      <Plus size={16} className={`transition-transform duration-300 ${isActive ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {/* UI: Sub-Tier berjejer horizontal di desktop, stacking di mobile */}
                    {isActive && !isCorporate && (
                      <div className="flex flex-wrap md:flex-nowrap gap-1 pl-4 border-l-2 border-black/10 animate-in fade-in slide-in-from-top-1">
                        {tierMap[u.id].map((t: {key: string, label: string}) => (
                          <button key={t.key} onClick={() => setSelectedTiers(prev => ({...prev, [u.id]: t.key}))}
                            className={`flex-1 min-w-30in-w-0 py-3 px-2 border border-black text-[9px] font-black text-center transition-all ${
                              selectedTiers[u.id] === t.key ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-gray-50'
                            }`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* CORPORATE BUTTON: Mematikan opsi eceran jika dipilih */}
              <button onClick={handleCorporateToggle} 
                className={`flex items-center justify-between p-5 border border-black transition-all mt-4 ${isCorporate ? 'bg-black text-white' : 'bg-transparent hover:bg-black/5'}`}>
                <span className="text-[11px] font-black tracking-widest text-orange-600">CORPORATE (ALL-IN-ONE PACKAGE)</span>
                {isCorporate ? <Check size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* INFO BOXES (Conditional) */}
        {isTrial && (
          <div className="mt-6 p-4 bg-[#EDEBE6] border border-black border-dashed animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-black block mb-1 tracking-widest">FREE VERSION TERMS:</span>
            <p className="text-[9px] normal-case leading-relaxed font-bold italic text-gray-600">
              PERSONAL USE ONLY. FREE VERSION FILES HAVE LIMITED CHARACTER SETS. NO COMMERCIAL OR CLIENT WORK ALLOWED.
            </p>
          </div>
        )}

        {isCorporate && (
          <div className="mt-6 p-4 bg-[#EDEBE6] border border-black border-dashed animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-black block mb-1 tracking-widest">CORPORATE TERMS:</span>
            <p className="text-[9px] normal-case leading-relaxed font-bold italic text-gray-600">
              COMPREHENSIVE ALL-IN-ONE LICENSE COVERING ALL USAGES (DESKTOP, WEB, LOGO, APP, BROADCAST, AND SERVER) WITH UNLIMITED SEATS. 
            </p>
          </div>
        )}

{/* FIXED: Notifikasi Bundle Saving dengan syarat minimal harga $250 */}
        {!isCorporate && !isTrial && selectedUsages.length > 0 && (
          <div className="mt-6 p-4 bg-orange-600 text-white border border-black animate-in fade-in slide-in-from-top-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
              PROMO: ADD 3+ LICENSES (MIN $250 EACH) TO UNLOCK UP TO 25% BUNDLE DISCOUNT!
            </p>
          </div>
        )}

        {/* FOOTER SECTION */}
        <div className="border-t-2 border-black border-dashed mt-10 pt-8 flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
          <div className="flex flex-col text-center md:text-left">
            <span className="text-[10px] font-bold tracking-[0.2em] text-black/40 mb-2">INVESTMENT TOTAL</span>
            <div className="flex items-start justify-center md:justify-start">
              <span className="text-2xl font-bold mt-2 mr-1 tracking-tighter">$</span>
              <span className="text-8xl font-normal tracking-tighter leading-[0.7]">{totalPrice}</span>
            </div>
            {/* FIXED: Menampilkan info penghematan di bawah Investment Total */}
            {savingsInfo && (
              <div className="mt-2 animate-in fade-in slide-in-from-left-2">
                <span className="text-[10px] font-black text-orange-600 tracking-widest uppercase">
                  You save ${savingsInfo.amount} ({savingsInfo.percent}% OFF)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
            <Link to="/license" className="text-[10px] font-black underline flex items-center gap-2 hover:text-red-600 transition-colors">
              <Info size={14} /> LICENSE INFORMATION
            </Link>
            
           {!isAdded ? (
              <div className="flex gap-2 w-full md:w-auto">
                {/* FIXED: Tombol ADD TO CART hanya muncul jika directCheckout bernilai false */}
                {!directCheckout && (
                  <button 
                    onClick={() => handleAdd(false)} 
                    disabled={!isValidSelection}
                    className="flex-1 md:w-45 bg-white text-black border border-black py-5 px-4 flex items-center justify-center gap-3 hover:bg-black hover:text-white transition-all group font-black text-[10px] tracking-widest uppercase disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black"
                  >
                    ADD TO CART
                  </button>
                )}
                
                {/* TOMBOL DIRECT CHECKOUT - Selalu muncul namun disabled jika tidak ada pilihan */}
                <button 
                  onClick={() => handleAdd(true)} 
                  disabled={!isValidSelection}
                  className={`flex-1 ${directCheckout ? 'md:w-70' : 'md:w-45'} bg-black text-white py-5 px-4 flex items-center justify-center gap-3 hover:bg-gray-800 transition-all group font-black text-[10px] tracking-widest uppercase disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-black`}
                >
                  CHECKOUT
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full md:w-70 animate-in fade-in zoom-in-95 duration-300">
                <Link to="/cart" onClick={closeConfigurator} className="w-full bg-black text-white py-5 px-8 flex items-center justify-center gap-4 hover:invert transition-all">
                  <ShoppingCart size={18} /> <span className="text-sm font-black tracking-[0.3em]">CHECKOUT</span>
                </Link>
                <button onClick={closeConfigurator} className="w-full py-3 text-[10px] font-black border border-black hover:bg-black hover:text-white transition-all">
                  CONTINUE SHOPPING
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full z-20 rotate-180"><TicketEdges /></div>
    </div>
  );
};

export default CartCard;