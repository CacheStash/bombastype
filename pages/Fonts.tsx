import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronsLeft, ChevronsRight, MoveRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

// --- PARTIAL FIX ---
/** * 1. GUNAKAN PUBLIC DEVELOPMENT URL DARI SCREENSHOT R2 ANDA
 * URL ini adalah jembatan agar browser bisa mengambil file dari Cloudflare
 */


// Helper: Mengubah nama file dari database menjadi URL lengkap R2
const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  
  // Jika URL sudah lengkap (http/https), biarkan apa adanya
  if (filename.startsWith('http') || filename.startsWith('https')) return filename;
  
  // KUNCI PERBAIKAN IOS:
  // Kita paksa browser memanggil lewat domain sendiri (/api/images/)
  // Worker (index.js) nanti yang akan meneruskannya ke R2
  return `/api/images/${filename}`; 
};

const DUMMY_LIBRARY = [
  "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.",
  "The quick brown fox jumps over the lazy dog, showcasing the elegant curves and sharp terminals of this unique typeface.",
  "Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.",
  "A wonderful serenity has taken possession of my entire soul, like these sweet mornings of spring which I enjoy with my whole heart.",
  "But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account."
];


// --- SUB-COMPONENT: DUAL IMAGE SLIDER ---
// --- Context Anchor (Above) --- 
// --- SUB-COMPONENT: DUAL IMAGE SLIDER ---
const PreviewSlider: React.FC<{ images: string[] }> = ({ images }) => {
  const resolvedImages = images.map(resolvePreviewUrl).filter(Boolean) as string[];
  const hasImages = resolvedImages.length > 0;
  
  const baseImages = hasImages ? resolvedImages : [
    'https://placehold.co/400x200?text=Preview+1',
    'https://placehold.co/400x200?text=Preview+2',
    'https://placehold.co/400x200?text=Preview+3'
  ];

  const row1Images = [...baseImages, ...baseImages, ...baseImages];
  const row2Images = [...baseImages].reverse();
  const row2Triple = [...row2Images, ...row2Images, ...row2Images];

  return (
    <div className="grid grid-rows-2 h-[200px] md:h-full w-full md:w-[300px] border-b md:border-b-0 md:border-r border-black overflow-hidden group/slider bg-white">
      <div className="border-b border-black relative overflow-hidden flex items-center">
        <div className="flex flex-nowrap w-max animate-marquee-left group-hover/slider:pause">
          {row1Images.map((img, i) => (
            <img 
              key={i} 
              src={img} 
              crossOrigin="anonymous"
              decoding="async"
              className="w-full h-full object-cover block border-b border-black"
              alt="Top" 
            />
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden flex items-center">
        <div className="flex flex-nowrap w-max animate-marquee-right group-hover/slider:pause">
          {row2Triple.map((img, i) => (
            <img 
              key={`row2-${i}`} 
              src={img} 
              crossOrigin="anonymous"
              decoding="async"
              className="w-full h-full object-cover block border-b border-black"
              alt="Bottom" 
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee-left { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes marquee-right { 0% { transform: translateX(-33.333%); } 100% { transform: translateX(0); } }
        .animate-marquee-left { animation: marquee-left 40s linear infinite; }
        .animate-marquee-right { animation: marquee-right 40s linear infinite; }
        .pause { animation-play-state: paused; }
      `}</style>
    </div>
  );
};
// --- END FIX ---

// --- MAIN COMPONENT ---
const Fonts: React.FC = () => {
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<any[]>([]);
  const navigate = useNavigate();
  const [activePromoId, setActivePromoId] = useState<string | null>(null);

  const { openConfigurator } = useCart();

  // FIXED: Logika filter promo sebelum pagination
  const filteredFonts = fonts.filter(font => {
    if (!activePromoId) return true;
    const promo = promos.find(p => p.id === activePromoId);
    if (!promo) return true;
    if (promo.type === 'global') return true;
    const fontIds = typeof promo.font_ids === 'string' ? JSON.parse(promo.font_ids) : (promo.font_ids || []);
    return fontIds.includes(font.id);
  });
  const [currentPage, setCurrentPage] = useState(1);
  const fontsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (fonts.length > 0) {
      const styleId = 'library-fonts-css';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      const fontFaceRules = fonts.flatMap(f => {
        const files = Array.isArray(f.font_files) ? f.font_files : [f.file_url];
        // Pastikan path sesuai dengan API route Anda (mirip Home.tsx)
        return files.map((file: string, idx: number) => `
          @font-face {
            font-family: "${f.name}-${idx}";
            src: url("/api/fonts/${file}");
            font-display: swap;
          }
        `);
      }).join('\n');
      styleEl.innerHTML = fontFaceRules;
    }
  }, [fonts]);

  const fetchData = async () => {
    setLoading(true);
    const [fontsRes, promosRes] = await Promise.all([
      supabase.from('fonts').select('*').order('display_order', { ascending: true }),
      supabase.from('promotions').select('*').eq('is_active', true)
    ]);
    
    if (fontsRes.data) setFonts(fontsRes.data);
    if (promosRes.data) setPromos(promosRes.data);
    setLoading(false);
  };

  const getActivePromo = (fontId: string) => {
    const now = new Date();
    return promos.find(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      const isTargeted = p.type === 'global' || p.font_ids?.includes(fontId);
      return now >= start && now <= end && isTargeted;
    });
  };

  const calculateDaysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days <= 0) return "Ends today";
    return `${days} day${days > 1 ? 's' : ''} left`;
  };

// Logic Pagination menggunakan data yang sudah difilter promo
  const totalPages = Math.ceil(filteredFonts.length / fontsPerPage);
  const currentFonts = filteredFonts.slice((currentPage - 1) * fontsPerPage, currentPage * fontsPerPage);

  return (
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden">
      {/* Background Orbs agar selaras dengan Home */}
      <div className="grain-orb-base orb-top-right" />
      <div className="grain-orb-base orb-bottom-left" />

      {/* 1. HEADER ORB (Atas Kanan) */}
      <div className="absolute top-[-100px] right-[-100px] w-[800px] h-[600px] pointer-events-none z-0 hidden md:block opacity-50">
          <div className="w-full h-full mix-blend-multiply blur-[80px]" 
               style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.4) 0%, rgba(253, 186, 116, 0.2) 50%, rgba(253, 186, 116, 0) 100%)' }} />
      </div>

      {/* 2. MIDDLE ORB (Tengah Kiri) */}
      <div className="absolute top-[40%] left-[-200px] w-[800px] h-[800px] pointer-events-none z-0 hidden md:block opacity-30">
          <div className="w-full h-full mix-blend-multiply blur-[100px]" 
               style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.3) 0%, rgba(253, 186, 116, 0.1) 50%, rgba(253, 186, 116, 0) 100%)' }} />
      </div>

      {/* 3. BOTTOM ORB (Bawah Kanan) */}
      <div className="absolute bottom-[10%] right-[-200px] w-[800px] h-[800px] pointer-events-none z-0 hidden md:block opacity-40">
          <div className="w-full h-full mix-blend-multiply blur-[100px]" 
               style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.4) 0%, rgba(253, 186, 116, 0.2) 50%, rgba(253, 186, 116, 0) 100%)' }} />
      </div>
      
      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <header className="px-6 py-12 md:px-8 border-b border-black">
         <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85] mb-6">
            All Fonts
          </h2>
          <p className="text-xs md:text-sm font-normal text-gray-600 uppercase tracking-widest">
            Retail & Custom Typefaces
          </p>
        </header>

        {/* FIXED: Menambahkan Toggle Promo di bawah header */}
        {promos.filter(p => {
          const now = new Date();
          return now >= new Date(p.start_date) && now <= new Date(p.end_date);
        }).length > 0 && (
          <div className="w-full border-b border-black bg-orange-500/5 backdrop-blur-md px-6 py-4 md:px-8 flex flex-wrap items-center gap-4 sticky top-0 z-[60]">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black">Active Offers:</span>
            <div className="flex flex-wrap gap-2">
              {promos
                .filter(p => {
                  const now = new Date();
                  return now >= new Date(p.start_date) && now <= new Date(p.end_date);
                })
                .map(promo => (
                  <button
                    key={promo.id}
                    onClick={() => { setActivePromoId(activePromoId === promo.id ? null : promo.id); setCurrentPage(1); }}
                    className={`px-3 md:px-4 py-1 border border-black text-[10px] md:text-xs font-bold uppercase transition-all flex items-center gap-2 ${
                      activePromoId === promo.id ? 'bg-orange-600 text-white border-orange-600' : 'bg-transparent text-black hover:bg-black/5'
                    }`}
                  >
                    <span>{promo.name}</span>
                    <span className={`${activePromoId === promo.id ? 'text-white' : 'text-red-600 font-black'}`}>
                      -{promo.discount_percent}%
                    </span>
                  </button>
                ))}
            </div>
            {activePromoId && (
              <button 
                onClick={() => { setActivePromoId(null); setCurrentPage(1); }}
                className="ml-auto text-[10px] md:text-xs font-black hover:text-orange-600 transition-colors"
              >
                SHOW ALL FONTS
              </button>
            )}
          </div>
        )}

        {/* Fonts List Container */}
        <main className="w-full">
          {loading ? (
            <div className="p-20 text-center font-bold uppercase text-gray-400 animate-pulse tracking-widest">
              Loading Library...
            </div>
          ) : currentFonts.length > 0 ? (
            currentFonts.map((font, idx) => {
              const styleCount = Array.isArray(font.font_files) ? font.font_files.length : 1;
              // --- PARTIAL FIX ---
              const fontPreviews = Array.isArray(font.preview_images) ? font.preview_images : [];
// --- END FIX ---


              const isEven = idx % 2 === 0;
              const promo = getActivePromo(font.id);
              const basePrice = font.price || 25;
              const randomText = DUMMY_LIBRARY[idx % DUMMY_LIBRARY.length];
              const primaryIdx = font.metadata?.primary_font_index || 0;
              const fontFamilyStyle = `"${font.name}-${primaryIdx}"`;

              return (
                <section key={font.id || idx} className="relative grid grid-cols-1 lg:grid-cols-[380px_1fr_120px] border-b border-black group transition-colors hover:bg-white/50 overflow-hidden">


                  {/* DYNAMIC ROW ORB EFFECT */}
                  <div className="absolute z-0 pointer-events-none overflow-visible hidden md:block" 
                       style={{ 
                         width: '1000px', 
                         height: '600px',
                         top: '50%',
                         left: isEven ? '22%' : '78%', 
                         transform: 'translate(-50%, -50%)',
                         opacity: 0.6
                       }}>
                       <div className="w-full h-full mix-blend-multiply blur-[60px]" 
                            style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.6) 0%, rgba(253, 186, 116, 0.3) 50%, rgba(253, 186, 116, 0) 100%)' }} />
                  </div>
                  
                  {/* a. INFO COLUMN */}
                  <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-black flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-normal uppercase tracking-tight leading-none mb-1">{font.name}</h3>
                      <span className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {styleCount} STYLES
                      </span>
                    </div>
                    
                   <div className="mt-8">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                           <span className="flex items-center justify-center border border-black rounded-full px-3 h-6 md:h-7 font-regular italic text-[11px] md:text-[14px] lowercase text-black bg-transparent">
                               starting at
                             </span>
                             {promo && (
                               <span className="flex items-center justify-center border border-orange-600 rounded-full px-3 h-6 md:h-7 font-bold text-[11px] md:text-[14px] uppercase text-red-600 bg-transparent">
                                 {promo.discount_percent}% OFF
                               </span>
                             )}
                        </div>
                        <div className="flex flex-col">
                           {promo ? (
                             <div className="flex items-start gap-3 md:gap-5">
                               <span className="text-8xl md:text-9xl font-light tracking-tighter text-black leading-[0.8]">
                                 ${(basePrice * (1 - (promo.discount_percent / 100))).toFixed(0)}
                               </span>
                               <div className="flex flex-col items-center gap-1 md:gap-2 mt-2 md:mt-4 w-fit">
                                 <div className="relative w-full text-center">
                                   <span className="text-4xl md:text-5xl font-bold text-red-600 font-mono leading-none">
                                     ${basePrice}
                                   </span>
                                   <div className="absolute top-[50%] left-[-5%] w-[110%] h-[2px] bg-orange-600"></div>
                                 </div>
                                 <span className="inline-block border border-orange-600 rounded-full px-2 md:px-3 py-1 font-bold text-[9px] md:text-[10px] uppercase text-red-600 bg-transparent whitespace-nowrap text-center w-full min-w-max">
                                   {calculateDaysLeft(promo.end_date)}
                                 </span>
                               </div>
                             </div>
                           ) : (
                             <div className="text-8xl md:text-9xl font-light tracking-tighter text-black leading-[0.8]">
                               ${basePrice}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* b. TYPE VIEW COLUMN */}
                  <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-black flex items-center bg-transparent">
                    <span 
                      // FIXED: Menambahkan 'normal-case' agar tidak otomatis uppercase
                      className="text-4xl md:text-6xl break-words w-full block opacity-90 transition-opacity group-hover:opacity-100 normal-case"
                      style={{ fontFamily: fontFamilyStyle }}
                    >
                      {randomText}
                    </span>
                  </div>

                  {/* d. ACTION COLUMN */}
                  {/* FIXED: Mengubah hover dan ikon menjadi Eye agar selaras dengan Home */}
                  <div className="grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 border-black">
                    <button 
                      onClick={() => {
                        const promo = getActivePromo(font.id);
                        const discountPercent = promo ? promo.discount_percent : 0;
                        openConfigurator({ 
                          ...font, 
                          trialFileUrl: font.trial_file_url,
                          activeDiscount: discountPercent 
                        });
                      }}
                      className="flex items-center justify-center p-4 border-r lg:border-r-0 lg:border-b border-black hover:bg-black hover:text-white transition-all duration-300 group/cart"
                    >
                      <Plus 
                        size={32} 
                        strokeWidth={1} 
                        className="text-black group-hover/cart:text-white transition-transform duration-300 group-hover/cart:rotate-90" 
                      />
                    </button>
                    <button 
                      onClick={() => navigate(`/font/${font.id}`)}
                      className="flex items-center justify-center p-4 hover:bg-black hover:text-white transition-all duration-300 group/view"
                    >
                      <Eye 
                        size={32} 
                        strokeWidth={1} 
                        className="text-black group-hover/view:text-white transition-transform duration-500 group-hover/view:scale-125" 
                      />
                    </button>
                  </div>

                  {/* 4. MOBILE SPACER */}
                  <div className="md:hidden h-12 border-t border-black w-full bg-orange-500/10" />
                </section>
              );
            })
          ) : (
            <div className="p-20 text-center font-bold uppercase text-gray-400 tracking-widest">
              No fonts available in the library.
            </div>
          )}
        </main>

        {/* PAGINATION CONTROLS */}
        {/* PAGINATION ROW */}
        {totalPages > 1 && (
          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr] w-full border-b border-black bg-transparent relative z-50">
            <button 
              onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="flex items-center justify-center py-8 border-r border-black hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
            >
              <ChevronsLeft size={32} strokeWidth={1} className="transition-transform group-hover/page:-translate-x-1" />
            </button>
            <button 
              onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="flex items-center justify-center py-8 border-r border-black hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
            >
              <ChevronLeft size={32} strokeWidth={1} className="transition-transform group-hover/page:-translate-x-1" />
            </button>
            <div className="flex items-center justify-center py-8 border-r border-black text-[11px] font-normal uppercase tracking-widest text-black">
              Page {currentPage} / {totalPages}
            </div>
            <button 
              onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center py-8 border-r border-black hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
            >
              <ChevronRight size={32} strokeWidth={1} className="transition-transform group-hover/page:translate-x-1" />
            </button>
            <button 
              onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center py-8 hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
            >
              <ChevronsRight size={32} strokeWidth={1} className="transition-transform group-hover/page:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fonts;