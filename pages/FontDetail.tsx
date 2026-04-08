/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TypeTester from '../components/TypeTester';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight, Circle, ArrowRight } from 'lucide-react';
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
  
  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchData();
  }, [id]);

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

  if (loading) return <div className="p-20 text-center uppercase font-bold animate-pulse tracking-widest text-vintage-ink">Loading Font Details...</div>;
  if (!font) return <div className="p-20 text-center uppercase font-bold text-vintage-ink">Font not found.</div>;

  const fontPreviews = Array.isArray(font.preview_images) ? font.preview_images : [];
  const basePrice = font.price || 25;
  const styleCount = Array.isArray(font.font_files) ? font.font_files.length : 1;
  const discountPrice = activePromo ? (basePrice * (1 - (activePromo.discount_percent / 100))).toFixed(0) : basePrice;

  // Slider Logic (2 images per slide)
  const totalSlides = Math.ceil(fontPreviews.length / 2);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  return (
    <div className="relative z-10 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper min-h-screen bg-transparent overflow-x-hidden pb-20">
      
      {/* 1. TOP SLIDER SECTION */}
      <section className="relative w-full bg-vintage-paper border-b border-vintage-ink/20 group">
        <div className="flex overflow-hidden aspect-[21/9] md:aspect-[21/7]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 w-full h-full"
            >
              {[0, 1].map((offset) => {
                const imgIdx = currentSlide * 2 + offset;
                const img = fontPreviews[imgIdx];
                return img ? (
                  <div key={imgIdx} className={`relative h-full overflow-hidden ${offset === 0 ? 'border-r border-vintage-ink/10' : ''}`}>
                    <img 
                      src={resolvePreviewUrl(img)!} 
                      className="w-full h-full object-cover" 
                      alt={`Preview ${imgIdx}`} 
                    />
                  </div>
                ) : (
                  <div key={imgIdx} className="bg-vintage-ink/5" />
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slider Controls */}
        {totalSlides > 1 && (
          <>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-vintage-paper/80 border border-vintage-ink/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-vintage-paper/80 border border-vintage-ink/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={24} />
            </button>
            
            {/* Dots Navigation */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)} className="transition-all duration-300">
                  <Circle size={8} fill={currentSlide === i ? "currentColor" : "none"} className={currentSlide === i ? "text-vintage-accent" : "text-vintage-ink/30"} />
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 2. FONT INFO SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl lg:text-9xl font-display capitalize leading-none tracking-tighter"
          >
            {font.name}
          </motion.h1>
          
          <div className="flex items-center gap-6 mt-8 border-y border-vintage-ink/10 py-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-vintage-accent mb-1">Architecture</span>
              <span className="text-sm font-bold opacity-60 uppercase tracking-widest">{styleCount} Styles Available</span>
            </div>
            {activePromo && (
              <div className="flex flex-col border-l border-vintage-ink/10 pl-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-1">Limited Offer</span>
                <span className="text-sm font-bold text-orange-600 uppercase tracking-widest">{activePromo.name} (-{activePromo.discount_percent}%)</span>
              </div>
            )}
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-10 text-lg md:text-xl italic text-vintage-ink/70 leading-relaxed font-serif"
          >
            {font.description}
          </motion.p>
        </div>
      </section>

      {/* 3. FULL FUNCTION TYPETESTER */}
      <section className="w-full border-y border-vintage-ink/20 bg-vintage-ink/[0.01]">
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

      {/* 4. PRICING & ACTIONS SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-vintage-ink/40 mb-4 italic">Investment starting at</span>
          <div className="flex items-baseline gap-4">
            <span className="text-7xl md:text-9xl font-display leading-none tracking-tighter">${discountPrice}</span>
            {activePromo && (
              <span className="text-2xl md:text-3xl line-through opacity-20 decoration-vintage-accent decoration-2">${basePrice}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-auto">
          <button 
            onClick={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, activeDiscount: activePromo?.discount_percent || 0, directCheckout: true })}
            className="vintage-btn btn-reverse px-16 py-6 text-sm tracking-[0.3em] w-full md:w-80 flex items-center justify-center gap-3 group"
          >
            BUY FULL LICENSE <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, initialOption: 'trial' })}
            className="vintage-btn px-16 py-4 text-[10px] tracking-[0.3em] w-full md:w-80 border-vintage-ink/20"
          >
            DOWNLOAD FREE TRIAL
          </button>
          
          <button 
            onClick={() => navigate('/fonts')}
            className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity mt-2"
          >
            ← Back to Archive
          </button>
        </div>
      </section>

    </div>
  );
};

export default FontDetail;