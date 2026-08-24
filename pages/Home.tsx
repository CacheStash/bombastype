/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import TypeTester from '../components/TypeTester';

// --- SUB-COMPONENTS: STYLING ELEMENTS ---
const SlantedSpacer = () => (
  <div 
    className="grow w-full text-vintage-ink min-h-10 shrink-0" 
    style={{
      backgroundImage: `repeating-linear-gradient(120deg, currentColor, currentColor 1px, transparent 1px, transparent 7px)`,
      backgroundSize: '100% 100%'
    }}
  />
);

// --- COMPONENT: RECENT FONT CARD (Text View Style) ---
const FontCard = ({ 
  fontName, 
  price, 
  onClick, 
  onAdd,
  primaryIndex = 0 
}: { 
  fontName: string, 
  price: number, 
  onClick: () => void, 
  onAdd: () => void,
  primaryIndex?: number 
}) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className="vintage-card flex flex-col items-center text-center h-full p-6 pt-10 cursor-pointer group/card"
  >
    {/* 1. Header: Nama Font */}
    <div className="h-6 flex items-center justify-center shrink-0 mb-4">
      <p className="text-[15px] capitalize tracking-widest text-vintage-accent font-bold">{fontName}</p>
    </div>
    
    <hr className="w-full border-vintage-ink mb-4 shrink-0" />
    
    {/* 2. Character Previews */}
    <div className="w-full px-2 overflow-hidden bg-vintage-ink/1 shrink-0">
      <h3 
        className="text-4xl md:text-6xl leading-[1.6] break-all tracking-tight py-6"
        style={{ fontFamily: `"${fontName}-${primaryIndex}"`, fontVariantLigatures: "none" }} 
      >
        ABCDEFGHIJKLMNOPQRSTUVWXYZ
      </h3>
    </div>
    
    <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />
    
    <div className="w-full px-2 overflow-hidden bg-vintage-ink/1 flex items-center justify-center shrink-0 py-2 md:py-4">
      <h3 
        className="text-4xl md:text-6xl leading-none break-all tracking-tight text-vintage-ink"
        style={{ fontFamily: `"${fontName}-${primaryIndex}"`, transform: 'translateY(0.05em)' }}
      >
        0123456789
      </h3>
    </div>

    <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />

    <div className="w-full px-2 overflow-hidden bg-vintage-ink/2 flex items-center justify-center shrink-0">
      <h3 
        className="text-3xl md:text-5xl leading-[1.6] break-all tracking-tight py-4 text-vintage-ink"
        style={{ fontFamily: `"${fontName}-${primaryIndex}"`, fontVariantLigatures: "none" }} 
      >
        abcdefghijklmnopqrstuvwxyz
      </h3>
    </div>

    <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />
    <SlantedSpacer />
    <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />

    {/* 3. Footer: Harga & Buttons */}
    <div className="mt-8 w-full shrink-0 flex flex-col gap-3">
      <div className="text-base md:text-lg font-bold text-vintage-ink tracking-tight flex items-center justify-center mb-2">
        <span className="opacity-60 mr-1.5 font-bold">Starting at</span>
        <span className="text-vintage-accent mr-0.5">$</span>{price}
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="vintage-btn py-3 text-[12px] w-full flex items-center justify-center gap-2 group/btn"
      >
        <Plus size={16} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> 
        ADD TO CART
      </button>

      <button className="vintage-btn btn-reverse py-3 text-[12px] w-full flex items-center justify-center gap-2 group/btn">
        <Eye size={16} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> 
        VIEW FONTS
      </button>
    </div>
  </motion.div>
);

// --- MAIN HOME COMPONENT ---
export default function Home() {
  const navigate = useNavigate();
  const { openConfigurator } = useCart();
  const [featuredFonts, setFeaturedFonts] = useState<any[]>([]);
  const [recentFonts, setRecentFonts] = useState<any[]>([]);
  const [allFonts, setAllFonts] = useState<any[]>([]);
  const [currentTesterFontIndex, setCurrentTesterFontIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const HEADER_IMAGES = [
    '/header.webp',
    '/header2.webp',
    '/header3.webp',
    '/header4.webp',
    '/header5.webp',
    '/header6.webp'
  ];
  const [currentHeaderIdx, setCurrentHeaderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeaderIdx(prev => {
        let next;
        do {
          next = Math.floor(Math.random() * HEADER_IMAGES.length);
        } while (next === prev && HEADER_IMAGES.length > 1);
        return next;
      });
    }, 4500); // Berganti secara random setiap 4.5 detik
    return () => clearInterval(interval);
  }, []);
