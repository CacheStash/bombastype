/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Layers, Sliders, PenTool, Sparkles, Smartphone, Download, ShieldCheck, Compass } from 'lucide-react';
import { openCanvasWithSession } from '../lib/canvasSession';
import { supabase } from '../lib/supabase';
import { InContextCardWrapper, InContextAddSectionButton } from '../components/admin/InContextCardWrapper';

interface ContentItem {
  id?: string;
  title: string;
  content: string;
  section_id: string;
  category: string;
  sort_order: number;
  type?: string;
}

const CanvasLanding: React.FC = () => {
  const CANVAS_APP_URL = "https://canvas.bombastype.com";
  const [canvasItems, setCanvasItems] = useState<ContentItem[]>([]);

  const fetchCanvasContent = async () => {
    try {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'canvas')
        .order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        setCanvasItems(data);
      }
    } catch (err) {
      console.error('Failed to load canvas site content:', err);
    }
  };

  useEffect(() => {
    fetchCanvasContent();
  }, []);

  const getItem = (secId: string, fallbackTitle: string, fallbackContent: string) => {
    const found = canvasItems.find(i => i.section_id === secId || i.section_id === secId.replace('CV', ''));
    if (found) {
      return {
        id: found.id,
        title: found.title || fallbackTitle,
        content: found.content || fallbackContent,
        section_id: found.section_id || secId,
        category: 'canvas',
        sort_order: found.sort_order ?? 0,
        type: found.type || 'page'
      };
    }
    return {
      title: fallbackTitle,
      content: fallbackContent,
      section_id: secId,
      category: 'canvas',
      sort_order: parseInt(secId.replace('CV', '')) - 1 || 0,
      type: 'page'
    };
  };

  const handleLaunchCanvas = (e: React.MouseEvent) => {
    e.preventDefault();
    openCanvasWithSession(CANVAS_APP_URL);
  };

  return (
    <div className="pb-16 relative z-10 text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper font-serif">
      {/* 1. HERO SECTION */}
      <section className="text-center mb-16 md:mb-24 max-w-4xl mx-auto relative z-10 px-4 pt-10 md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <span className="inline-block w-8 h-px bg-vintage-accent/60"></span>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold text-vintage-accent">
            Online Typography & Vector Studio
          </span>
          <span className="inline-block w-8 h-px bg-vintage-accent/60"></span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-8xl font-display mb-6 leading-[0.95] tracking-tight"
        >
          FONTCANVAS <br />
          <span className="italic font-serif text-3xl sm:text-5xl md:text-7xl opacity-90">
            Vector Studio
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl italic text-vintage-ink/70 leading-relaxed max-w-2xl mx-auto mb-10"
        >
          A powerful in-browser vector typography studio designed to test, distort, stack layered fonts, and compose custom lettering with mathematical fidelity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href={CANVAS_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLaunchCanvas}
            className="bg-vintage-ink !text-vintage-paper hover:bg-vintage-accent hover:!text-white py-4 px-8 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-3 group shadow-md transition-colors"
          >
            <span className="!text-vintage-paper group-hover:!text-white">Launch FontCanvas Studio</span>
            <ArrowUpRight size={16} className="!text-vintage-paper group-hover:!text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
          <Link
            to="/fonts"
            className="canvas-specimen-btn py-4 px-8 text-xs font-bold uppercase tracking-[0.2em] cursor-pointer"
          >
            Font Specimens
          </Link>
        </motion.div>
      </section>

      {/* 2. STUDIO WORKSHOP MOCKUP SHOWCASE */}
      <section className="mb-20 md:mb-28 px-4 max-w-6xl mx-auto">
        <div className="border border-vintage-ink bg-vintage-paper/80 p-4 md:p-8 relative shadow-lg">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vintage-ink/30 pb-3 sm:pb-4 mb-4 sm:mb-6 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-vintage-ink/70">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Compass size={15} className="text-vintage-accent shrink-0" />
              <span className="font-bold truncate text-[10px] sm:text-xs">CANVAS STUDIO WORKSPACE</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] sm:text-[10px] border border-vintage-ink/30 px-1.5 sm:px-2 py-0.5 bg-vintage-ink/5 whitespace-nowrap">
                CHROMATIC SYNC
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-vintage-accent whitespace-nowrap">
                BEZIER ENVELOPE
              </span>
            </div>
          </div>

          {/* Canvas Preview Area */}
          <div className="min-h-[280px] sm:min-h-[360px] md:min-h-[440px] border border-vintage-ink/40 bg-vintage-background flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 relative text-center group cursor-pointer overflow-hidden">
            {/* Victorian Ornamental Grid Background */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #2c241a 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Corner Fleurons */}
            <div className="absolute top-3 left-3 text-xs opacity-40 font-serif pointer-events-none">✦</div>
            <div className="absolute top-3 right-3 text-xs opacity-40 font-serif pointer-events-none">✦</div>
            <div className="absolute bottom-3 left-3 text-xs opacity-40 font-serif pointer-events-none">✦</div>
            <div className="absolute bottom-3 right-3 text-xs opacity-40 font-serif pointer-events-none">✦</div>

            {/* Simulated Envelope Cage */}
            <div className="absolute inset-4 sm:inset-10 md:inset-16 border border-dashed border-vintage-ink/20 pointer-events-none">
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-vintage-ink border border-vintage-paper"></div>
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-vintage-ink border border-vintage-paper"></div>
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-vintage-ink border border-vintage-paper"></div>
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-vintage-ink border border-vintage-paper"></div>
              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-vintage-accent border border-vintage-paper"></div>
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-vintage-accent border border-vintage-paper"></div>
            </div>

            {/* Center Typography Artwork */}
            <div className="relative z-10 max-w-full px-2">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.4em] font-bold text-vintage-accent block mb-1.5 sm:mb-2">
                HERITAGE LETTERPRESS SPECIMEN
              </span>
              <div className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-display uppercase tracking-tight text-vintage-ink drop-shadow-sm select-none break-all">
                BOMBASTYPE
              </div>
              <div className="text-base sm:text-2xl md:text-3xl lg:text-4xl italic font-serif text-vintage-accent mt-0.5 sm:-mt-2 select-none">
                Chromatic Vector Suite
              </div>
            </div>

            {/* Hover Launch Overlay */}
            <a
              href={CANVAS_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLaunchCanvas}
              className="absolute inset-0 bg-vintage-ink/90 !text-vintage-paper flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 p-4"
            >
              <span className="text-xl sm:text-2xl md:text-3xl font-display tracking-wide mb-2 !text-vintage-paper">
                Open FontCanvas Studio
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-vintage-accent font-bold">
                Launch canvas.bombastype.com in new tab ↗
              </span>
            </a>
          </div>

          {/* Footer Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4 text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-vintage-ink/60 border-t border-vintage-ink/20 mt-3 sm:mt-4">
            <div>❖ 4-POINT BEZIER ENVELOPE</div>
            <div>❖ LINKED CHROMATIC STACKING</div>
            <div>❖ TEXT-ON-PATH ENGRAVING</div>
            <div>❖ PRODUCTION VECTOR SVG</div>
          </div>
        </div>
      </section>

      {/* 3. STUDIO CAPABILITIES & PILLARS */}
      <section className="mb-20 md:mb-28 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold text-vintage-accent mb-3">
            Studio Highlights
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-display tracking-tight">
            Craftsmanship Meets Mathematical Rigor
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          {(() => {
            const p1 = getItem('CV01', 'Victorian Ribbon & Envelope Warps', 'Bend type along ornamental arcs, heraldic flags, circular seals, and asymmetric ribbon banners. Interactive 4-point Bézier cages maintain exact stroke contrast without distorting font proportions.');
            return (
              <InContextCardWrapper item={p1} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="border border-vintage-ink bg-vintage-paper/40 p-8 flex flex-col justify-between hover:bg-vintage-paper/90 transition-colors h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-display opacity-40">I.</span>
                      <Sliders size={22} className="text-vintage-accent" />
                    </div>
                    <h3 className="text-xl font-display mb-3 tracking-wide">{p1.title}</h3>
                    <div className="text-sm leading-relaxed text-vintage-ink/75" dangerouslySetInnerHTML={{ __html: p1.content }} />
                  </div>
                  <div className="pt-6 mt-6 border-t border-vintage-ink/20 text-[10px] uppercase tracking-[0.2em] font-bold text-vintage-accent">
                    15+ HISTORIC WARP PRESETS
                  </div>
                </div>
              </InContextCardWrapper>
            );
          })()}

          {/* Pillar 2 */}
          {(() => {
            const p2 = getItem('CV02', 'Chromatic Layer Coupling', 'Seamlessly orchestrate complex multi-layer chromatic families (Base, Inset, Shadow, Engraved, Outline). Linked family IDs lock vertical bounding metrics and alternate glyph selections together in real time.');
            return (
              <InContextCardWrapper item={p2} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="border border-vintage-ink bg-vintage-paper/40 p-8 flex flex-col justify-between hover:bg-vintage-paper/90 transition-colors h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-display opacity-40">II.</span>
                      <Layers size={22} className="text-vintage-accent" />
                    </div>
                    <h3 className="text-xl font-display mb-3 tracking-wide">{p2.title}</h3>
                    <div className="text-sm leading-relaxed text-vintage-ink/75" dangerouslySetInnerHTML={{ __html: p2.content }} />
                  </div>
                  <div className="pt-6 mt-6 border-t border-vintage-ink/20 text-[10px] uppercase tracking-[0.2em] font-bold text-vintage-accent">
                    UNIFIED METRIC ALIGNMENT
                  </div>
                </div>
              </InContextCardWrapper>
            );
          })()}

          {/* Pillar 3 */}
          {(() => {
            const p3 = getItem('CV03', 'Curved Path & Engraving Engine', 'Attach lettering to arbitrary curved vectors or hand-drawn shapes with the built-in Pen tool. Drag text along the perimeter track with CorelDraw-style precision and live baseline control.');
            return (
              <InContextCardWrapper item={p3} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="border border-vintage-ink bg-vintage-paper/40 p-8 flex flex-col justify-between hover:bg-vintage-paper/90 transition-colors h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-display opacity-40">III.</span>
                      <PenTool size={22} className="text-vintage-accent" />
                    </div>
                    <h3 className="text-xl font-display mb-3 tracking-wide">{p3.title}</h3>
                    <div className="text-sm leading-relaxed text-vintage-ink/75" dangerouslySetInnerHTML={{ __html: p3.content }} />
                  </div>
                  <div className="pt-6 mt-6 border-t border-vintage-ink/20 text-[10px] uppercase tracking-[0.2em] font-bold text-vintage-accent">
                    PERIMETER TRACK SLIDING
                  </div>
                </div>
              </InContextCardWrapper>
            );
          })()}

          {/* Pillar 4 */}
          {(() => {
            const p4 = getItem('CV04', 'Ornate Glyphs & Swash Alternates', 'Click any glyph directly on the artboard to preview and apply historical swashes, stylistic alternates, and decorative titling capitals with zero guesswork.');
            return (
              <InContextCardWrapper item={p4} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="border border-vintage-ink bg-vintage-paper/40 p-8 flex flex-col justify-between hover:bg-vintage-paper/90 transition-colors h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-display opacity-40">IV.</span>
                      <Sparkles size={22} className="text-vintage-accent" />
                    </div>
                    <h3 className="text-xl font-display mb-3 tracking-wide">{p4.title}</h3>
                    <div className="text-sm leading-relaxed text-vintage-ink/75" dangerouslySetInnerHTML={{ __html: p4.content }} />
                  </div>
                  <div className="pt-6 mt-6 border-t border-vintage-ink/20 text-[10px] uppercase tracking-[0.2em] font-bold text-vintage-accent">
                    INSTANT OPENTYPE DISCOVERY
                  </div>
                </div>
              </InContextCardWrapper>
            );
          })()}

          {/* Pillar 5 */}
          {(() => {
            const p5 = getItem('CV05', 'iPad & Tablet Multi-Touch', '<p class="mb-2">Designed for studio tablets. Fluid two-finger pinch zoom, natural one-finger canvas panning, and tap-and-hold marquee multi-selection for fast object manipulation.</p><p class="text-xs leading-relaxed font-medium bg-vintage-ink/5 p-2 border-l border-vintage-accent">Desktop Recommended: While touch devices are supported, working on a desktop workstation with a larger screen and mouse precision provides the most optimal lettering experience.</p>');
            return (
              <InContextCardWrapper item={p5} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="border border-vintage-ink bg-vintage-paper/40 p-8 flex flex-col justify-between hover:bg-vintage-paper/90 transition-colors h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-display opacity-40">V.</span>
                      <Smartphone size={22} className="text-vintage-accent" />
                    </div>
                    <h3 className="text-xl font-display mb-3 tracking-wide">{p5.title}</h3>
                    <div className="text-sm leading-relaxed text-vintage-ink/75" dangerouslySetInnerHTML={{ __html: p5.content }} />
                  </div>
                  <div className="pt-6 mt-6 border-t border-vintage-ink/20 text-[10px] uppercase tracking-[0.2em] font-bold text-vintage-accent">
                    DESKTOP OPTIMAL • TOUCH READY
                  </div>
                </div>
              </InContextCardWrapper>
            );
          })()}

          {/* Pillar 6 */}
          {(() => {
            const p6 = getItem('CV06', 'Vector Outlines for Print & Foil', 'Export warped typography as expanded, production-ready SVG path outlines. Compatible with Adobe Illustrator, CorelDraw, laser engravers, and letterpress die-cutters.');
            return (
              <InContextCardWrapper item={p6} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="border border-vintage-ink bg-vintage-paper/40 p-8 flex flex-col justify-between hover:bg-vintage-paper/90 transition-colors h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-display opacity-40">VI.</span>
                      <Download size={22} className="text-vintage-accent" />
                    </div>
                    <h3 className="text-xl font-display mb-3 tracking-wide">{p6.title}</h3>
                    <div className="text-sm leading-relaxed text-vintage-ink/75" dangerouslySetInnerHTML={{ __html: p6.content }} />
                  </div>
                  <div className="pt-6 mt-6 border-t border-vintage-ink/20 text-[10px] uppercase tracking-[0.2em] font-bold text-vintage-accent">
                    CLEAN PRODUCTION VECTOR PATHS
                  </div>
                </div>
              </InContextCardWrapper>
            );
          })()}
        </div>
      </section>

      {/* 4. LICENSING & STUDIO POLICY */}
      <section className="mb-20 px-4 max-w-6xl mx-auto">
        {/* Card 7 (Policy) */}
        {(() => {
          const p7 = getItem('CV07', 'Complimentary Lettering & Crucial Pro Workflows', '<p class="mb-3">FontCanvas Studio is free for designers and typographers to prototype custom lettering, test chromatic layer stacking, and compose layouts directly in your browser.</p><p>To unlock crucial production capabilities—including clean unwatermarked vector SVG & high-res PNG exports, chromatic layer stacking, and full access to all accompanying ornament fonts and SVG assets—simply purchase at least one paid font from our collection. Please note that FontCanvas specifically unlocks and loads your purchased fonts.</p>');
          return (
            <InContextCardWrapper item={p7} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
              <div className="border border-vintage-ink bg-vintage-paper/90 p-8 md:p-12 relative mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={20} className="text-vintage-accent" />
                      <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold text-vintage-accent">
                        Studio Policy & Licensing
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-display mb-4">
                      {p7.title}
                    </h2>
                    <div className="text-sm md:text-base leading-relaxed text-vintage-ink/80 space-y-3" dangerouslySetInnerHTML={{ __html: p7.content }} />
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                    <a
                      href={CANVAS_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleLaunchCanvas}
                      className="canvas-editor-btn py-3.5 px-6 text-xs font-bold uppercase tracking-[0.2em] text-center flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Launch FontCanvas Editor</span>
                      <ArrowUpRight size={16} />
                    </a>
                    <Link
                      to="/fonts"
                      className="canvas-buynow-btn py-3.5 px-6 text-xs font-bold uppercase tracking-[0.2em] text-center cursor-pointer"
                    >
                      Buy Now
                    </Link>
                  </div>
                </div>
              </div>
            </InContextCardWrapper>
          );
        })()}

        {/* Supplementary Notices: Direct Store Exclusive Facility & Continuous Development */}
        <div className="space-y-4">
          {/* Card 8: Direct Store Exclusive Facility */}
          {(() => {
            const p8 = getItem('CV08', 'Direct Store Exclusive Facility', '<p><strong>Please note:</strong> FontCanvas VIP access, full font family unlocking, and creator perks are exclusively reserved for orders placed directly on <strong>bombastype.com</strong>. We sincerely apologize, but purchases made through third-party marketplaces (such as Creative Market, Envato, MyFonts, etc.) are not eligible for this facility, as it is an exclusive benefit created solely for our direct website patrons.</p>');
            return (
              <InContextCardWrapper item={p8} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="p-5 border border-vintage-ink/20 bg-vintage-paper/50 text-xs leading-relaxed text-vintage-ink/80">
                  <div className="font-bold uppercase tracking-wider text-vintage-accent text-[11px] mb-1.5 flex items-center gap-1.5">
                    <span>{p8.title}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: p8.content }} />
                </div>
              </InContextCardWrapper>
            );
          })()}

          {/* Card 9: Continuous Development & In-Browser Simplicity */}
          {(() => {
            const p9 = getItem('CV09', 'Continuous Development & In-Browser Simplicity', '<p><strong>* Continuous Development & In-Browser Simplicity:</strong> We actively maintain and update FontCanvas regularly to resolve critical bugs and introduce refined tools. FontCanvas is intentionally engineered to stay clean, fast, and focused on essential typographic design workflows—allowing our buyers to compose, customize, and export production-ready vector artwork directly in-browser without requiring complex 3rd-party graphic software.</p>');
            return (
              <InContextCardWrapper item={p9} category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent}>
                <div className="p-4 border-l-2 border-vintage-accent bg-vintage-paper/30 text-xs leading-relaxed text-vintage-ink/75 italic">
                  <div dangerouslySetInnerHTML={{ __html: p9.content }} />
                </div>
              </InContextCardWrapper>
            );
          })()}
        </div>

        <InContextAddSectionButton category="canvas" pagePath="/canvas" onRefresh={fetchCanvasContent} />
      </section>

      {/* 5. BOTTOM INVITATION BANNER */}
      <section className="px-4 max-w-6xl mx-auto">
        <div className="border border-vintage-ink bg-vintage-ink text-vintage-paper p-10 md:p-20 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold text-vintage-accent block mb-4">
              Step Into the Studio
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-display mb-8 leading-tight">
              Begin Composing in FontCanvas Studio.
            </h2>
            <a
              href={CANVAS_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLaunchCanvas}
              style={{ backgroundColor: '#fdf6e3', color: '#2c241a' }}
              className="inline-flex items-center gap-3 bg-[#fdf6e3] !text-[#2c241a] hover:!bg-vintage-accent hover:!text-white transition-all px-9 py-4 font-bold text-xs uppercase tracking-[0.2em] shadow-lg cursor-pointer"
            >
              <span style={{ color: '#2c241a' }} className="font-bold !text-[#2c241a]">Launch FontCanvas Studio</span>
              <ArrowUpRight size={18} style={{ color: '#2c241a' }} className="!text-[#2c241a]" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CanvasLanding;
