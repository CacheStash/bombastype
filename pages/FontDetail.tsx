/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TypeTester from '../components/TypeTester';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight, ArrowRight, Download } from 'lucide-react';
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

  if (loading) return <div className="p-20 text-center uppercase font-bold animate-pulse tracking-widest text-vintage-ink">LOADING_SPECIMEN_DATA...</div>;
  if (!font) return <div className="p-20 text-center uppercase font-bold text-vintage-ink">Font not found.</div>;

  const fontPreviews = Array.isArray(font.preview_images) ? font.preview_images : [];
  const basePrice = font.price || 25;
  const styleCount = Array.isArray(font.font_files) ? font.font_files.length : 1;
  const discountPrice = activePromo ? (basePrice * (1 - (activePromo.discount_percent / 100))).toFixed(0) : basePrice;
  const tags = Array.isArray(font.tags) ? font.tags : (typeof font.tags === 'string' ? font.tags.split(',') : []);

  // --- SLIDER LOGIC: Handling Odd Numbers by Looping first image ---
 const displayImages = [...fontPreviews];
  const totalSlides = displayImages.length;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  return (
    <div className="relative z-10 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper min-h-screen bg-transparent overflow-x-hidden pb-24">
      
      {/* 1. HEADER SECTION (Diselaraskan pt-12 & max-w-3xl) */}
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

      {/* 2. TOP SLIDER SECTION (1 Image per Slide) */}
      <section className="relative w-full border-y border-vintage-ink/10 group bg-vintage-paper/50 mb-20">
        <div className="flex overflow-hidden aspect-video md:aspect-21/9">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlide}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              {/* Container mengunci ratio 3:2 (1440x960) dan memastikan full width */}
              <div className="relative w-full aspect-3/2 overflow-hidden flex justify-center items-center bg-vintage-ink/2">
                {displayImages[currentSlide] ? (
                  <img 
                    src={resolvePreviewUrl(displayImages[currentSlide])!} 
                    className="w-full h-full object-contain" 
                    alt={`Preview ${currentSlide}`} 
                  />
                ) : (
                  <div className="w-full h-full bg-vintage-ink/2" />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {totalSlides > 1 && (
          <>
            <button 
              onClick={prevSlide} 
              className="absolute left-0 top-0 h-full w-16 md:w-24 flex items-center justify-center bg-vintage-paper/0 hover:bg-vintage-ink/5 text-vintage-ink opacity-0 group-hover:opacity-100 transition-all z-30"
            >
              <ChevronLeft size={48} strokeWidth={0.5} />
            </button>
            <button 
              onClick={nextSlide} 
              className="absolute right-0 top-0 h-full w-16 md:w-24 flex items-center justify-center bg-vintage-paper/0 hover:bg-vintage-ink/5 text-vintage-ink opacity-0 group-hover:opacity-100 transition-all z-30"
            >
              <ChevronRight size={48} strokeWidth={0.5} />
            </button>
          </>
        )}

        {/* Bullets Centered in page */}
        <div className="absolute -bottom-12 left-0 right-0 w-full flex justify-center gap-4 z-20">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentSlide(i)} 
              className="p-2 group/dot outline-none"
            >
              <div className={`h-1 transition-all duration-500 ${
                currentSlide === i 
                ? 'w-12 bg-vintage-accent' 
                : 'w-2 bg-vintage-ink/20 group-hover/dot:bg-vintage-ink/40'
              }`} />
            </button>
          ))}
        </div>
      </section>

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

      {/* 4. DESCRIPTION & TAGS SECTION (FAQ style center) */}
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
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-vintage-ink/10 flex flex-col lg:flex-row justify-between items-center lg:items-end gap-12 relative z-10">
        <div className="flex flex-col items-center lg:items-start">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-vintage-accent mb-4 italic">Pricing Information</span>
          <div className="flex items-baseline gap-6">
            <div className="flex flex-col">
               <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Starting at</span>
               <span className="text-8xl md:text-9xl font-display leading-none tracking-tighter">${discountPrice}</span>
            </div>
            {activePromo && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-1">Promo Active</span>
                <span className="text-3xl md:text-4xl line-through opacity-20 decoration-vintage-accent decoration-2 font-display">${basePrice}</span>
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