const slideDirection = Math.random() > 0.5 ? 20 : -20;

  useEffect(() => { fetchData(); }, []);

  // Dynamic Font Face Injection untuk Recent Fonts
  useEffect(() => {
    if (recentFonts.length === 0) return;
    const styleId = "dynamic-fonts-home-registry";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement || document.createElement("style");
    styleTag.id = styleId;
    if (!styleTag.parentElement) document.head.appendChild(styleTag);

    styleTag.textContent = recentFonts.map(f => {
      const pIdx = f.metadata?.primary_font_index || 0;
      const file = Array.isArray(f.font_files) ? f.font_files[pIdx] : f.file_url;
      if (!file) return '';
      const version = new Date(f.updated_at || f.created_at || Date.now()).getTime();
      return `@font-face { font-family: "${f.name}-${pIdx}"; src: url("/api/fonts/${file}?v=${version}"); font-display: block; }`;
    }).join("\n");
  }, [recentFonts]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: featured } = await supabase.from('fonts').select('*').filter('metadata->is_featured', 'eq', true).limit(3);
      const { data: recent } = await supabase
        .from('fonts')
        .select('*')
        .filter('metadata->is_handpicked', 'eq', true)
        .order('display_order', { ascending: true })
        .limit(4);
      const { data: all } = await supabase.from('fonts').select('*').order('name', { ascending: true });
      
      if (featured) setFeaturedFonts(featured);
      if (recent) setRecentFonts(recent);
      if (all && all.length > 0) {
        setAllFonts(all);
        setCurrentTesterFontIndex(Math.floor(Math.random() * all.length));
      }
    } catch (err) {
      console.error("Data retrieval failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeTesterFont = allFonts[currentTesterFontIndex] || null;

  const handleNextFont = () => {
    if (allFonts.length <= 1) return;
    setCurrentTesterFontIndex((prev) => (prev + 1) % allFonts.length);
  };

  const handlePrevFont = () => {
    if (allFonts.length <= 1) return;
    setCurrentTesterFontIndex((prev) => (prev - 1 + allFonts.length) % allFonts.length);
  };

  const handleRandomFont = () => {
    if (allFonts.length <= 1) return;
    let nextIdx = Math.floor(Math.random() * allFonts.length);
    if (nextIdx === currentTesterFontIndex) {
      nextIdx = (nextIdx + 1) % allFonts.length;
    }
    setCurrentTesterFontIndex(nextIdx);
  };

  return (
    <div className="pb-12 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper bg-transparent overflow-x-hidden">
     {/* Hero Section */}
      <section className="text-center mb-16 w-full max-w-7xl mx-auto relative z-10 px-4 sm:px-6 md:px-8 pt-12 flex flex-col items-center">
        <motion.p className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-6">
          Retro Refinement: Authentic Vintage & Victorian Typefaces
        </motion.p>
        
        {/* HERO IMAGES (PROPORSIONAL LEBAR & TIDAK OVERLAPPING) */}
        <div className="my-8 sm:my-10 w-full flex justify-center pointer-events-none select-none relative aspect-4/3 sm:aspect-16/10 md:aspect-3/2 max-w-5xl overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.img 
              key={currentHeaderIdx}
              src={HEADER_IMAGES[currentHeaderIdx]} 
              alt="Authentic Vintage Typefaces" 
              initial={{ opacity: 0, x: slideDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -slideDirection }}
              transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0 w-full h-full object-contain scale-120 sm:scale-130 md:scale-140"
            />
          </AnimatePresence>
        </div>

        <motion.p className="text-base md:text-lg lg:text-xl italic opacity-80 max-w-3xl mx-auto mt-6 mb-8 leading-relaxed">
          Original display typefaces inspired by classic eras, meticulously crafted for timeless branding, packaging, & letterpress design.
        </motion.p>
        <div className="flex justify-center mt-12 w-full max-w-xl mx-auto relative z-30">
          <button onClick={() => navigate('/fonts')} className="vintage-btn btn-reverse px-16 py-4 text-sm tracking-[0.3em]">
            EXPLORE OUR FONTS
          </button>
        </div>
      </section>

      {/* Featured Fonts Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        <div className="divider">
          <h2 className="text-3xl md:text-5xl font-script capitalize">Popular Fonts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
          {loading ? (
             [1,2,3].map(i => <div key={i} className="h-80 bg-vintage-ink/5 animate-pulse border border-vintage-ink/10" />)
          ) : (
            featuredFonts.map((font) => (
              <motion.div 
                key={font.id}
                whileHover={{ scale: 1.02 }}
                className="vintage-card flex flex-col p-0 overflow-hidden h-full cursor-pointer group/card"
                onClick={() => navigate(`/font/${font.id}`)}
              >
                <div className="aspect-3/2 w-full bg-vintage-ink/5 border-b border-vintage-ink relative overflow-hidden">
                  {font.preview_images?.[0] && (
                    <img 
                      src={`/api/images/${font.preview_images[0]}`} 
                      alt={font.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" 
                    />
                  )}
                  <div className="absolute top-3 right-3 bg-vintage-paper/95 px-3 py-1 text-[12px] font-bold tracking-widest border border-vintage-ink">
                    <span className="text-vintage-accent mr-0.5">$</span>{font.price}
                  </div>
                </div>
                <div className="p-6 text-center grow flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-display leading-tight capitalize truncate">{font.name}</h3>
                    <hr className="w-full border-vintage-ink/20 my-4" />
                    <p className="text-[10px] font-bold text-vintage-ink/70 uppercase tracking-widest">
                      {Array.isArray(font.font_files) ? font.font_files.length : 1} Styles Available
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openConfigurator({ ...font, trialFileUrl: font.trial_file_url }); }}
                      className="vintage-btn py-2 text-[10px] flex items-center justify-center gap-1 group/btn"
                    >
                      <Plus size={14} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> 
                      ADD
                    </button>
                    <button className="vintage-btn btn-reverse py-2 text-[10px] flex items-center justify-center gap-1 group/btn">
                      <Eye size={14} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> 
                      VIEW
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Recent Fonts Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        <div className="divider">
          <h2 className="text-3xl md:text-5xl font-script capitalize">Handpicked Fonts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10 items-stretch">
          {!loading && recentFonts.map((font) => (
            <FontCard 
              key={font.id}
              fontName={font.name} 
              price={font.price} 
              primaryIndex={font.metadata?.primary_font_index || 0}
              onAdd={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url })}
              onClick={() => navigate(`/font/${font.id}`)}
            />
          ))}
        </div>
      </section>

      {/* Type Yourself Section */}
      {activeTesterFont && (
        <section className="mb-20 md:mb-32 relative z-10 px-4 max-w-7xl mx-auto">
          <div className="divider mb-8">
            <h2 className="text-3xl md:text-5xl font-script capitalize">Type Yourself</h2>
          </div>

          {/* Header Info Font Terpilih & Controller Navigasi Sejajar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 px-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-vintage-accent font-bold">
                Active Font Specimen:
              </span>
              <h3 className="text-2xl md:text-3xl font-display capitalize tracking-tight">
                {activeTesterFont.name}
              </h3>
            </div>

            {/* Tombol Controller Berjajar: [ < ] [ RANDOM TYPEFACE ] [ > ] */}
            <div className="flex items-center gap-1.5">
              {allFonts.length > 1 && (
                <button 
                  type="button"
                  onClick={handlePrevFont}
                  className="vintage-btn p-1.5 text-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper flex items-center justify-center transition-all"
                  title="Previous Font"
                  aria-label="Previous Font"
                >
                  <ChevronLeft size={14} />
                </button>
              )}

              <button 
                type="button"
                onClick={handleRandomFont}
                className="vintage-btn py-1.5 px-3 text-[10px] flex items-center gap-2 group/btn"
                title="Pick Random Typeface"
              >
                <Shuffle size={12} className="transition-transform group-hover/btn:rotate-180" />
                <span className="font-bold tracking-widest uppercase">RANDOM TYPEFACE</span>
              </button>

              {allFonts.length > 1 && (
                <button 
                  type="button"
                  onClick={handleNextFont}
                  className="vintage-btn p-1.5 text-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper flex items-center justify-center transition-all"
                  title="Next Font"
                  aria-label="Next Font"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Container TypeTester */}
          <div className="relative border border-vintage-ink/20 bg-vintage-paper shadow-sm">
            <TypeTester 
              key={activeTesterFont.id}
              config={{
                ...activeTesterFont,
                family: `"${activeTesterFont.name}"`,
                styleCount: Array.isArray(activeTesterFont.font_files) ? activeTesterFont.font_files.length : 1,
                randomText: activeTesterFont.random_text
              }} 
            />

            {/* Action Footer: Price + Add to Cart + View Detail */}
            <div className="p-6 md:p-8 bg-vintage-ink/3 border-t border-vintage-ink/20 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Starting at</span>
                <span className="text-3xl md:text-4xl font-display text-vintage-ink">
                  <span className="text-vintage-accent text-2xl mr-0.5">$</span>{activeTesterFont.price || 25}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => openConfigurator({ ...activeTesterFont, trialFileUrl: activeTesterFont.trial_file_url })}
                  className="vintage-btn py-3 px-6 text-xs whitespace-nowrap w-full sm:w-auto flex items-center justify-center gap-2 group/btn"
                >
                  <Plus size={15} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100 shrink-0" />
                  <span>ADD TO CART</span>
                </button>
                <button 
                  onClick={() => navigate(`/font/${activeTesterFont.id}`)}
                  className="vintage-btn btn-reverse py-3 px-6 text-xs whitespace-nowrap w-full sm:w-auto flex items-center justify-center gap-2 group/btn"
                >
                  <Eye size={15} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100 shrink-0" />
                  <span>VIEW FONT</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}