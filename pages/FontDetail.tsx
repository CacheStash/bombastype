/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TypeTester from '../components/TypeTester';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight, ArrowRight, Download, DollarSign, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/api/images/${filename}`; 
};

const FontDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [font, setFont] = useState<any>(null);
  const navigate = useNavigate();
  const { openConfigurator } = useCart(); 
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [fontRes, promosRes] = await Promise.all([
      supabase.from('fonts').select('*').eq('id', id).single(),
      supabase.from('promotions').select('*').eq('is_active', true)
    ]);
    if (fontRes.data) setFont(fontRes.data);
    if (promosRes.data) setPromos(promosRes.data);
    setLoading(false);
  };

  const activePromo = useMemo(() => {
    if (!font) return null;
    const now = new Date();
    return promos.find(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      const fontIds = typeof p.font_ids === 'string' ? JSON.parse(p.font_ids) : (p.font_ids || []);
      return now >= start && now <= end && (p.type === 'global' || fontIds.includes(font.id));
    });
  }, [font, promos]);

  const fontPreviews = Array.isArray(font?.preview_images) ? font.preview_images : [];
  const basePrice = font?.price || 25;
  const styleCount = Array.isArray(font?.font_files) ? font.font_files.length : 1;
  const discountPrice = activePromo ? (basePrice * (1 - (activePromo.discount_percent / 100))).toFixed(0) : basePrice;
  const tags = Array.isArray(font?.tags) ? font.tags : (typeof font?.tags === 'string' ? font.tags.split(',') : []);

  const displayImages = [...fontPreviews];
  const totalSlides = displayImages.length;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  // Keyboard navigation untuk Fullscreen Pop-out
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenOpen) return;
      if (e.key === 'Escape') setIsFullscreenOpen(false);
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, totalSlides]);

  if (loading) return <div className="p-20 text-center uppercase font-bold animate-pulse tracking-widest text-vintage-ink">LOADING_SPECIMEN_DATA...</div>;
  if (!font) return <div className="p-20 text-center uppercase font-bold text-vintage-ink">Font not found.</div>;

  return (
    <div className="relative z-10 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper min-h-screen bg-transparent overflow-x-hidden pb-24">
      
      {/* 1. HEADER SECTION */}
      <section className="text-center max-w-3xl mx-auto relative z-10 px-6 pt-12 mb-16">
        <motion.p className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4">
          Typeface Archival Specimen
        </motion.p>
        
        <motion.h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight capitalize">
          {font.name}
        </motion.h2>
        
        <motion.p className="text-base md:text-lg lg:text-xl italic text-vintage-ink/60 leading-relaxed">
          Consisting of {styleCount} unique styles
        </motion.p>
      </section>

      {/* 2. TOP SLIDER SECTION (Ratio 1160x772 Container Width with Scrollable Long Images) */}
      <section className="relative w-full max-w-7xl mx-auto px-4 md:px-8 group mb-20">
        <div className="relative w-full overflow-hidden border border-vintage-ink/20 aspect-[1160/772] bg-vintage-paper/50 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlide}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative"
            >
              {displayImages[currentSlide] ? (
                <div 
                  onClick={() => setIsFullscreenOpen(true)}
                  className="w-full min-h-full cursor-zoom-in group/mainimg relative"
                  title="Click to view full screen"
                >
                  <img 
                    src={resolvePreviewUrl(displayImages[currentSlide])!} 
                    className="w-full h-auto object-top block" 
                    alt={`Specimen ${currentSlide + 1}`} 
                  />
                  
                  {/* Floating zoom hint */}
                  <div className="absolute top-4 right-4 bg-vintage-paper/90 border border-vintage-ink text-vintage-ink p-2 opacity-0 group-hover/mainimg:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md">
                    <Maximize2 size={16} />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-vintage-ink/5" />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          {totalSlides > 1 && (
            <>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); prevSlide(); }} 
                className="absolute left-0 top-0 h-full w-14 md:w-20 flex items-center justify-center bg-black/0 hover:bg-black/10 text-vintage-paper transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft size={44} strokeWidth={1} className="drop-shadow-md text-white" />
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); nextSlide(); }} 
                className="absolute right-0 top-0 h-full w-14 md:w-20 flex items-center justify-center bg-black/0 hover:bg-black/10 text-vintage-paper transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight size={44} strokeWidth={1} className="drop-shadow-md text-white" />
              </button>
            </>
          )}
        </div>

        {/* HORIZONTAL IMAGE THUMBNAILS (Top-Cropped) */}
        {totalSlides > 1 && (
          <div className="w-full pt-6 pb-2">
            <div className="flex items-center justify-center gap-3 overflow-x-auto custom-scrollbar py-2">
              {displayImages.map((img, i) => {
                const imgUrl = resolvePreviewUrl(img);
                if (!imgUrl) return null;
                const isActive = currentSlide === i;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSlide(i)}
                    className={`relative shrink-0 h-16 md:h-20 aspect-[1160/772] overflow-hidden border transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'border-vintage-accent ring-2 ring-vintage-accent/40 opacity-100 scale-105 shadow-md' 
                        : 'border-vintage-ink/20 opacity-40 hover:opacity-80 hover:border-vintage-ink/50'
                    }`}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`Thumbnail ${i + 1}`} 
                      className="w-full h-full object-cover object-top" 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* FULLSCREEN POP-OUT MODAL */}
      <AnimatePresence>
        {isFullscreenOpen && displayImages[currentSlide] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-8"
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between z-50 text-white pb-4">
              <span className="text-xs uppercase tracking-widest font-mono opacity-60">
                {currentSlide + 1} / {totalSlides} — {font.name}
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreenOpen(false)}
                className="p-2 border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Full Image Viewport */}
            <div 
              className="relative w-full h-[85vh] flex items-center justify-center overflow-y-auto custom-scrollbar"
              onClick={() => setIsFullscreenOpen(false)}
            >
              <img
                src={resolvePreviewUrl(displayImages[currentSlide])!}
                alt={`Full Specimen ${currentSlide + 1}`}
                className="max-w-full max-h-none md:max-h-full object-contain cursor-default select-none shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Navigation in Modal */}
              {totalSlides > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    className="fixed left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 border border-white/20 text-white hover:bg-white hover:text-black transition-all cursor-pointer z-50"
                    title="Previous"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                    className="fixed right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 border border-white/20 text-white hover:bg-white hover:text-black transition-all cursor-pointer z-50"
                    title="Next"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Modal Hint */}
            <div className="text-[10px] uppercase font-mono tracking-widest text-white/40 pt-2">
              Press ESC to exit • Arrow keys to navigate
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. TYPE TESTER SECTION */}
      <section className="w-full mt-24 border-y border-vintage-ink/10 bg-transparent relative z-40">
        <div className="max-w-full">
          <TypeTester 
            config={{
              ...font,
              family: `"${font.name}"`,
              styleCount: styleCount,
              randomText: font.random_text
            }} 
          />
        </div>
      </section>

      {/* 4. DESCRIPTION & TAGS SECTION */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center relative z-10">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-vintage-accent mb-10">Background & Characteristics</h4>
        <p className="text-lg md:text-xl text-vintage-ink/80 leading-relaxed italic font-serif mb-12">
          {font.description}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {tags.map((tag: string) => (
            <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-vintage-ink/10 rounded-full opacity-60">
              #{tag.trim()}
            </span>
          ))}
        </div>
      </section>

      {/* 5. INVESTMENT & ACTION SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-vintage-ink/10 flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-vintage-accent mb-4 italic">Pricing Information</span>
          <div className="flex items-end gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Starting at</span>
              <div className="flex items-start text-vintage-ink justify-center lg:justify-start">
                <DollarSign size={45} className="mt-7 md:mt-9 text-vintage-accent shrink-0" strokeWidth={2.5} />
                <span className="text-7xl md:text-9xl font-display tracking-tighter leading-none">
                  {Number(discountPrice).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
            {activePromo && (
              <div className="flex flex-col pb-2">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Promo Active</span>
                <div className="flex items-start text-vintage-ink line-through opacity-30 decoration-vintage-accent decoration-2">
                  <DollarSign size={20} className="mt-2 md:mt-1.5 text-vintage-accent shrink-0" strokeWidth={2.5} />
                  <span className="text-3xl md:text-4xl font-display leading-none">
                    {Number(basePrice).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-auto">
          <button 
            onClick={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, activeDiscount: activePromo?.discount_percent || 0, directCheckout: true })}
            className="vintage-btn btn-reverse px-16 py-7 text-sm tracking-[0.3em] w-full md:w-96 flex items-center justify-center gap-4 group"
          >
            BUY FULL LICENSE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, initialOption: 'trial' })}
            className="vintage-btn px-16 py-5 text-[10px] tracking-[0.3em] w-full md:w-96 border-vintage-ink/20 flex items-center justify-center gap-3 group"
          >
            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" /> DOWNLOAD FREE TRIAL
          </button>
          
          <div className="flex justify-center lg:justify-end mt-4">
            <button 
              onClick={() => navigate('/fonts')}
              className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 hover:opacity-100 hover:text-vintage-accent transition-all"
            >
              ← RETURN TO ARCHIVE
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FontDetail;