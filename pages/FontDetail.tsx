/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TypeTester from '../components/TypeTester';
import { useCart } from '../context/CartContext';
import { getCachedFontByIdOrSlug, getCachedPromos } from '../utils/fontCache';
import { ChevronLeft, ChevronRight, ArrowRight, Download, DollarSign, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/api/images/${filename}`; 
};

const FontDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const initialCachedFont = useMemo(() => getCachedFontByIdOrSlug(id || ''), [id]);
  const [font, setFont] = useState<any>(initialCachedFont);
  const navigate = useNavigate();
  const { openConfigurator } = useCart(); 
  const [promos, setPromos] = useState<any[]>(() => getCachedPromos());
  const [loading, setLoading] = useState(!initialCachedFont);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isLongImage, setIsLongImage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateCopied, setAffiliateCopied] = useState(false);

  useEffect(() => { 
    if (initialCachedFont && !font) {
      setFont(initialCachedFont);
      setLoading(false);
    }
    fetchData(); 
  }, [id]);

  const fetchData = async () => {
    if (!initialCachedFont && !font) {
      setLoading(true);
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
    let fontQuery = supabase.from('fonts').select('*');
    if (isUuid) {
      fontQuery = fontQuery.eq('id', id);
    } else {
      const cleanName = (id || '').replace(/-/g, ' ').trim();
      fontQuery = fontQuery.ilike('name', cleanName);
    }

    const [fontRes, promosRes, { data: { session } }] = await Promise.all([
      fontQuery.maybeSingle(),
      supabase.from('promotions').select('*').eq('is_active', true),
      supabase.auth.getSession()
    ]);
    if (fontRes.data) setFont(fontRes.data);
    if (promosRes.data) setPromos(promosRes.data);

    if (session?.user) {
      const [{ data: adminCheck }, { data: affData }] = await Promise.all([
        supabase.from('fontadmin').select('id').eq('id', session.user.id).maybeSingle(),
        supabase.from('affiliates').select('affiliate_code').eq('user_id', session.user.id).maybeSingle()
      ]);
      if (adminCheck) setIsAdmin(true);
      if (affData) setAffiliateCode(affData.affiliate_code);
    }
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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const standardRatio = 1160 / 772; // ~1.5025
    const actualRatio = img.naturalWidth / img.naturalHeight;

    // Toleransi: Hanya aktifkan mode scrollable jika gambar signifikan lebih panjang (>10%) dari rasio standar.
    // Selisih minor 1-5px atau pembulatan subpixel akan diabaikan.
    setIsLongImage(actualRatio < standardRatio - 0.15);
  };

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

  // Dynamic SEO Title & Schema.org Product Structured Data injection
  useEffect(() => {
    if (!font?.name) return;

    // Dynamic Title
    const originalTitle = document.title;
    document.title = `${font.name} Font — Bombastype Type Foundry`;

    // Inject Product JSON-LD
    const scriptId = 'font-product-jsonld';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const currentUrl = window.location.href.split('?')[0];
    const primaryImage = fontPreviews.length > 0 ? resolvePreviewUrl(fontPreviews[0]) : null;
    const absoluteImage = primaryImage?.startsWith('http') 
      ? primaryImage 
      : (primaryImage ? `${window.location.origin}${primaryImage}` : undefined);

    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `${font.name} Typeface`,
      "description": font.description || `${font.name} digital font family designed by Amir Subqi Setiaji & Bangkit Tri Setiadi.`,
      "image": absoluteImage,
      "brand": {
        "@type": "Brand",
        "name": "Bombastype"
      },
      "creator": [
        {
          "@type": "Person",
          "name": "Amir Subqi Setiaji",
          "url": "https://subqi.com"
        },
        {
          "@type": "Person",
          "name": "Bangkit Tri Setiadi",
          "url": "https://bombastype.com"
        }
      ],
      "offers": {
        "@type": "Offer",
        "price": discountPrice || basePrice,
        "priceCurrency": "USD",
        "priceValidUntil": "2027-12-31",
        "availability": "https://schema.org/InStock",
        "url": currentUrl,
        "seller": {
          "@type": "Organization",
          "name": "Bombastype Type Foundry",
          "url": "https://bombastype.com"
        }
      },
      "category": "Digital Typography / Desktop & Web Font"
    };

    scriptTag.textContent = JSON.stringify(productSchema);

    return () => {
      document.title = originalTitle;
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [font, basePrice, discountPrice, fontPreviews]);

  if (loading) return <div className="p-20 text-center uppercase font-bold animate-pulse tracking-widest text-vintage-ink">LOADING_SPECIMEN_DATA...</div>;
  if (!font) return <div className="p-20 text-center uppercase font-bold text-vintage-ink">Font not found.</div>;

  return (
    <div className="relative z-10 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper min-h-screen bg-transparent overflow-x-hidden pb-24">
      
      {/* 1. HEADER SECTION */}
      <section className="text-center max-w-5xl mx-auto relative z-10 px-6 pt-12 mb-16">
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

      {/* 2. COMPACT SPECIMEN & PURCHASE SECTION (Col 1: Rail, Col 2: Main Preview, Col 3: Price + Actions + Description) */}
      <section className="relative w-full max-w-[1720px] mx-auto px-4 md:px-8 group mb-16">
        <div className="flex flex-col lg:flex-row gap-4 xl:gap-6 items-stretch w-full">
          
          {/* COL 1: VERTICAL THUMBNAIL PICKER (FAR LEFT, Scrolling Up/Down) */}
          {totalSlides > 1 && (
            <div className="w-full lg:w-24 xl:w-28 shrink-0 relative order-2 lg:order-1">
              <div className="flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto custom-scrollbar max-h-24 lg:max-h-none lg:absolute lg:inset-0 py-1 pr-1">
                {displayImages.map((img, i) => {
                  const imgUrl = resolvePreviewUrl(img);
                  if (!imgUrl) return null;
                  const isActive = currentSlide === i;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentSlide(i)}
                      className={`relative shrink-0 w-24 lg:w-full aspect-1160/772 overflow-hidden border transition-all duration-300 cursor-pointer ${
                        isActive 
                          ? 'border-vintage-accent ring-2 ring-vintage-accent/40 opacity-100 shadow-md' 
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

          {/* COL 2: MAIN PREVIEW IMAGE CONTAINER (CENTER - ANCHOR HEIGHT) */}
          <div className="flex-1 min-w-0 relative overflow-hidden border border-vintage-ink/20 aspect-1160/772 bg-vintage-paper/50 shadow-sm order-1 lg:order-2">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentSlide}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={`w-full h-full relative ${
                  isLongImage 
                    ? 'overflow-y-auto overflow-x-hidden custom-scrollbar' 
                    : 'overflow-hidden'
                }`}
              >
                {displayImages[currentSlide] ? (
                  <div 
                    onClick={() => setIsFullscreenOpen(true)}
                    className={`w-full cursor-zoom-in group/mainimg relative ${
                      isLongImage ? 'min-h-full' : 'h-full'
                    }`}
                    title="Click to view full screen"
                  >
                    <img 
                      src={resolvePreviewUrl(displayImages[currentSlide])!} 
                      onLoad={handleImageLoad}
                      className={`w-full block ${
                        isLongImage 
                          ? 'h-auto object-top' 
                          : 'h-full object-cover object-center'
                      }`} 
                      alt={`Specimen ${currentSlide + 1}`} 
                    />
                    
                    {/* Floating zoom hint */}
                    <div className="absolute top-4 right-4 bg-vintage-paper/90 border border-vintage-ink text-vintage-ink p-2 opacity-0 group-hover/mainimg:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md z-20">
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

          {/* COL 3: PRICE, ACTION BUTTONS & COMPACT DESCRIPTION (RIGHT - HEIGHT CAPPED TO PREVIEW) */}
          <div className="w-full lg:w-[360px] xl:w-[410px] shrink-0 border border-vintage-ink/20 bg-vintage-paper/40 p-5 xl:p-6 flex flex-col justify-between order-3 lg:self-stretch overflow-hidden">
            
            {/* Top Block: Pricing + Actions */}
            <div className="shrink-0 flex flex-col">
              {/* Pricing Header */}
              <div className="flex items-center justify-between pb-4 border-b border-vintage-ink/15 mb-5">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                  Starting at
                </span>

                <div className="flex items-baseline gap-3">
                  {activePromo && (
                    <div className="flex items-center text-vintage-ink line-through opacity-40 font-display text-xl">
                      <DollarSign size={16} strokeWidth={2.5} className="text-vintage-accent shrink-0 -mr-0.5" />
                      <span>{Number(basePrice).toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-vintage-ink font-display text-3xl xl:text-4xl">
                    <DollarSign size={24} strokeWidth={2.5} className="text-vintage-accent shrink-0 -mr-0.5" />
                    <span>{Number(discountPrice).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 mb-5">
                <button 
                  onClick={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, activeDiscount: activePromo?.discount_percent || 0, directCheckout: true })}
                  className="vintage-btn btn-reverse py-3.5 px-6 text-xs tracking-[0.25em] w-full flex items-center justify-center gap-3 group font-bold"
                >
                  BUY FULL LICENSE <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button 
                  onClick={() => openConfigurator({ ...font, trialFileUrl: font.trial_file_url, initialOption: 'trial' })}
                  className="vintage-btn py-3 px-6 text-[10px] tracking-[0.25em] w-full border-vintage-ink/20 flex items-center justify-center gap-2.5 group"
                >
                  <Download size={13} className="group-hover:translate-y-0.5 transition-transform" /> DOWNLOAD FREE TRIAL
                </button>
              </div>

              {/* Stealth Affiliate Quick Share Bar */}
              {Boolean(affiliateCode) && (
                <div className="mb-4 p-2.5 border border-vintage-ink/20 bg-vintage-background/80 flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-vintage-accent shrink-0">Partner Link:</span>
                  <code className="font-mono text-[9px] truncate max-w-[170px] opacity-70">
                    {`${window.location.origin}/c/${affiliateCode}/${font.id}`}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/c/${affiliateCode}/${font.id}`);
                      setAffiliateCopied(true);
                      setTimeout(() => setAffiliateCopied(false), 2000);
                    }}
                    className="vintage-btn py-1 px-2 text-[9px] tracking-wider uppercase font-bold shrink-0"
                  >
                    {affiliateCopied ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Description Container (Flex-1 + Overflow Scrollbar, cannot exceed main preview height) */}
            <div className="grow min-h-0 pt-4 border-t border-vintage-ink/15 overflow-y-auto custom-scrollbar pr-1 flex flex-col justify-between">
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-vintage-accent mb-2">
                  Background & Characteristics
                </h4>
                <p className="text-xs xl:text-sm text-vintage-ink/80 leading-relaxed font-serif italic mb-4">
                  {font.description}
                </p>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {tags.map((tag: string) => (
                    <span key={tag} className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-vintage-ink/15 rounded-full opacity-60">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FULLSCREEN POP-OUT MODAL */}
      <AnimatePresence>
        {isFullscreenOpen && displayImages[currentSlide] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-300 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-8"
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
      <section className="w-full mt-16 border-y border-vintage-ink/10 bg-transparent relative z-40">
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

      {/* 4. SPECIFICATIONS & TECHNICAL DETAILS (Crawlable DOM Section for Search Engines & Buyers) */}
      <section className="w-full px-6 sm:px-10 md:px-14 py-16 border-b border-vintage-ink/15 bg-vintage-paper/50">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-vintage-accent mb-4">
              DELIVERABLE ASSETS
            </h3>
            <ul className="text-xs font-mono space-y-2.5 text-vintage-ink/80">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vintage-accent shrink-0"></span>
                <span>OpenType (.OTF) Desktop Font Files</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vintage-accent shrink-0"></span>
                <span>TrueType (.TTF) High-compatibility Files</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vintage-accent shrink-0"></span>
                <span>Web Open Font (.WOFF2 / .WOFF) Webfont Assets</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vintage-accent shrink-0"></span>
                <span>Perpetual Commercial EULA License PDF</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-vintage-accent mb-4">
              OPENTYPE FEATURES &amp; ENCODING
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Standard Ligatures (liga)', 'Contextual Alternates (calt)', 'Stylistic Sets (ss01–ss20)', 'Discretionary Ligatures (dlig)', 'Swashes (swsh)', 'PUA Encoded'].map((feat) => (
                <span key={feat} className="text-[10px] font-mono border border-vintage-ink/20 px-2 py-0.5 bg-vintage-background/40">
                  {feat}
                </span>
              ))}
            </div>
            <p className="text-xs text-vintage-ink/80 leading-relaxed font-serif italic">
              Fully accessible via Adobe Illustrator, Photoshop, InDesign, CorelDraw, Figma, and Glyphs Panel.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-vintage-accent mb-4">
              FOUNDRY &amp; CREATORS
            </h3>
            <p className="text-xs leading-relaxed text-vintage-ink/80 mb-2">
              Designed &amp; engineered with precision by type designers <strong>Amir Subqi Setiaji</strong> &amp; <strong>Bangkit Tri Setiadi</strong> under <strong>Bombastype Type Foundry</strong>.
            </p>
            <p className="text-xs text-vintage-ink/80 font-serif italic">
              Multilingual Latin Support covering Western, Central, and South Eastern European languages.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FontDetail;