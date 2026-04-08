/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChevronsLeft, 
  ChevronsRight, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Eye, // Tambah Eye Icon
  LayoutGrid,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

// --- HELPERS & CONSTANTS ---
const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http') || filename.startsWith('https')) return filename;
  return `/api/images/${filename}`; 
};

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

// --- COMPONENT: THUMBNAIL CARD (3x4 Style) ---
const ThumbnailCard = ({ font, promo, onAdd, onView }: any) => {
  const basePrice = font.price || 25;
  const displayPrice = promo ? (basePrice * (1 - (promo.discount_percent / 100))).toFixed(0) : basePrice;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="vintage-card flex flex-col p-0 overflow-hidden h-full cursor-pointer group"
      onClick={onView}
    >
      <div className="aspect-3/2 w-full bg-transparent border-b border-vintage-ink relative overflow-hidden">
        {font.preview_images?.[0] && (
          <img 
            src={resolvePreviewUrl(font.preview_images[0]) || ''} 
            alt={font.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        )}
        <div className="absolute top-3 right-3 bg-vintage-paper/95 px-3 py-1 text-[12px] font-bold tracking-widest border border-vintage-ink">
          <span className="text-vintage-accent mr-0.5">$</span>{displayPrice}
        </div>
        {promo && (
          <div className="absolute top-3 left-3 bg-vintage-accent text-vintage-paper px-2 py-1 text-[9px] font-black uppercase tracking-tighter">
            {promo.discount_percent}% OFF
          </div>
        )}
      </div>
      <div className="p-6 text-center grow flex flex-col justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display leading-tight capitalize truncate">{font.name}</h3>
          
          {/* Divider & Darker Style Info */}
          <hr className="w-full border-vintage-ink/20 my-4" />
          <p className="text-[10px] font-bold text-vintage-ink/70 uppercase tracking-widest">
            {Array.isArray(font.font_files) ? font.font_files.length : 1} Styles Available
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
           <button 
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="vintage-btn py-2 text-[10px] flex items-center justify-center gap-1 group/btn"
          >
            <Plus size={14} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> ADD
          </button>
          <button className="vintage-btn btn-reverse py-2 text-[10px] flex items-center justify-center gap-1 group/btn">
            <Eye size={14} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> VIEW
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- COMPONENT: CHARACTER CARD (4x3 Style / Text View) ---
const CharacterCard = ({ font, promo, onAdd, onView }: any) => {
  const primaryIdx = font.metadata?.primary_font_index || 0;
  const basePrice = font.price || 25;
  const displayPrice = promo ? (basePrice * (1 - (promo.discount_percent / 100))).toFixed(0) : basePrice;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onView}
      className="vintage-card flex flex-col items-center text-center h-full p-6 pt-10 cursor-pointer group bg-transparent"
    >
      {/* 1. Header: Nama Font */}
      <div className="h-6 flex items-center justify-center shrink-0 mb-4">
        <p className="text-[15px] capitalize tracking-widest text-vintage-accent font-bold">{font.name}</p>
      </div>
      
      <hr className="w-full border-vintage-ink mb-4 shrink-0" />
      
      {/* 2. Tengah Atas: Preview Huruf A-Z */}
      <div className="w-full px-2 overflow-hidden bg-vintage-ink/1 shrink-0">
        <h3 
          className="text-4xl md:text-6xl leading-[1.6] break-all tracking-tight py-6"
          style={{ 
            fontFamily: `"${font.name}-${primaryIdx}"`,
            fontVariantLigatures: "none" 
          }} 
        >
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </h3>
      </div>
      
      <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />
      
      {/* 3. Tengah Bawah: Angka 0-9 (Fix Terpotong dengan transform) */}
      <div className="w-full px-2 overflow-hidden bg-vintage-ink/1 flex items-center justify-center shrink-0 py-2 md:py-4">
        <h3 
          className="text-4xl md:text-6xl leading-none break-all tracking-tight text-vintage-ink"
          style={{ 
            fontFamily: `"${font.name}-${primaryIdx}"`,
            transform: 'translateY(0.05em)' 
          }}
        >
          0123456789
        </h3>
      </div>

      <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />

      {/* 4. Lowercase a-z */}
      <div className="w-full px-2 overflow-hidden bg-vintage-ink/2 flex items-center justify-center shrink-0">
        <h3 
          className="text-3xl md:text-5xl leading-[1.6] break-all tracking-tight py-4 text-vintage-ink"
          style={{ 
            fontFamily: `"${font.name}-${primaryIdx}"`,
            fontVariantLigatures: "none" 
          }} 
        >
          abcdefghijklmnopqrstuvwxyz
        </h3>
      </div>

      <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />
      <SlantedSpacer />
      <hr className="w-full border-vintage-ink/20 shrink-0 my-0" />

      {/* 5. Footer: Harga & Buttons */}
      <div className="mt-8 w-full flex flex-col gap-3">
        <div className="text-base md:text-lg font-bold text-vintage-ink tracking-tight flex items-center justify-center mb-2">
          <span className="opacity-60 mr-1.5">Starting at</span>
          <span className="text-vintage-accent mr-0.5">$</span>{displayPrice}
          {promo && <span className="ml-2 text-xs line-through opacity-30 decoration-vintage-accent">${basePrice}</span>}
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
};

// --- MAIN COMPONENT ---
const Fonts: React.FC = () => {
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'thumbnail' | 'character'>('thumbnail');
  const [activePromoId, setActivePromoId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const navigate = useNavigate();
  const { openConfigurator } = useCart();
  const fontsPerPage = 12;

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (fonts.length > 0) {
      const styleId = 'library-fonts-css';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement || document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);

      styleEl.innerHTML = fonts.flatMap(f => {
        const files = Array.isArray(f.font_files) ? f.font_files : [f.file_url];
        return files.map((file: string, idx: number) => `
          @font-face {
            font-family: "${f.name}-${idx}";
            src: url("/api/fonts/${file}");
            font-display: swap;
          }
        `);
      }).join('\n');
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

  const filteredFonts = fonts.filter(font => {
    if (!activePromoId) return true;
    const promo = promos.find(p => p.id === activePromoId);
    if (!promo || promo.type === 'global') return true;
    const fontIds = typeof promo.font_ids === 'string' ? JSON.parse(promo.font_ids) : (promo.font_ids || []);
    return fontIds.includes(font.id);
  });

  const totalPages = Math.ceil(filteredFonts.length / fontsPerPage);
  const currentFonts = filteredFonts.slice((currentPage - 1) * fontsPerPage, currentPage * fontsPerPage);

  return (
    <div className="relative z-10 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper min-h-screen bg-transparent overflow-x-hidden">
      <div className="max-w-full mx-auto">
        <section className="text-center mb-16 md:mb-24 max-w-3xl mx-auto relative z-10 px-4 pt-12">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4">
            Archive & Library
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight">
            All Fonts
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-base md:text-lg lg:text-xl italic opacity-80 leading-relaxed">
            Browse our complete collection of retail and custom typefaces.
          </motion.p>
        </section>

        {/* VIEW MODE TOGGLE & PROMO BAR */}
        <div className="sticky top-0 z-60 bg-vintage-paper/80 backdrop-blur-md border-y border-vintage-ink w-full">
          <div className="flex flex-col md:flex-row items-stretch md:items-center">
            <div className="flex-1 flex items-center gap-4 px-6 py-4 border-b md:border-b-0 md:border-r border-vintage-ink overflow-x-auto custom-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-widest shrink-0">Offers:</span>
              <div className="flex gap-2">
                {promos.filter(p => new Date() >= new Date(p.start_date) && new Date() <= new Date(p.end_date)).map(promo => (
                  <button
                    key={promo.id}
                    onClick={() => { setActivePromoId(activePromoId === promo.id ? null : promo.id); setCurrentPage(1); }}
                    className={`px-3 py-1 border border-vintage-ink text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activePromoId === promo.id ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}
                  >
                    {promo.name} <span className="text-vintage-accent">-{promo.discount_percent}%</span>
                  </button>
                ))}
              </div>
            </div>

            {/* View Toggle - Enhanced Active & Hover Effects */}
            <div className="flex items-center gap-3 px-6 py-4 bg-transparent">
              <span className="text-[10px] font-black uppercase tracking-widest mr-1 opacity-50">View:</span>
              <button 
                onClick={() => setViewMode('thumbnail')}
                className={`p-2.5 border transition-all duration-300 group ${
                  viewMode === 'thumbnail' 
                  ? 'bg-vintage-ink! text-vintage-background! border-vintage-ink' 
                  : 'bg-transparent border-vintage-ink/20 text-vintage-ink/40 hover:text-vintage-ink'
                }`}
                title="Thumbnail View"
              >
                <LayoutGrid size={18} className={`transition-transform duration-500 ${viewMode === 'thumbnail' ? 'opacity-100' : 'opacity-40 group-hover:rotate-90 group-hover:opacity-100'}`} />
              </button>
              <button 
                onClick={() => setViewMode('character')}
                className={`p-2.5 border transition-all duration-300 group ${
                  viewMode === 'character' 
                  ? 'bg-vintage-ink! text-vintage-background! border-vintage-ink' 
                  : 'bg-transparent border-vintage-ink/20 text-vintage-ink/40 hover:text-vintage-ink'
                }`}
                title="Character Preview"
              >
                <Type size={18} className={`transition-transform duration-500 ${viewMode === 'character' ? 'opacity-100' : 'opacity-40 group-hover:rotate-90 group-hover:opacity-100'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* FONT GRID */}
        <main className="px-4 py-12 md:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-transparent animate-pulse border border-vintage-ink/10" />)}
            </div>
          ) : currentFonts.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-8 ${viewMode === 'thumbnail' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}
              >
                {currentFonts.map((font) => {
                  const promo = getActivePromo(font.id);
                  const props = {
                    key: font.id,
                    font,
                    promo,
                    onAdd: () => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, activeDiscount: promo?.discount_percent || 0 }),
                    onView: () => navigate(`/font/${font.id}`)
                  };
                  return viewMode === 'thumbnail' ? <ThumbnailCard {...props} /> : <CharacterCard {...props} />;
                })}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-20 opacity-40 font-bold uppercase tracking-widest">No matching fonts found.</div>
          )}
        </main>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr] w-full border-y border-vintage-ink bg-transparent relative z-50">
            <button onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} className="flex items-center justify-center py-8 border-r border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-20 group">
              <ChevronsLeft size={32} strokeWidth={1} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <button onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} className="flex items-center justify-center py-8 border-r border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-20 group">
              <ChevronLeft size={32} strokeWidth={1} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <div className="flex items-center justify-center py-8 border-r border-vintage-ink text-[11px] font-bold uppercase tracking-widest">
              Page {currentPage} / {totalPages}
            </div>
            <button onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} className="flex items-center justify-center py-8 border-r border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-20 group">
              <ChevronRight size={32} strokeWidth={1} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} className="flex items-center justify-center py-8 hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-20 group">
              <ChevronsRight size={32} strokeWidth={1} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fonts;