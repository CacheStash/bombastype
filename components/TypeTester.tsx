/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Grid, Keyboard, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { FontConfig } from '../types';
import opentype from 'opentype.js';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeTesterProps {
  config: FontConfig & { 
    metadata?: { 
      primary_font_index?: number 
    } 
  };
  defaultText?: string;
  isEven?: boolean;
}

interface AlternateGlyph {
  char: string;
  glyphIndex: number;
  featureTag: string;
}

interface CharToken {
  char: string;
  feature?: string;
}

const TypeTester: React.FC<TypeTesterProps> = ({ 
  config, 
  defaultText = "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.",
}) => {
  const initialTokens = useMemo(() => {
    const raw = config.randomText || defaultText;
    return raw.split('').map(c => ({ char: c }));
  }, [config.randomText, defaultText]);

  const [tokens, setTokens] = useState<CharToken[]>(initialTokens);
  const [fontSize, setFontSize] = useState(64);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [viewMode, setViewMode] = useState<'type' | 'glyphs'>('type');
  
  const [detectedGlyphs, setDetectedGlyphs] = useState<any[]>([]); 
  const [filteredGlyphs, setFilteredGlyphs] = useState<any[]>([]); 
  const [isLoadingGlyphs, setIsLoadingGlyphs] = useState(false);
  const [detectedAxes, setDetectedAxes] = useState<any[]>([]);
  const [axesValues, setAxesValues] = useState<Record<string, number>>({});
  
  const [activeStyleIndex, setActiveStyleIndex] = useState(config.metadata?.primary_font_index || 0);
  const [detectedStyleNames, setDetectedStyleNames] = useState<Record<number, string>>({});

  const [activeFeatures, setActiveFeatures] = useState<Record<string, boolean>>({});
  const [dynamicFeatures, setDynamicFeatures] = useState<{ tag: string; name: string }[]>([]);
  
  const [lineHeight, setLineHeight] = useState(1.1);
  const [letterSpacing, setLetterSpacing] = useState(0);
  
  // PAGINATION: 10 Columns x 12 Rows = 120 Glyphs per Page
  const [currentPage, setCurrentPage] = useState(1);
  const GLYPHS_PER_PAGE = 120;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const PRESET_SIZES = [12, 14, 16, 18, 20, 24, 32, 36, 48, 64, 72, 96, 120, 144, 200];

  // Alternates State
  const [loadedFontObj, setLoadedFontObj] = useState<opentype.Font | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [alternateGlyphs, setAlternateGlyphs] = useState<AlternateGlyph[]>([]);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const ALLOWED_TAGS = new Set([
    'liga', 'dlig', 'calt', 'aalt', 'salt',
    ...Array.from({ length: 20 }, (_, i) => `ss${String(i + 1).padStart(2, '0')}`) 
  ]);

  useEffect(() => {
    const files = Array.isArray(config.font_files) ? config.font_files : (config.file_url ? [config.file_url] : []);
    const configAny = config as any;
    const version = new Date(configAny.updated_at || configAny.created_at || Date.now()).getTime();

    files.forEach((file, index) => {
      if (!file) return;
      const url = file.startsWith('http') || file.startsWith('/') ? file : `/api/fonts/${file}?v=${version}`;
      const fontNameIdentifier = `${config.name}-${index}`;

      // Daftarkan font ke CSS Engine browser
      try {
        const fontFace = new FontFace(fontNameIdentifier, `url("${url}")`);
        fontFace.load().then((loadedFace) => {
          document.fonts.add(loadedFace);
        }).catch((err) => {
          console.error(`Failed to register FontFace ${fontNameIdentifier}:`, err);
        });
      } catch (e) {
        console.error("FontFace API error:", e);
      }

      // Load data OpenType untuk metadata nama & glyph
      opentype.load(url, (err, font) => {
        if (!err && font) {
          const names = font.names as any;
          const isVariable = font.tables.fvar?.axes?.length > 0;
          const detectedName = names.preferredSubfamily?.en || names.fontSubfamily?.en;
          setDetectedStyleNames(prev => ({ ...prev, [index]: isVariable ? "Variable" : detectedName }));
        }
      });
    });
  }, [config.font_files, config.name, config.file_url]);

  useEffect(() => {
    let targetFile = '';
    const files = Array.isArray(config.font_files) ? config.font_files : (config.file_url ? [config.file_url] : []);
    if (!files[activeStyleIndex]) return;
    const f = files[activeStyleIndex];
    const configAny = config as any;
    const version = new Date(configAny.updated_at || configAny.created_at || Date.now()).getTime();
    targetFile = f.startsWith('http') || f.startsWith('/') ? f : `/api/fonts/${f}?v=${version}`;

    setIsLoadingGlyphs(true);
    opentype.load(targetFile, (err, font) => {
      setIsLoadingGlyphs(false);
      if (err || !font) return;
      
      setLoadedFontObj(font);
      const glyphs = [];
      for (let i = 0; i < font.glyphs.length && i < 2000; i++) {
        const glyph = font.glyphs.get(i);
        if (glyph.unicode) glyphs.push({ char: String.fromCharCode(glyph.unicode), index: i });
      }
      setDetectedGlyphs(glyphs);
      setCurrentPage(1); // Reset page on style switch
      
      if (font.tables.fvar?.axes?.length > 0) {
        const autoAxes = font.tables.fvar.axes.map((axis: any) => ({
          tag: axis.tag, name: axis.name?.en || axis.tag, min: axis.minValue, max: axis.maxValue, default: axis.defaultValue
        }));
        setDetectedAxes(autoAxes);
        const vals: Record<string, number> = {};
        autoAxes.forEach((a: any) => vals[a.tag] = a.default);
        setAxesValues(prev => ({ ...prev, ...vals }));
      } else { 
        setDetectedAxes([]); 
      }

      const foundTags = new Set<string>();
      if (font.tables.gsub?.features) {
        font.tables.gsub.features.forEach((feat: any) => { 
          if (feat.tag && ALLOWED_TAGS.has(feat.tag)) foundTags.add(feat.tag); 
        });
      }
      setDynamicFeatures(Array.from(foundTags).sort().map(tag => ({ tag, name: tag.startsWith('ss') ? `Set ${tag.slice(2)}` : tag.toUpperCase() })));
      setActiveFeatures({});
      setPopoverPos(null);
      setSelectedTokenIndex(null);
    });
  }, [config, activeStyleIndex]);

  useEffect(() => { 
    setFilteredGlyphs(detectedGlyphs); 
  }, [detectedGlyphs]);

  // Handler Seleksi Teks untuk Alternate Glyph Popover (Photoshop/Illustrator Style)
  const handleEditorSelect = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setPopoverPos(null);
      setSelectedTokenIndex(null);
      return;
    }

    const anchorNode = sel.anchorNode;
    let targetSpan = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
    
    // Cari elemen span token terdekat
    while (targetSpan && targetSpan !== editorRef.current && !targetSpan.hasAttribute('data-token-idx')) {
      targetSpan = targetSpan.parentElement;
    }

    if (!targetSpan || !targetSpan.hasAttribute('data-token-idx') || !loadedFontObj) {
      setPopoverPos(null);
      setSelectedTokenIndex(null);
      return;
    }

    const tokenIdx = parseInt(targetSpan.getAttribute('data-token-idx') || '-1', 10);
    if (tokenIdx < 0 || tokenIdx >= tokens.length) {
      setPopoverPos(null);
      setSelectedTokenIndex(null);
      return;
    }

    const targetChar = tokens[tokenIdx].char;
    const glyphIndex = loadedFontObj.charToGlyphIndex(targetChar);

    if (!glyphIndex) {
      setPopoverPos(null);
      return;
    }

    const alternates: AlternateGlyph[] = [];
    const gsub = loadedFontObj.tables.gsub;

    if (gsub && gsub.features && gsub.lookups) {
      const altFeatureTags = ['aalt', 'salt', 'swsh', 'titl', 'calt', ...Array.from({ length: 20 }, (_, i) => `ss${String(i + 1).padStart(2, '0')}`)];
      
      gsub.features.forEach((featureRecord: any) => {
        if (!altFeatureTags.includes(featureRecord.tag)) return;
        
        featureRecord.feature.lookupListIndexes.forEach((lookupIndex: number) => {
          const lookup = gsub.lookups[lookupIndex];
          if (!lookup || !lookup.subtables) return;

          lookup.subtables.forEach((subtable: any) => {
            // Lookup Type 1: Single Substitution
            if (lookup.lookupType === 1) {
              if (subtable.coverage && subtable.coverage.glyphs) {
                const covIdx = subtable.coverage.glyphs.indexOf(glyphIndex);
                if (covIdx !== -1) {
                  const targetGlyphIdx = Array.isArray(subtable.substitute) 
                    ? subtable.substitute[covIdx] 
                    : (glyphIndex + subtable.deltaGlyphId) % 65536;
                  
                  if (!alternates.some(a => a.featureTag === featureRecord.tag)) {
                    alternates.push({ char: targetChar, glyphIndex: targetGlyphIdx, featureTag: featureRecord.tag });
                  }
                }
              }
            } 
            // Lookup Type 3: Alternate Substitution
            else if (lookup.lookupType === 3) {
              if (subtable.coverage && subtable.coverage.glyphs) {
                const covIdx = subtable.coverage.glyphs.indexOf(glyphIndex);
                if (covIdx !== -1 && subtable.alternateSet && subtable.alternateSet[covIdx]) {
                  subtable.alternateSet[covIdx].forEach((altIdx: number) => {
                    if (!alternates.some(a => a.featureTag === featureRecord.tag)) {
                      alternates.push({ char: targetChar, glyphIndex: altIdx, featureTag: featureRecord.tag });
                    }
                  });
                }
              }
            }
          });
        });
      });
    }

    if (alternates.length > 0) {
      setSelectedTokenIndex(tokenIdx);
      setPopoverPos({ x: 0, y: 0 });
      setAlternateGlyphs(alternates);
    } else {
      setPopoverPos(null);
      setSelectedTokenIndex(null);
    }
  };

  const applyAlternate = (alt: AlternateGlyph) => {
    if (selectedTokenIndex === null) return;
    setTokens(prev => {
      const next = [...prev];
      const currentFeat = next[selectedTokenIndex].feature;
      next[selectedTokenIndex] = {
        ...next[selectedTokenIndex],
        feature: currentFeat === alt.featureTag ? undefined : (alt.featureTag || undefined)
      };
      return next;
    });
    setPopoverPos(null);
    setSelectedTokenIndex(null);
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const rawText = e.currentTarget.innerText || '';
    setTokens(rawText.split('').map(c => ({ char: c })));
    setPopoverPos(null);
    setSelectedTokenIndex(null);
  };

  const totalPages = Math.max(1, Math.ceil(filteredGlyphs.length / GLYPHS_PER_PAGE));
  const paginatedGlyphs = filteredGlyphs.slice((currentPage - 1) * GLYPHS_PER_PAGE, currentPage * GLYPHS_PER_PAGE);

  const hasAxes = detectedAxes.length > 0;
  const hasFeatures = dynamicFeatures.length > 0;
  const commonFontStyle = { 
    fontFamily: `"${config.name}-${activeStyleIndex}"`, 
    fontVariationSettings: Object.entries(axesValues).map(([t, v]) => `"${t}" ${v}`).join(', '),
    fontFeatureSettings: Object.entries(activeFeatures).map(([t, on]) => `"${t}" ${on ? 'on' : 'off'}`).join(', ') || 'normal'
  };

  return (
    <div className="w-full bg-transparent text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper">
      <div className="overflow-visible relative z-40 bg-transparent">
        
        {/* TOP TOOLBAR */}
        <div className="flex flex-col lg:flex-row items-stretch border-b border-vintage-ink/20 bg-vintage-paper/50 backdrop-blur-md relative z-50">
          <div className="hidden lg:flex items-center px-6 py-4 border-r border-vintage-ink/20">
            <button onClick={() => setViewMode(viewMode === 'type' ? 'glyphs' : 'type')} className="vintage-btn py-1.5 px-4 text-[9px] flex items-center gap-2 group/btn">
              {viewMode === 'type' ? <Grid size={14} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" /> : <Keyboard size={14} className="transition-transform duration-500 group-hover/btn:rotate-90 opacity-40 group-hover/btn:opacity-100" />}
              <span className="font-bold tracking-[0.2em]">{viewMode === 'type' ? 'GLYPH MAP' : 'TYPE TESTER'}</span>
            </button>
          </div>

          {/* FONT STYLE SELECTOR */}
          <div className="flex-1 flex items-center px-6 py-4 border-b lg:border-b-0 lg:border-r border-vintage-ink/20 relative group">
            <div className="w-full relative">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold text-vintage-accent uppercase tracking-[0.3em]">Font Style</span>
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between text-[13px] font-bold uppercase tracking-tighter pt-1.5 border-b border-transparent hover:border-vintage-ink/30 transition-colors relative z-10">
                <span className="truncate">{detectedStyleNames[activeStyleIndex] || `STYLE ${String(activeStyleIndex + 1).padStart(2, '0')}`}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-60" onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); }} />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 top-full mt-1 w-full bg-vintage-paper border border-vintage-ink/20 z-70 shadow-2xl overflow-hidden">
                      {Array.isArray(config.font_files) && config.font_files.map((_, i) => (
                        <button key={i} onClick={() => { setActiveStyleIndex(i); setIsDropdownOpen(false); }} className={`w-full text-left px-6 py-4 text-[10px] font-bold uppercase border-b border-vintage-ink/5 last:border-0 transition-colors ${activeStyleIndex === i ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}>{detectedStyleNames[i] || `STYLE ${String(i + 1).padStart(2, '0')}`}</button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SIZE (TYPE TESTER) OR PAGINATION (GLYPH MAP) */}
          <div className="flex items-center px-6 py-4 border-b lg:border-b-0 lg:border-r border-vintage-ink/20 min-w-44 relative">
            <div className="w-full relative">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold text-vintage-accent uppercase tracking-[0.3em]">
                {viewMode === 'type' ? 'Size' : 'Pages'}
              </span>
              {viewMode === 'type' ? (
                <>
                  <button onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)} className="w-full flex items-center justify-between text-[13px] font-bold pt-1.5 border-b border-transparent hover:border-vintage-ink/30 transition-colors relative z-10">
                    <span>{fontSize} PX</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isSizeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isSizeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-60" onClick={() => setIsSizeDropdownOpen(false)} />
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 top-full mt-1 w-full bg-vintage-paper border border-vintage-ink/20 z-70 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                          {PRESET_SIZES.map((s) => (
                            <button key={s} onClick={() => { setFontSize(s); setIsSizeDropdownOpen(false); }} className={`w-full text-left px-6 py-3 text-[10px] font-bold transition-colors ${fontSize === s ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}>{s} PX</button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 border border-vintage-ink/20 disabled:opacity-20 hover:bg-vintage-ink/5 transition-all text-vintage-ink"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] font-bold tracking-widest text-vintage-ink whitespace-nowrap">
                    {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 border border-vintage-ink/20 disabled:opacity-20 hover:bg-vintage-ink/5 transition-all text-vintage-ink"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ALIGNMENT BUTTONS */}
          <div className="flex items-center px-6 py-4 gap-4">
             {viewMode === 'type' && (
                <div className="flex border border-vintage-ink/20 rounded-sm overflow-hidden">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button 
                      key={a} 
                      onClick={() => setAlign(a)} 
                      className={`p-2 transition-all duration-300 group ${
                        align === a 
                        ? 'bg-vintage-ink! text-vintage-background! border-vintage-ink' 
                        : 'bg-transparent text-vintage-ink/40 hover:text-vintage-ink'
                      }`}
                    >
                      {a === 'left' ? <AlignLeft size={14} className="transition-transform duration-500 group-hover:rotate-90" /> : a === 'center' ? <AlignCenter size={14} className="transition-transform duration-500 group-hover:rotate-90" /> : <AlignRight size={14} className="transition-transform duration-500 group-hover:rotate-90" />}
                    </button>
                  ))}
                </div>
             )}
          </div>
        </div>

        {/* MAIN DISPLAY AREA */}
        <div className="min-h-100 relative bg-transparent">
          <AnimatePresence mode="wait">
            {viewMode === 'type' ? (
              <div className="relative w-full min-h-100">
                <div 
                  key="type" 
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onSelect={handleEditorSelect}
                  onKeyUp={handleEditorSelect}
                  onMouseUp={handleEditorSelect}
                  className="w-full min-h-100 bg-transparent outline-none p-10 md:p-16 lg:p-20 whitespace-pre-wrap break-words cursor-text select-text" 
                  style={{ ...commonFontStyle, fontSize: `${fontSize}px`, textAlign: align, lineHeight: lineHeight, letterSpacing: `${letterSpacing}em` }} 
                  spellCheck={false} 
                >
                  {tokens.map((tok, i) => (
                    <span 
                      key={i} 
                      data-token-idx={i}
                      style={{ 
                        fontFeatureSettings: tok.feature 
                          ? `"${tok.feature}" on, ${commonFontStyle.fontFeatureSettings}` 
                          : commonFontStyle.fontFeatureSettings 
                      }}
                      className={tok.feature ? "text-vintage-accent underline decoration-vintage-accent/40 decoration-1 underline-offset-4" : ""}
                    >
                      {tok.char}
                    </span>
                  ))}
                </div>

                {/* ADOBE / PHOTOSHOP STYLE ALTERNATE POPUP */}
                <AnimatePresence>
                  {popoverPos && alternateGlyphs.length > 0 && selectedTokenIndex !== null && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute z-60 top-4 left-6 md:left-12 bg-vintage-paper border border-vintage-ink shadow-2xl p-2.5 flex items-center gap-3"
                    >
                      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-vintage-accent border-r border-vintage-ink/10 pr-2">
                        Alternates
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm">
                        {/* Pilihan Default / Reset */}
                        <button
                          type="button"
                          onClick={() => applyAlternate({ char: tokens[selectedTokenIndex].char, glyphIndex: 0, featureTag: '' })}
                          className={`h-11 min-w-11 px-2 flex flex-col items-center justify-center border transition-all group shrink-0 ${
                            !tokens[selectedTokenIndex].feature 
                              ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                              : 'border-vintage-ink/20 hover:bg-vintage-ink hover:text-vintage-paper'
                          }`}
                          title="Default Style"
                        >
                          <span style={{ ...commonFontStyle, fontSize: '20px', fontFeatureSettings: 'normal' }} className="leading-none">
                            {tokens[selectedTokenIndex].char}
                          </span>
                          <span className="text-[7px] opacity-40 uppercase font-sans group-hover:opacity-100 mt-0.5">DEFAULT</span>
                        </button>

                        {/* Pilihan Alternate per Feature */}
                        {alternateGlyphs.map((alt, idx) => {
                          const isActive = tokens[selectedTokenIndex].feature === alt.featureTag;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyAlternate(alt)}
                              className={`h-11 min-w-11 px-2 flex flex-col items-center justify-center border transition-all group shrink-0 ${
                                isActive 
                                  ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                                  : 'border-vintage-ink/20 hover:bg-vintage-ink hover:text-vintage-paper'
                              }`}
                              title={`Feature: ${alt.featureTag.toUpperCase()}`}
                            >
                              <span 
                                style={{ 
                                  ...commonFontStyle, 
                                  fontSize: '20px', 
                                  fontFeatureSettings: `"${alt.featureTag}" on` 
                                }} 
                                className="leading-none"
                              >
                                {alt.char}
                              </span>
                              <span className="text-[7px] opacity-40 uppercase font-sans group-hover:opacity-100 mt-0.5">
                                {alt.featureTag}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                key={`glyphs-page-${currentPage}`} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="w-full grid content-start" 
                style={{ gridTemplateColumns: `repeat(10, minmax(0, 1fr))` }}
              >
                {paginatedGlyphs.map((item, idx) => {
                  const isRightEdge = (idx + 1) % 10 === 0;
                  return (
                    <div 
                      key={idx} 
                      className={`aspect-square flex items-center justify-center border-b ${isRightEdge ? '' : 'border-r'} border-vintage-ink/10 hover:bg-vintage-ink hover:text-vintage-paper transition-all cursor-default`}
                    >
                      <span style={{ ...commonFontStyle, fontSize: '32px' }}>{item.char}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM CONTROLS (LEADING, TRACKING, AXES, OT FEATURES) */}
        <div className={`bg-vintage-paper relative z-30 ${viewMode === 'type' ? 'border-t border-vintage-ink/20' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-vintage-ink/10">
            <div className="px-8 py-6 flex items-center gap-6 border-b md:border-b-0 md:border-r border-vintage-ink/10">
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-vintage-accent w-20 shrink-0">Leading</label>
              <input type="range" min="0.8" max="2.0" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(parseFloat(e.target.value))} className="grow accent-vintage-ink h-1 bg-vintage-ink/10 rounded-full appearance-none cursor-pointer" />
              <span className="text-[10px] font-bold w-10 text-right">{lineHeight.toFixed(1)}</span>
            </div>
            <div className="px-8 py-6 flex items-center gap-6">
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-vintage-accent w-20 shrink-0">Tracking</label>
              <input type="range" min="-0.1" max="0.5" step="0.01" value={letterSpacing} onChange={(e) => setLetterSpacing(parseFloat(e.target.value))} className="grow accent-vintage-ink h-1 bg-vintage-ink/10 rounded-full appearance-none cursor-pointer" />
              <span className="text-[11px] font-bold w-10 text-right">{letterSpacing.toFixed(2)}</span>
            </div>
          </div>
          {(hasAxes || hasFeatures) && (
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {hasAxes && (
                <div className="lg:col-span-8 p-8 border-b lg:border-b-0 lg:border-r border-vintage-ink/10">
                  <h4 className="text-[9px] font-bold uppercase tracking-[0.4em] text-vintage-accent mb-8 border-b border-vintage-ink/5 pb-2">Variation Axes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {detectedAxes.map((axis: any) => (
                      <div key={axis.tag} className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-[10px] font-bold uppercase tracking-widest">{axis.name}</label><span className="text-[10px] font-bold opacity-40">{Math.round(axesValues[axis.tag] ?? axis.default)}</span></div>
                        <input type="range" min={axis.min} max={axis.max} step={1} value={axesValues[axis.tag] ?? axis.default} onChange={(e) => setAxesValues(p => ({...p, [axis.tag]: parseFloat(e.target.value)}))} className="w-full accent-vintage-ink h-1 bg-vintage-ink/10 rounded-full appearance-none cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hasFeatures && (
                <div className={`${hasAxes ? 'lg:col-span-4' : 'lg:col-span-12'} p-8`}>
                  <h4 className="text-[9px] font-bold uppercase tracking-[0.4em] text-vintage-accent mb-8 border-b border-vintage-ink/5 pb-2">OT Features</h4>
                  <div className="flex flex-wrap gap-2 max-h-75 overflow-y-auto custom-scrollbar pr-4">
                    {dynamicFeatures.map((feat) => (
                      <button key={feat.tag} onClick={() => setActiveFeatures(prev => ({ ...prev, [feat.tag]: !prev[feat.tag] }))} className={`px-3 py-1.5 text-[9px] font-bold uppercase border transition-all duration-300 rounded-sm ${activeFeatures[feat.tag] ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' : 'border-vintage-ink/10 text-vintage-ink/40 hover:border-vintage-ink/30 hover:text-vintage-ink'}`}>{feat.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypeTester;