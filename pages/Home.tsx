import React, { useRef, useState, useEffect } from 'react';
import TypeTester from '../components/TypeTester';
import { supabase } from '../lib/supabase';
import { FontConfig } from '../types';
import { MousePointer2, MoveRight, Circle, Square, Triangle, X } from 'lucide-react';
import { ChevronLeft, ChevronRight , ChevronDown} from 'lucide-react';
import { ChevronsLeft, ChevronsRight, Plus, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext'; // Pastikan path benar
import { useNavigate } from 'react-router-dom';



const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/api/images/${filename}`; 
};

const ScrollableImageStack: React.FC<{ 
  images: string[], 
  onImageClick: (index: number, resolvedImages: string[]) => void 
}> = ({ images, onImageClick }) => {
  const resolvedImages = images.map(resolvePreviewUrl).filter(Boolean) as string[];

  if (resolvedImages.length === 0) return (
    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-white uppercase tracking-widest">
      No Previews
    </div>
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-white scrollbar-hide cursor-zoom-in">
       {resolvedImages.map((img, i) => (
         <img 
           key={i} 
           src={img} 
           onClick={(e) => { e.stopPropagation(); onImageClick(i, resolvedImages); }}
           className="w-full h-auto block border-b border-black/5 last:border-0" 
           alt={`Preview ${i}`} 
         />
       ))}
    </div>
  );
};

// --- GRAPHIC COMPONENT ---
const BrutalistGraphic = () => (
  <div className="flex gap-1">
    <Circle size={24} strokeWidth={1.5} className="fill-transparent stroke-black" />
    <Square size={24} strokeWidth={1.5} className="fill-black stroke-black" />
    <Triangle size={24} strokeWidth={1.5} className="fill-transparent stroke-black" />
  </div>
);


const DUMMY_LIBRARY = [
  "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.",
  "The quick brown fox jumps over the lazy dog, showcasing the elegant curves and sharp terminals of this unique typeface.",
  "Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.",
  "A wonderful serenity has taken possession of my entire soul, like these sweet mornings of spring which I enjoy with my whole heart.",
  "But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account."
];

// --- FLUID TEXT COMPONENT ---
const FluidText: React.FC<{ text: string; className?: string; baseWeight?: number; maxWeight?: number }> = ({ 
  text, 
  className = "",
  baseWeight = 900,
  maxWeight = 100
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);

  if (charsRef.current.length !== text.length) {
    charsRef.current = Array(text.length).fill(null);
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    
    charsRef.current.forEach((span) => {
      if (!span) return;
      const rect = span.getBoundingClientRect();
      const distance = Math.sqrt(Math.pow(e.clientX - (rect.left + rect.width / 2), 2) + Math.pow(e.clientY - (rect.top + rect.height / 2), 2));
      const maxDistance = 250; 

      if (distance < maxDistance) {
        const proximity = 1 - (distance / maxDistance);
        const ease = proximity * proximity; 
        const newWeight = baseWeight + ((maxWeight - baseWeight) * ease);
        span.style.fontVariationSettings = `"wght" ${newWeight}`;
      } else {
        span.style.fontVariationSettings = `"wght" ${baseWeight}`;
      }
    });
  };

  const handleMouseLeave = () => {
    charsRef.current.forEach((span) => {
      if (span) span.style.fontVariationSettings = `"wght" ${baseWeight}`;
    });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block cursor-default ${className}`}
      aria-label={text}
    >
      {text.split('').map((char, i) => (
        <span
          key={i}
          ref={(el) => { charsRef.current[i] = el }}
          className="inline-block transition-[font-variation-settings] duration-150 ease-out will-change-[font-variation-settings]"
          style={{ 
            fontFamily: '"Roboto Flex", sans-serif', 
            fontVariationSettings: `"wght" ${baseWeight}` 
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );
};

// --- MAIN HOME COMPONENT ---
const Home: React.FC = () => {
  const [fonts, setFonts] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'popular' | 'hipster' | 'cheapest' | 'priciest'>('recent');
  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const fontsPerPage = 4;
  const { openConfigurator } = useCart();
  const navigate = useNavigate();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activePromoId, setActivePromoId] = useState<string | null>(null);
  const [expandedFontId, setExpandedFontId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Tetap simpan URL untuk trigger modal
  const [activeGallery, setActiveGallery] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIndex = (activeIndex + 1) % activeGallery.length;
    setActiveIndex(newIndex);
    setSelectedImage(activeGallery[newIndex]);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIndex = (activeIndex - 1 + activeGallery.length) % activeGallery.length;
    setActiveIndex(newIndex);
    setSelectedImage(activeGallery[newIndex]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [fontsRes, promosRes, historyRes] = await Promise.all([
      // Ambil berdasarkan display_order (Stacking)
      supabase.from('fonts').select('*').order('display_order', { ascending: true }),
      supabase.from('promotions').select('*').eq('is_active', true),
      // Ambil data history untuk hitung sales/popularity
      supabase.from('font_history').select('font_id')
    ]);
    
    if (fontsRes.data) {
      // Hitung total sales (Trial + Paid) per Font ID
      const salesCounts = (historyRes.data || []).reduce((acc: Record<string, number>, curr: any) => {
        acc[curr.font_id] = (acc[curr.font_id] || 0) + 1;
        return acc;
      }, {});

      const enrichedFonts = fontsRes.data.map(f => ({
        ...f,
        dynamic_sales: salesCounts[f.id] || 0
      }));
      setFonts(enrichedFonts);
    }
    if (promosRes.data) setPromos(promosRes.data);
    setLoading(false);
  };

  const getActivePromo = (fontId: string) => {
    const now = new Date();
    return promos.find(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      // Mendukung format JSON string dari Supabase atau array murni
      const fontIds = typeof p.font_ids === 'string' ? JSON.parse(p.font_ids) : (p.font_ids || []);
      const isTargeted = p.type === 'global' || fontIds.includes(fontId);
      return now >= start && now <= end && isTargeted;
    });
  };

  const calculateDaysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days <= 0) return "Ends today";
    return `${days} day${days > 1 ? 's' : ''} left`;
  };

  useEffect(() => {
    if (fonts.length > 0) {
      const styleId = 'dynamic-fonts-css';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      const fontFaceRules = fonts.flatMap(f => {
        const files = Array.isArray(f.font_files) ? f.font_files : [f.file_url];
        return files.map((file: string, idx: number) => `
          @font-face {
            font-family: "${f.name}-${idx}";
            src: url("/api/fonts/${file}?v=${new Date(f.updated_at || f.created_at).getTime()}");
            font-display: swap;
          }
        `);
      }).join('\n');
      styleEl.innerHTML = fontFaceRules;
    }
  }, [fonts]);

  const filteredFonts = activeTag 
    ? fonts.filter(font => {
        const tags = Array.isArray(font.tags) ? font.tags : (typeof font.tags === 'string' ? font.tags.split(',') : []);
        return tags.some((t: string) => t.trim().toLowerCase() === activeTag.toLowerCase());
      })
    : fonts;

    const sortedFonts = [...filteredFonts].sort((a, b) => {
    // Recent & Oldest sekarang mengikuti Display Order (Stacking manual)
    if (sortBy === 'recent') return (a.display_order || 0) - (b.display_order || 0);
    if (sortBy === 'oldest') return (b.display_order || 0) - (a.display_order || 0);
    if (sortBy === 'cheapest') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'priciest') return (b.price || 0) - (a.price || 0);
    // Popularitas dihitung dari total baris di font_history
    if (sortBy === 'popular') return (b.dynamic_sales || 0) - (a.dynamic_sales || 0);
    if (sortBy === 'hipster') return (a.dynamic_sales || 0) - (b.dynamic_sales || 0);
    return 0;
  });

  const displayedFonts = sortedFonts.filter(font => {
    if (!activePromoId) return true;
    const promo = promos.find(p => p.id === activePromoId);
    if (!promo) return true;
    if (promo.type === 'global') return true;
    const fontIds = typeof promo.font_ids === 'string' ? JSON.parse(promo.font_ids) : (promo.font_ids || []);
    return fontIds.includes(font.id);
  });

  const totalPages = Math.ceil(displayedFonts.length / fontsPerPage);
  const currentFonts = displayedFonts.slice((currentPage - 1) * fontsPerPage, currentPage * fontsPerPage);
  
  return (

    
    <>
      <div className="grain-orb-base orb-top-right" />
      <div className="grain-orb-base orb-bottom-left" />

      {/* OVERFLOW-X-HIDDEN ADDED HERE TO FIX MOBILE SCROLL ISSUE */}
      <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden">
        <header className="w-full border-b border-black bg-transparent relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[600px] h-[400px] pointer-events-none z-0">
             <div 
                className="w-full h-full mix-blend-multiply blur-[60px]"
                style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.8) 0%, rgba(253, 186, 116, 0.5) 50%, rgba(253, 186, 116, 0) 100%)' }}
             />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_450px] relative z-10">
            <div className="p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-black">
              <div className="flex flex-col items-start gap-0 w-full uppercase">
                {/* Header Tagline Mobile: text-2xl */}
                <FluidText text="Made of Quiet Lines," className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.9] md:leading-[0.85] tracking-tight hover:text-gray-700 transition-colors duration-300" />
                <FluidText text="Shaped Into Living Type," className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.9] md:leading-[0.85] tracking-tight hover:text-gray-700 transition-colors duration-300" />
                <FluidText text="Read In Every Place." className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.9] md:leading-[0.85] tracking-tight hover:text-gray-700 transition-colors duration-300" />
              </div>
            </div>
            <div className="flex flex-col justify-between p-6 md:p-8 min-h-[250px] md:min-h-auto">
              <div className="hidden md:block"></div>
              <div className="flex flex-col items-end gap-6 text-right">
                <button 
                  onClick={() => document.getElementById('collection-start')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group flex items-center gap-2 text-sm font-bold border border-black px-4 py-2 bg-transparent hover:bg-black hover:text-white transition-all"
                >
                  <MousePointer2 size={16} />
                  <span>START YOUR COLLECTION</span>
                </button>
                <div className="text-xs md:text-sm font-bold uppercase tracking-widest leading-relaxed">
                  <p>Find Your Typeface.</p>
                  <p>Begin Today.</p>
                </div>
              </div>
            </div>
          </div>
        </header>


        {activeTag && (
          <div className="w-full border-b border-black bg-white/10 backdrop-blur-md px-6 py-4 md:px-8 flex justify-between items-center sticky top-0 z-50 transition-all">
            <div className="text-xs md:text-sm uppercase font-bold flex items-center gap-2">
              FILTER ACTIVE: <span className="bg-black text-white px-2 py-1 rounded-full">{activeTag}</span>
            </div>
            <button onClick={() => setActiveTag(null)} className="flex items-center gap-1 text-xs font-bold uppercase hover:underline">
              <X size={14} /> Clear Filter
            </button>
          </div>
        )}



        {/* 0. TITLE BAR COLUMN - RESPONSIVE SORTING */}
        <div className="w-full border-b border-black bg-transparent">
          <div className="max-w-full px-6 py-6 md:py-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 md:gap-x-16">
              {[
                { group: ['recent', 'oldest'], labels: { recent: 'Recent', oldest: 'Oldest' } },
                { group: ['popular', 'hipster'], labels: { popular: 'Popular', hipster: 'Hipster' } },
                { group: ['cheapest', 'priciest'], labels: { cheapest: 'Cheapest', priciest: 'Priciest' } }
              ].map((option) => {
                const isActive = option.group.includes(sortBy);
                // Tentukan label berdasarkan state aktif, atau default ke opsi pertama grup
                const currentLabel = isActive ? option.labels[sortBy as keyof typeof option.labels] : option.labels[option.group[0] as keyof typeof option.labels];
                
                return (
                  <button
                    key={option.group[0]}
                    onClick={() => {
                      if (isActive) {
                        // Toggle antar anggota grup (misal: recent -> oldest)
                        const nextSort = sortBy === option.group[0] ? option.group[1] : option.group[0];
                        setSortBy(nextSort as any);
                      } else {
                        // Pilih anggota pertama grup jika grup belum aktif
                        setSortBy(option.group[0] as any);
                      }
                      setCurrentPage(1);
                    }}
                    className={`text-[11px] md:text-[14px] font-bold uppercase tracking-[0.2em] transition-colors duration-200 ${
                      isActive ? 'text-black' : 'text-gray-400 hover:text-black'
                    }`}
                  >
                    {currentLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

{/* FIXED: Menambahkan Toggle Promo yang muncul hanya jika ada promo aktif */}
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
                    onClick={() => setActivePromoId(activePromoId === promo.id ? null : promo.id)}
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
                onClick={() => setActivePromoId(null)}
                className="ml-auto text-[10px] md:text-xs font-black  hover:text-orange-600 transition-colors"
              >
                SHOW ALL FONTS
              </button>
            )}
          </div>
        )}

       <main id="collection-start" className="w-full px-0">
          {loading ? (
            <div className="p-20 text-center font-mono uppercase text-gray-400 animate-pulse">
              Loading collection...
            </div>
          ) : displayedFonts.length > 0 ? (
            <>
              {currentFonts.map((font, index) => {
                const isEven = index % 2 === 0;
                // DESKTOP: Zig Zag logic
                // Tablet Portrait (md) disamakan dengan Mobile. Desktop Layout dimulai pada 'lg' (1024px).
               const gridLayoutClass = isEven 
                  ? "lg:grid-cols-[320px_60px_1fr]" 
                  : "lg:grid-cols-[1fr_60px_320px]";
                
                const isExpanded = expandedFontId === font.id;
                const fontPreviews = Array.isArray(font.preview_images) ? font.preview_images : [];

                const displayFont = {
                  ...font,
                  family: `"${font.name}"`,
                  tags: Array.isArray(font.tags) ? font.tags : (typeof font.tags === 'string' ? font.tags.split(',') : []),
                  styleCount: Array.isArray(font.font_files) ? font.font_files.length : 1,
                  randomText: DUMMY_LIBRARY[index % DUMMY_LIBRARY.length]
                };

                const promo = getActivePromo(font.id || '');
                const basePrice = font.price || 25;

                return (
                  <section key={font.id} className="relative border-b border-black flex flex-col overflow-hidden lg:overflow-visible">
                    {/* GRID UTAMA (Info, Toggle, Tester) */}
                    <div className={`grid grid-cols-1 ${gridLayoutClass}`}>
                   {/* BACKGROUND ORB EFFECT */}
                      <div className="absolute z-0 pointer-events-none overflow-visible hidden md:block" 
                           style={{ 
                             width: '1000px', 
                             height: '600px',
                             top: '50%',
                             left: isEven ? '22%' : '78%', 
                             transform: 'translate(-50%, -50%)',
                             opacity: 0.8
                           }}>
                           <div className="w-full h-full mix-blend-multiply blur-[60px]" 
                         style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.8) 0%, rgba(253, 186, 116, 0.5) 50%, rgba(253, 186, 116, 0) 100%)' }} />
                      </div>
                      
                      {/* FIXED: Menghapus pb-6 pada mobile (pb-0) agar button menempel sempurna ke bawah */}
                    <div className={`p-6 lg:p-8 pb-0 lg:pb-8 flex flex-col justify-between border-b-0 lg:border-b-0 order-1 ${isEven ? 'lg:order-1 lg:border-r border-black' : 'lg:order-3 lg:border-l border-black'}`}>
                      <div>
                        {/* Header: Title Only */}
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div className="flex-1">
                            <h2 className="text-2xl md:text-3xl font-normal uppercase tracking-tight leading-none mb-1 break-words">
                              {font.name}
                            </h2>
                            <span className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase">{displayFont.styleCount} STYLES</span>
                          </div>
                        </div>

                        <div className="hidden lg:block mb-8"><BrutalistGraphic /></div>
                        
                        <div className="hidden lg:flex flex-wrap gap-2 text-[10px] uppercase mb-6">
                          {displayFont.tags.map((tag: string) => (
                            <button key={tag} onClick={() => setActiveTag(activeTag === tag.trim() ? null : tag.trim())} className={`border px-3 py-1 rounded-full font-bold uppercase ${activeTag === tag.trim() ? 'bg-black text-white border-black' : 'border-black text-black hover:bg-black hover:text-white'}`}>{tag}</button>
                          ))}
                        </div>
                      </div>
                      
                      {/* FIXED: Mengeluarkan button dari div mb-6 agar margin bottom tidak menciptakan gap */}
                      <div className="mb-0">
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
                            <div className="flex flex-col items-start gap-2">
                               <span className="text-8xl sm:text-8xl md:text-9xl font-light tracking-tighter text-black leading-[0.8]">${(basePrice * (1 - (promo.discount_percent / 100))).toFixed(0)}</span>
                               <div className="flex items-center gap-4 mt-2">
                                 <div className="relative w-fit text-center">
                                  <span className="text-3xl md:text-4xl font-bold text-red-600 leading-none">${basePrice}</span>
                                  <div className="absolute top-[50%] left-[-5%] w-[110%] h-[2px] bg-orange-600"></div>
                                 </div>
                                 <span className="inline-block border border-orange-600 rounded-full px-2 md:px-3 py-1 font-bold text-[9px] md:text-[10px] uppercase text-red-600 bg-transparent whitespace-nowrap">{calculateDaysLeft(promo.end_date)}</span>
                               </div>
                             </div>
                           ) : (
                             <div className="text-8xl sm:text-8xl md:text-9xl font-light tracking-tighter text-black leading-[0.8]">${basePrice}</div>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-6 lg:hidden">
                        {displayFont.tags.map((tag: string) => (
                          <button key={tag} onClick={() => setActiveTag(activeTag === tag.trim() ? null : tag.trim())} className="border border-black px-2 py-1 rounded-full font-bold text-[10px] uppercase whitespace-nowrap bg-transparent text-black">{tag}</button>
                        ))}
                      </div>
                    </div>

                    {/* MOBILE PREVIEW TOGGLE: Sekarang nempel ke grid bawah karena pb-0 di parent dan mb-[-1.5rem] dihapus */}
                    <button 
                      onClick={() => setExpandedFontId(isExpanded ? null : font.id)}
                      className="lg:hidden w-[calc(100%+3rem)] -mx-6 mt-10 flex items-center justify-center gap-6 py-6 border-y border-black bg-white group/m-toggle hover:bg-black hover:text-white transition-colors relative z-20"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="text-[11px] font-normal tracking-[0.4em] uppercase">Preview Images</span>
                      <ChevronDown size={16} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                    {/* COLUMN: TOGGLE (DESKTOP) */}
                    {/* FIXED: Menggunakan ChevronRight untuk ganjil (isEven=true) dan ChevronLeft untuk genap (isEven=false) */}
                  <div 
                    onClick={() => setExpandedFontId(isExpanded ? null : font.id)}
                    className={`hidden lg:flex flex-col items-center justify-between py-12 border-black cursor-pointer hover:bg-black/5 transition-colors z-40 bg-transparent
                      ${isEven ? 'lg:order-2 border-r' : 'lg:order-2 border-l'}`}
                  >
                    <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                      {isEven ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </div>
                    
                    <span className="uppercase text-[11px] font-normal tracking-[0.4em] whitespace-nowrap -rotate-90 origin-center">
                      PREVIEW IMAGES
                    </span>
                    
                    <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                      {isEven ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </div>
                  </div>

                    {/* COLUMN: TESTER */}
                    <div className={`relative min-h-[400px] border-b-0 lg:border-b-0 order-2 flex items-stretch overflow-hidden ${isEven ? 'lg:order-3' : 'lg:order-1'}`}>
                        <div className={`absolute inset-0 z-30 bg-white transition-transform duration-700 ease-in-out ${isExpanded ? 'translate-x-0 translate-y-0' : ''} ${!isExpanded ? (isEven ? 'lg:-translate-x-full -translate-y-full lg:translate-y-0' : 'lg:translate-x-full -translate-y-full lg:translate-y-0') : ''}`}>
                          <ScrollableImageStack images={fontPreviews} onImageClick={(index, allResolved) => { setActiveGallery(allResolved); setActiveIndex(index); setSelectedImage(allResolved[index]); }} />
                          <button onClick={(e) => { e.stopPropagation(); setExpandedFontId(null); }} className="absolute top-4 right-4 z-50 p-2 bg-black text-white rounded-full hover:scale-110 transition-transform shadow-xl"><X size={16} /></button>
                        </div>
                        <div className="w-full h-full flex items-center">
                          <TypeTester config={displayFont} isEven={isEven} defaultText={isEven ? "The quick brown fox jumps over the lazy dog." : undefined} />
                        </div>
                    </div>
                  </div> {/* GRID UTAMA SELESAI */}

                  {/* 2. NEW ACTION ROW (HORIZONTAL BOTTOM) */}
                  {/* FIXED: bg-white diubah menjadi bg-transparent */}
                  <div className="grid grid-cols-2 w-full border-t border-black bg-transparent relative z-50">
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
                       className="flex items-center justify-center gap-4 py-8 border-r border-black hover:bg-black hover:text-white transition-all group/cart text-black"
                     >
                        <Plus size={32} strokeWidth={1} className="transition-transform duration-300 group-hover/cart:rotate-90 flex-shrink-0" />
                        <span className="text-[11px] font-normal uppercase tracking-widest whitespace-nowrap">Add to Cart</span>
                     </button>
                     <button 
                       onClick={() => navigate(`/font/${font.id}`)} // FIXED: Navigasi ke halaman detail
                       className="flex items-center justify-center gap-4 py-8 hover:bg-black hover:text-white transition-all group/view text-black"
                     >
                        <Eye size={32} strokeWidth={1} className="transition-transform duration-300 group-hover/view:scale-125 flex-shrink-0" />
                        <span className="text-[11px] font-normal uppercase tracking-widest whitespace-nowrap">Font Details</span>
                     </button>
                  </div>

                  {/* 3. SPACER: Muncul di semua ukuran layar (Mobile, Tablet, & Desktop) */}
                  <div className="h-12 border-t border-black w-full bg-orange-500/10" />

                </section>
              );
            })}

            {/* PAGINATION ROW */}
            {totalPages > 1 && (
              <>
                <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr] w-full border-b border-black bg-transparent relative z-50">
                  <button 
                    onClick={() => { setCurrentPage(1); document.getElementById('collection-start')?.scrollIntoView({ behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center py-8 border-r border-black hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
                  >
                    <ChevronsLeft size={32} strokeWidth={1} className="transition-transform group-hover/page:-translate-x-1" />
                  </button>
                  <button 
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); document.getElementById('collection-start')?.scrollIntoView({ behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center py-8 border-r border-black hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
                  >
                    <ChevronLeft size={32} strokeWidth={1} className="transition-transform group-hover/page:-translate-x-1" />
                  </button>
                  <div className="flex items-center justify-center py-8 border-r border-black text-[11px] font-normal uppercase tracking-widest text-black">
                    Page {currentPage} / {totalPages}
                  </div>
                  <button 
                    onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); document.getElementById('collection-start')?.scrollIntoView({ behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center py-8 border-r border-black hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
                  >
                    <ChevronRight size={32} strokeWidth={1} className="transition-transform group-hover/page:translate-x-1" />
                  </button>
                  <button 
                    onClick={() => { setCurrentPage(totalPages); document.getElementById('collection-start')?.scrollIntoView({ behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center py-8 hover:bg-black hover:text-white transition-all disabled:opacity-20 group/page"
                  >
                  <ChevronsRight size={32} strokeWidth={1} className="transition-transform group-hover/page:translate-x-1" />
                  </button>
                </div>
                <button 
                  onClick={() => navigate('/fonts')}
                  className="w-full h-12 border-b border-black flex items-center justify-center hover:bg-black hover:text-white transition-all text-[11px] font-normal uppercase tracking-widest text-black bg-transparent relative z-50"
                >
                  Browse All Fonts
                </button>
              </>
            )}
            </>
          ) : (
             <div className="p-20 text-center font-mono uppercase text-gray-400">
               No fonts found with tag "{activeTag}". 
               <button onClick={() => setActiveTag(null)} className="underline ml-2 text-black font-bold">Clear Filter</button>
             </div>
          )}
        </main>
      </div>
      {/* FULL SCREEN GALLERY MODAL */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 select-none"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button className="absolute top-8 right-8 text-white/50 hover:text-white z-[110] transition-colors">
            <X size={48} strokeWidth={1} />
          </button>

          {/* Navigation Arrows */}
          {activeGallery.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-4 md:left-8 p-4 text-white/50 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10"
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-4 md:right-8 p-4 text-white/50 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-bold text-white/40 text-sm tracking-widest uppercase">
            {activeIndex + 1} / {activeGallery.length}
          </div>

          <div className="w-full h-full flex items-center justify-center">
            <img 
              key={selectedImage} // Key agar ada animasi setiap ganti gambar
              src={selectedImage} 
              className="max-w-full max-h-full object-contain animate-in zoom-in-95 fade-in duration-300 pointer-events-none shadow-2xl"
              alt="Gallery View" 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Home;