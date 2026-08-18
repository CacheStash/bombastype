/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Grid, Keyboard, ChevronDown, ChevronLeft, ChevronRight, Layers, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Contrast } from 'lucide-react';
import { GripVertical, SlidersHorizontal } from 'lucide-react';
import { FontConfig } from '../types';
import opentype from 'opentype.js';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeTesterProps {
  config: FontConfig & { 
    metadata?: { 
      primary_font_index?: number;
      is_layered?: boolean;
      layer_font_indices?: number[];
    } 
  };
  defaultText?: string;
  isEven?: boolean;
}

interface FontLayerItem {
  id: string;
  fontIndex: number;
  isInverted: boolean;
  isVisible: boolean;
  color?: string; // Menyimpan kode warna HEX per layer
}

interface AlternateGlyph {
  char: string;
  glyphIndex: number;
  featureTag: string;
}

const TypeTester: React.FC<TypeTesterProps> = ({ 
  config, 
  defaultText = "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.",
}) => {
  const [text, setText] = useState(config.randomText || defaultText);
  const [charOverrides, setCharOverrides] = useState<Record<number, string>>({});
  const [glyphOverrides, setGlyphOverrides] = useState<Record<number, number>>({});
  const [fontSize, setFontSize] = useState(64);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [viewMode, setViewMode] = useState<'type' | 'glyphs'>('type');
  
  const isLayeredSupported = !!config.metadata?.is_layered && Array.isArray(config.font_files) && config.font_files.length > 1;
  const [isLayeredMode, setIsLayeredMode] = useState<boolean>(false);

  // Inisialisasi daftar layer (Daftar UI urut dari TOP layer ke BOTTOM layer)
  const [layers, setLayers] = useState<FontLayerItem[]>([
   { id: 'layer-top', fontIndex: config.metadata?.primary_font_index || 0, isInverted: false, isVisible: true, color: '#2B2621' },
    ...(Array.isArray(config.font_files) && config.font_files.length > 1
      ? [{ id: 'layer-bottom', fontIndex: (config.metadata?.primary_font_index || 0) === 0 ? 1 : 0, isInverted: false, isVisible: true, color: '#8C4A32' }]
      : [])
  ]);

  const [draggedLayerIdx, setDraggedLayerIdx] = useState<number | null>(null);
  const layerContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [detectedGlyphs, setDetectedGlyphs] = useState<any[]>([]); 
  const [filteredGlyphs, setFilteredGlyphs] = useState<any[]>([]); 
  const [isLoadingGlyphs, setIsLoadingGlyphs] = useState(false);
  const [detectedAxes, setDetectedAxes] = useState<any[]>([]);
  const [axesValues, setAxesValues] = useState<Record<string, number>>({});
  
  const [activeStyleIndex, setActiveStyleIndex] = useState(config.metadata?.primary_font_index || 0);
  const [detectedStyleNames, setDetectedStyleNames] = useState<Record<number, string>>({});

  const [activeFeatures, setActiveFeatures] = useState<Record<string, boolean>>({});
  const [dynamicFeatures, setDynamicFeatures] = useState<{ tag: string; name: string }[]>([]);
  const availableLayerIndices: number[] = React.useMemo(() => {
    if (!Array.isArray(config.font_files)) return [];
    
    // 1. Prioritaskan konfigurasi metadata dari Admin
    if (config.metadata?.layer_font_indices && config.metadata.layer_font_indices.length > 0) {
      return config.metadata.layer_font_indices;
    }

    // 2. Fallback jika metadata belum diset: Tampilkan semua file style
    return config.font_files.map((_, idx) => idx);
  }, [config.font_files, config.metadata?.layer_font_indices]);

  // Reset scroll position saat user berpindah antara Single Mode & Layered Mode
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
      textareaRef.current.scrollLeft = 0;
    }
    Object.values(layerContainerRefs.current).forEach((el) => {
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    });
  }, [isLayeredMode]);

  useLayoutEffect(() => {
    if (!textareaRef.current) return;
    const currentTop = textareaRef.current.scrollTop;
    const currentLeft = textareaRef.current.scrollLeft;

    Object.values(layerContainerRefs.current).forEach((el) => {
      if (el) {
        el.scrollTop = currentTop;
        el.scrollLeft = currentLeft;
      }
    });
  }, [layers]);

  const [lineHeight, setLineHeight] = useState(1.1);
  const [letterSpacing, setLetterSpacing] = useState(0);
  
  // PAGINATION: 10 Columns x 12 Rows = 120 Glyphs per Page
  const [currentPage, setCurrentPage] = useState(1);
  const GLYPHS_PER_PAGE = 120;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [isAddLayerOpen, setIsAddLayerOpen] = useState(false);
  const PRESET_SIZES = [12, 14, 16, 18, 20, 24, 32, 36, 48, 64, 72, 96, 120, 144, 200];

// Alternates State & Cache semua font object untuk render layered SVG
  const [loadedFontObj, setLoadedFontObj] = useState<opentype.Font | null>(null);
  const [loadedFontsMap, setLoadedFontsMap] = useState<Record<number, opentype.Font>>({});
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [alternateGlyphs, setAlternateGlyphs] = useState<AlternateGlyph[]>([]);
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
const testerId = useRef(`tt-${Math.random().toString(36).substring(2, 9)}`).current;
const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [caretCoords, setCaretCoords] = useState<{ left: number; top: number; height: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const isDraggingSelection = useRef(false);
  const dragAnchorIdx = useRef<number | null>(null);

  const updateCaretPosition = (pos: number | null) => {
    if (pos === null || !textareaRef.current) {
      setCaretCoords(null);
      return;
    }
    const container = textareaRef.current;
    const containerRect = container.getBoundingClientRect();

    if (pos >= text.length && text.length > 0) {
      const lastSpan = document.getElementById(`char-span-${testerId}-${text.length - 1}`);
      if (lastSpan) {
        const r = lastSpan.getBoundingClientRect();
        setCaretCoords({
          left: r.right - containerRect.left + container.scrollLeft,
          top: r.top - containerRect.top + container.scrollTop,
          height: r.height || fontSize * lineHeight
        });
        return;
      }
    }

    const currentSpan = document.getElementById(`char-span-${testerId}-${pos}`);
    if (currentSpan) {
      const r = currentSpan.getBoundingClientRect();
      setCaretCoords({
        left: r.left - containerRect.left + container.scrollLeft,
        top: r.top - containerRect.top + container.scrollTop,
        height: r.height || fontSize * lineHeight
      });
    } else {
      setCaretCoords({
        left: 24,
        top: 16,
        height: fontSize * lineHeight
      });
    }
  };

  const ALLOWED_TAGS = new Set([
    'liga', 'dlig', 'calt', 'salt', 'swsh', 'titl',
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

      opentype.load(url, (err, font) => {
        if (!err && font) {
          const names = font.names as any;
          const isVariable = font.tables.fvar?.axes?.length > 0;
          const detectedName = names.preferredSubfamily?.en || names.fontSubfamily?.en;
          setDetectedStyleNames(prev => ({ ...prev, [index]: isVariable ? "Variable" : detectedName }));
          setLoadedFontsMap(prev => ({ ...prev, [index]: font }));
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
      for (let i = 0; i < font.glyphs.length && i < 2500; i++) {
        const glyph = font.glyphs.get(i);
        if (!glyph) continue;

        // Lewati .notdef / .null yang kosong jika tidak memiliki outline kurva
        if (glyph.name === '.notdef' && (!glyph.path || glyph.path.commands.length === 0)) continue;

        glyphs.push({ 
          index: i,
          name: glyph.name || `glyph_${i}`,
          char: glyph.unicode ? String.fromCharCode(glyph.unicode) : '',
          unicode: glyph.unicode
        });
      }
      setDetectedGlyphs(glyphs);
      setCurrentPage(1);
      
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
      setSelectedCharIndex(null);
    });
  }, [config, activeStyleIndex]);

  useEffect(() => { 
    setFilteredGlyphs(detectedGlyphs); 
  }, [detectedGlyphs]);

  const checkAlternatesForChar = (index: number) => {
    if (!loadedFontObj) return;
    const targetChar = text.charAt(index);
    if (!targetChar || targetChar === '\n' || targetChar === ' ') {
      setPopoverPos(null);
      setSelectedCharIndex(null);
      return;
    }

    let glyphIndex = loadedFontObj.charToGlyphIndex(targetChar);
    if (!glyphIndex) {
      setPopoverPos(null);
      setSelectedCharIndex(null);
      return;
    }

    const alternates: AlternateGlyph[] = [];
    const gsub = loadedFontObj.tables.gsub;

    if (gsub && gsub.features && gsub.lookups) {
      const altFeatureTags = [
        'aalt', 'salt', 'swsh', 'titl', 'calt', 'dlig',
        ...Array.from({ length: 20 }, (_, i) => `ss${String(i + 1).padStart(2, '0')}`)
      ];
      
      gsub.features.forEach((featureRecord: any) => {
        if (!altFeatureTags.includes(featureRecord.tag)) return;

        featureRecord.feature.lookupListIndexes.forEach((lookupIndex: number) => {
          const lookup = gsub.lookups[lookupIndex];
          if (!lookup || !lookup.subtables) return;

          lookup.subtables.forEach((subtable: any) => {
            if (lookup.lookupType === 1) {
              if (subtable.coverage && subtable.coverage.glyphs) {
                const covIdx = subtable.coverage.glyphs.indexOf(glyphIndex);
                if (covIdx !== -1) {
                  const targetGlyphIdx = Array.isArray(subtable.substitute) 
                    ? subtable.substitute[covIdx] 
                    : (glyphIndex + subtable.deltaGlyphId) % 65536;
                  
                  const targetGlyph = loadedFontObj.glyphs.get(targetGlyphIdx);
                  const charStr = (targetGlyph && targetGlyph.unicode) 
                    ? String.fromCharCode(targetGlyph.unicode) 
                    : targetChar;

                  if (!alternates.some(a => a.glyphIndex === targetGlyphIdx)) {
                    alternates.push({ char: charStr, glyphIndex: targetGlyphIdx, featureTag: featureRecord.tag });
                  }
                }
              }
            } else if (lookup.lookupType === 3) {
              if (subtable.coverage && subtable.coverage.glyphs) {
                const covIdx = subtable.coverage.glyphs.indexOf(glyphIndex);
                if (covIdx !== -1) {
                  const altSets = subtable.alternateSets || subtable.alternateSet || [];
                  const targetSet = altSets[covIdx];

                  if (targetSet) {
                    const glyphIndices: number[] = Array.isArray(targetSet)
                      ? targetSet
                      : (targetSet.alternateGlyphs || targetSet.glyphs || targetSet.alternateSet || []);

                    glyphIndices.forEach((altIdx: number) => {
                      const targetGlyph = loadedFontObj.glyphs.get(altIdx);
                      const charStr = (targetGlyph && targetGlyph.unicode) 
                        ? String.fromCharCode(targetGlyph.unicode) 
                        : targetChar;

                      if (!alternates.some(a => a.glyphIndex === altIdx)) {
                        alternates.push({ char: charStr, glyphIndex: altIdx, featureTag: featureRecord.tag });
                      }
                    });
                  }
                }
              }
            }
          });
        });
      });
    }

    if (alternates.length > 0) {
      setSelectedCharIndex(index);
      let posX = 24;
      let posY = 16;
      const targetCharEl = document.getElementById(`char-span-${testerId}-${index}`);
      if (targetCharEl && textareaRef.current) {
        const containerRect = textareaRef.current.getBoundingClientRect();
        const charRect = targetCharEl.getBoundingClientRect();
        posX = charRect.left - containerRect.left;
        posY = charRect.top - containerRect.top;
      }

      setPopoverPos({ x: posX, y: posY });
      setAlternateGlyphs(alternates);
    } else {
      setPopoverPos(null);
      setSelectedCharIndex(null);
    }
  };

  const handleSelectionOrCursorChange = () => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    
    if (selectionStart === selectionEnd) {
      setCursorPos(selectionStart);
      setSelectionRange(null);
      updateCaretPosition(selectionStart);
      setPopoverPos(null);
      setSelectedCharIndex(null);
    } else {
      setCursorPos(null);
      setCaretCoords(null);
      setSelectionRange({ start: selectionStart, end: selectionEnd });
      if (selectionEnd - selectionStart === 1) {
        checkAlternatesForChar(selectionStart);
      } else {
        setPopoverPos(null);
        setSelectedCharIndex(null);
      }
    }
  };

  const handleSpanMouseDown = (index: number) => {
    isDraggingSelection.current = true;
    dragAnchorIdx.current = index;
    setSelectionRange({ start: index, end: index + 1 });
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(index, index + 1);
    }
    checkAlternatesForChar(index);
  };

  const handleSpanMouseEnter = (index: number) => {
    if (!isDraggingSelection.current || dragAnchorIdx.current === null) return;
    const anchor = dragAnchorIdx.current;
    const start = Math.min(anchor, index);
    const end = Math.max(anchor, index) + 1;
    setSelectionRange({ start, end });
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(start, end);
    }
    if (end - start === 1) {
      checkAlternatesForChar(start);
    } else {
      setPopoverPos(null);
      setSelectedCharIndex(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingSelection.current = false;
      dragAnchorIdx.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const applyAlternate = (alt: AlternateGlyph) => {
    if (selectedCharIndex === null) return;

    if (!alt.glyphIndex || alt.glyphIndex === 0) {
      setGlyphOverrides(prev => {
        const next = { ...prev };
        delete next[selectedCharIndex];
        return next;
      });
      setCharOverrides(prev => {
        const next = { ...prev };
        delete next[selectedCharIndex];
        return next;
      });
    } else {
      setGlyphOverrides(prev => ({
        ...prev,
        [selectedCharIndex]: alt.glyphIndex
      }));
      setCharOverrides(prev => ({
        ...prev,
        [selectedCharIndex]: alt.featureTag || 'alt'
      }));
    }

    setPopoverPos(null);
    setSelectedCharIndex(null);
  };


  const renderGlyphSvg = (glyphIdx: number, size: number = 24) => {
    if (!loadedFontObj) return null;
    const glyph = loadedFontObj.glyphs.get(glyphIdx);
    if (!glyph) return null;

    const unitsPerEm = loadedFontObj.unitsPerEm || 1000;
    const scale = (size * 0.75) / unitsPerEm;
    const baseline = size * 0.75;
    const advanceWidth = (glyph.advanceWidth || unitsPerEm * 0.6) * scale;
    const xOffset = Math.max(0, (size - advanceWidth) / 2);

    try {
      const pathData = glyph.getPath(xOffset, baseline, size * 0.75).toPathData(2);
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="fill-current pointer-events-none">
          <path d={pathData} />
        </svg>
      );
    } catch (e) {
      return null;
    }
  };


  // Helper render khusus untuk huruf inline di dalam teks textarea overlay (Akurat Baseline)
  const renderInlineGlyphSvg = (glyphIdx: number, targetSize: number, fontIdx: number) => {
    const targetFontObj = loadedFontsMap[fontIdx] || loadedFontObj;
    if (!targetFontObj) return null;

    // Ambil glyph sesuai index dari file font layer yang bersangkutan
    const glyph = targetFontObj.glyphs.get(glyphIdx);
    if (!glyph) return null;

    const unitsPerEm = targetFontObj.unitsPerEm || 1000;
    const ascender = targetFontObj.tables.os2?.sTypoAscender || targetFontObj.tables.hhea?.ascender || (unitsPerEm * 0.8);
    const descender = Math.abs(targetFontObj.tables.os2?.sTypoDescender || targetFontObj.tables.hhea?.descender || (unitsPerEm * 0.2));
    const totalHeight = ascender + descender;

    const scale = targetSize / unitsPerEm;
    const advanceWidth = (glyph.advanceWidth || unitsPerEm * 0.6) * scale;
    const svgHeight = totalHeight * scale;
    const baselineY = ascender * scale;
    const descenderOffset = descender * scale;

    try {
      const pathData = glyph.getPath(0, baselineY, targetSize).toPathData(2);
      return (
        <span 
          className="inline relative pointer-events-none select-none"
          style={{ 
            display: 'inline-block',
            width: `${advanceWidth}px`, 
            height: 0,
            lineHeight: 0,
            verticalAlign: 'baseline'
          }}
        >
          <svg 
            style={{ 
              width: `${advanceWidth}px`, 
              height: `${svgHeight}px`,
              position: 'absolute',
              top: `-${baselineY}px`,
              left: 0,
              overflow: 'visible'
            }} 
            viewBox={`0 0 ${advanceWidth} ${svgHeight}`} 
            className="fill-current pointer-events-none"
          >
            <path d={pathData} />
          </svg>
        </span>
      );
    } catch (e) {
      return null;
    }
  };

 const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    const prevText = text;
    setText(nextText);

    const diff = nextText.length - prevText.length;
    const changePos = textareaRef.current?.selectionStart ?? nextText.length;
    const insertPos = diff > 0 ? changePos - diff : changePos;

    setGlyphOverrides(prev => {
      const next: Record<number, number> = {};
      Object.entries(prev).forEach(([k, val]) => {
        const idx = Number(k);
        if (diff > 0) {
          if (idx < insertPos) {
            next[idx] = val;
          } else {
            next[idx + diff] = val;
          }
        } else if (diff < 0) {
          const deletedCount = Math.abs(diff);
          if (idx < insertPos) {
            next[idx] = val;
          } else if (idx >= insertPos + deletedCount) {
            next[idx - deletedCount] = val;
          }
        } else {
          next[idx] = val;
        }
      });
      return next;
    });

    setCharOverrides(prev => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, val]) => {
        const idx = Number(k);
        if (diff > 0) {
          if (idx < insertPos) {
            next[idx] = val;
          } else {
            next[idx + diff] = val;
          }
        } else if (diff < 0) {
          const deletedCount = Math.abs(diff);
          if (idx < insertPos) {
            next[idx] = val;
          } else if (idx >= insertPos + deletedCount) {
            next[idx - deletedCount] = val;
          }
        } else {
          next[idx] = val;
        }
      });
      return next;
    });

    setPopoverPos(null);
    setSelectedCharIndex(null);
    setSelectionRange(null);
    setTimeout(handleSelectionOrCursorChange, 0);
  };

  const toggleFeature = (tag: string) => {
    setActiveFeatures(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const addSpecificLayer = (fontIndex: number) => {
    const VINTAGE_COLOR_PALETTE = ['#2B2621', '#8C4A32', '#BFA15F', '#5A6B5C', '#6E5D4F', '#A33B20'];
    const assignedColor = VINTAGE_COLOR_PALETTE[layers.length % VINTAGE_COLOR_PALETTE.length];

    const newLayer: FontLayerItem = {
      id: `layer-${Date.now()}`,
      fontIndex: fontIndex,
      isInverted: false,
      isVisible: true,
      color: assignedColor
    };
    setLayers(prev => {
      const next = [...prev, newLayer];
      // Langsung sinkronkan ref container layer baru dengan scroll textarea saat ini
      requestAnimationFrame(() => {
        if (textareaRef.current && layerContainerRefs.current[newLayer.id]) {
          layerContainerRefs.current[newLayer.id]!.scrollTop = textareaRef.current.scrollTop;
          layerContainerRefs.current[newLayer.id]!.scrollLeft = textareaRef.current.scrollLeft;
        }
      });
      return next;
    });
    setIsAddLayerOpen(false);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
  };

  // Reorder layer di UI list (0 = Teratas / Paling Depan)
  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;
    const next = [...layers];
    const item = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = item;
    setLayers(next);
  };

  const toggleLayerInvert = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, isInverted: !l.isInverted } : l));
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l));
  };

  const changeLayerFont = (id: string, fontIndex: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, fontIndex } : l));
  };

  const changeLayerColor = (id: string, color: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, color } : l));
  };

  // Sync scroll dari textarea ke semua layer visual overlay
  const handleScrollSync = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    Object.values(layerContainerRefs.current).forEach((el) => {
      if (el) {
        el.scrollTop = scrollTop;
        el.scrollLeft = scrollLeft;
      }
    });
  };

  // Drag & Drop Handlers untuk Urutan Layer
  const handleLayerDragStart = (idx: number) => {
    setDraggedLayerIdx(idx);
  };

  const handleLayerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleLayerDrop = (targetIdx: number) => {
    if (draggedLayerIdx === null || draggedLayerIdx === targetIdx) return;
    const updated = [...layers];
    const item = updated.splice(draggedLayerIdx, 1)[0];
    updated.splice(targetIdx, 0, item);
    setLayers(updated);
    setDraggedLayerIdx(null);
  };

  // List fitur global yang aktif
  const globalActiveFeatureString = Object.entries(activeFeatures)
    .filter(([_, on]) => on)
    .map(([t]) => `"${t}" 1`)
    .join(', ') || 'normal';

  // Sinkronisasi alternate feature ke seluruh layer
  const renderTextSpans = (fontIdx: number) => {
    const styleFontFamily = `"${config.name}-${fontIdx}"`;
    return text.split('').map((char, i) => {
      const overrideGlyphIdx = glyphOverrides[i];
      const overrideFeature = charOverrides[i];

      const activeCharFeatures = overrideFeature && overrideFeature !== 'alt'
        ? (globalActiveFeatureString === 'normal' ? `"${overrideFeature}" 1` : `"${overrideFeature}" 1, ${globalActiveFeatureString}`)
        : globalActiveFeatureString;

      const isCurrentActiveLayer = fontIdx === (layers[0]?.fontIndex ?? activeStyleIndex);
      const isSelected = selectionRange 
        ? (i >= Math.min(selectionRange.start, selectionRange.end) && i < Math.max(selectionRange.start, selectionRange.end))
        : (selectedCharIndex === i);

      return (
        <span 
          key={i}
          id={isCurrentActiveLayer ? `char-span-${testerId}-${i}` : undefined}
          data-char-idx={i}
          style={{
            fontFamily: styleFontFamily,
            fontFeatureSettings: activeCharFeatures,
            WebkitFontFeatureSettings: activeCharFeatures,
            fontVariationSettings: commonFontStyle.fontVariationSettings || undefined
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleSpanMouseDown(i);
          }}
          onMouseEnter={() => handleSpanMouseEnter(i)}
          className={`cursor-text select-none transition-colors ${
            isSelected ? 'bg-vintage-ink! text-vintage-paper!' : ''
          }`}
        >
          {overrideGlyphIdx !== undefined ? (
            renderInlineGlyphSvg(overrideGlyphIdx, fontSize, fontIdx) || char
          ) : (
            char
          )}
        </span>
      );
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredGlyphs.length / GLYPHS_PER_PAGE));
  const paginatedGlyphs = filteredGlyphs.slice((currentPage - 1) * GLYPHS_PER_PAGE, currentPage * GLYPHS_PER_PAGE);

  const hasAxes = detectedAxes.length > 0;
  const hasFeatures = dynamicFeatures.length > 0;

  const activeTextareaFontIndex = isLayeredMode 
    ? (layers[0]?.fontIndex ?? config.metadata?.primary_font_index ?? 0)
    : activeStyleIndex;

  const commonFontStyle = { 
    fontFamily: `"${config.name}-${activeTextareaFontIndex}"`, 
    fontVariationSettings: Object.entries(axesValues).map(([t, v]) => `"${t}" ${v}`).join(', ')
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

          {/* COMBINED LAYERED TOGGLE & DYNAMIC FONT STYLE SECTION */}
          <div className="flex-1 flex items-stretch border-b lg:border-b-0 lg:border-r border-vintage-ink/20 relative">
            {isLayeredSupported && viewMode === 'type' ? (
              <div className="w-full flex items-stretch">
                {/* Tombol Layered Mode (Animasi melebar saat ON) */}
                <motion.div 
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className={`flex items-center ${isLayeredMode ? 'w-full px-6 py-4 bg-vintage-ink! text-vintage-paper!' : 'px-6 py-4 border-r border-vintage-ink/20'}`}
                >
                  <button 
                    type="button"
                    onClick={() => setIsLayeredMode(!isLayeredMode)}
                    className={`w-full py-1.5 px-3 text-[9px] font-bold tracking-[0.2em] uppercase flex items-center justify-between gap-3 transition-all ${
                      isLayeredMode 
                        ? 'bg-transparent text-vintage-paper' 
                        : 'border border-vintage-ink/20 text-vintage-ink/60 hover:text-vintage-ink hover:border-vintage-ink bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={14} className={isLayeredMode ? 'text-vintage-accent' : ''} />
                      <span>LAYERED MODE : <strong>{isLayeredMode ? 'ACTIVE (STACK CONTROLLER BELOW)' : 'OFF'}</strong></span>
                    </div>
                    {isLayeredMode && (
                      <span className="text-[8px] font-mono opacity-60 underline hover:opacity-100">CLICK TO DISABLE</span>
                    )}
                  </button>
                </motion.div>

                {/* Dropdown Font Style (Menyusut/Hilang saat Layered Mode ON) */}
                <AnimatePresence>
                  {!isLayeredMode && (
                    <motion.div 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: '100%' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      className="flex-1 flex items-center px-6 py-4 relative group overflow-visible z-50"
                    >
                      <div className="w-full relative">
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between text-[13px] font-bold uppercase tracking-tighter border-b border-transparent hover:border-vintage-ink/30 transition-colors relative z-10">
                          <span className="truncate">{detectedStyleNames[activeStyleIndex] || `STYLE ${String(activeStyleIndex + 1).padStart(2, '0')}`}</span>
                          <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-60" onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); }} />
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 top-full mt-2 w-full bg-vintage-paper border border-vintage-ink z-100 shadow-2xl overflow-y-auto max-h-64">
                                {Array.isArray(config.font_files) && config.font_files.map((_, i) => (
                                  <button key={i} onClick={() => { setActiveStyleIndex(i); setIsDropdownOpen(false); }} className={`w-full text-left px-6 py-4 text-[10px] font-bold uppercase border-b border-vintage-ink/5 last:border-0 transition-colors ${activeStyleIndex === i ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}>{detectedStyleNames[i] || `STYLE ${String(i + 1).padStart(2, '0')}`}</button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* FONT STYLE SELECTOR STANDAR (JIKA BUKAN LAYERED FONT) */
              <div className="w-full flex items-center px-6 py-4 relative group overflow-visible z-50">
                <div className="w-full relative">
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between text-[13px] font-bold uppercase tracking-tighter border-b border-transparent hover:border-vintage-ink/30 transition-colors relative z-10">
                    <span className="truncate">{detectedStyleNames[activeStyleIndex] || `STYLE ${String(activeStyleIndex + 1).padStart(2, '0')}`}</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-60" onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); }} />
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 top-full mt-2 w-full bg-vintage-paper border border-vintage-ink z-100 shadow-2xl overflow-y-auto max-h-64">
                          {Array.isArray(config.font_files) && config.font_files.map((_, i) => (
                            <button key={i} onClick={() => { setActiveStyleIndex(i); setIsDropdownOpen(false); }} className={`w-full text-left px-6 py-4 text-[10px] font-bold uppercase border-b border-vintage-ink/5 last:border-0 transition-colors ${activeStyleIndex === i ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}>{detectedStyleNames[i] || `STYLE ${String(i + 1).padStart(2, '0')}`}</button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* SIZE / PAGINATION */}
          <div className="flex items-center px-6 py-4 border-b lg:border-b-0 lg:border-r border-vintage-ink/20 min-w-44 relative">
            <div className="w-full relative">
              
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

          {/* ALIGNMENT */}
          <div className="flex items-center px-6 py-4 gap-4">
             {viewMode === 'type' && (
                <div className="flex border border-vintage-ink/20 rounded-sm overflow-hidden">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button 
                      key={a} 
                      onClick={() => setAlign(a)} 
                      className={`p-2 transition-all duration-300 group ${
                        align === a 
                          ? 'bg-vintage-ink! text-vintage-paper! border-vintage-ink' 
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
             {!isLayeredMode ? (
                  /* SINGLE STYLE DISPLAY */
                  <div 
                    ref={(el) => { layerContainerRefs.current['single'] = el; }}
                    className="absolute inset-0 p-10 md:p-16 lg:p-20 whitespace-pre-wrap wrap-break-word overflow-hidden z-25 pointer-events-auto select-none"
                    style={{ 
                      ...commonFontStyle, 
                      fontSize: `${fontSize}px`, 
                      textAlign: align, 
                      lineHeight: lineHeight, 
                      letterSpacing: `${letterSpacing}em` 
                    }}
                    onClick={() => {
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                  >
                    {renderTextSpans(activeStyleIndex)}
                  </div>
                ) : (
                  /* MULTI-LAYER STACKING DISPLAY */
                  <div className="absolute inset-0 z-25 pointer-events-auto overflow-hidden select-none">
                    {layers.map((layer, stackIdx) => {
                      if (!layer.isVisible) return null;
                      const calculatedZIndex = layers.length - stackIdx;
                      return (
                        <div 
                          key={layer.id}
                          ref={(el) => { layerContainerRefs.current[layer.id] = el; }}
                          className="absolute inset-0 p-10 md:p-16 lg:p-20 whitespace-pre-wrap wrap-break-word select-none overflow-hidden"
                          style={{ 
                            ...commonFontStyle,
                            fontFamily: `"${config.name}-${layer.fontIndex}"`,
                            fontSize: `${fontSize}px`, 
                            textAlign: align, 
                            lineHeight: lineHeight, 
                            letterSpacing: `${letterSpacing}em`,
                            zIndex: calculatedZIndex,
                            color: layer.color || (layer.isInverted ? 'var(--color-vintage-paper)' : 'var(--color-vintage-ink)'),
                            textShadow: layer.color ? 'none' : (layer.isInverted ? '-1px -1px 0 rgba(0,0,0,0.15), 1px 1px 0 rgba(0,0,0,0.15)' : 'none')
                          }}
                        >
                          {renderTextSpans(layer.fontIndex)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ACCURATE VISUAL CARET */}
                {isFocused && caretCoords && cursorPos !== null && !selectionRange && (
                  <div 
                    className="absolute z-35 w-0.5 bg-vintage-ink pointer-events-none animate-pulse"
                    style={{
                      left: `${caretCoords.left}px`,
                      top: `${caretCoords.top}px`,
                      height: `${caretCoords.height}px`
                    }}
                  />
                )}

                {/* TEXTAREA INPUT */}
                <textarea 
                  key="type" 
                  ref={textareaRef}
                  value={text} 
                  onChange={handleTextChange} 
                  onFocus={() => {
                    setIsFocused(true);
                    handleSelectionOrCursorChange();
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                    setCaretCoords(null);
                  }}
                  onSelect={handleSelectionOrCursorChange}
                  onKeyUp={handleSelectionOrCursorChange}
                  onKeyDown={handleSelectionOrCursorChange}
                  onMouseUp={handleSelectionOrCursorChange}
                  onMouseDown={handleSelectionOrCursorChange}
                  onScroll={handleScrollSync}
                  className="w-full min-h-100 bg-transparent outline-none resize-none p-10 md:p-16 lg:p-20 relative z-10 text-transparent caret-transparent selection:bg-transparent selection:text-transparent pointer-events-none"
                  style={{ 
                    ...commonFontStyle, 
                    fontSize: `${fontSize}px`, 
                    textAlign: align, 
                    lineHeight: lineHeight, 
                    letterSpacing: `${letterSpacing}em`
                  }} 
                  spellCheck={false} 
                />

                {/* ALTERNATE GLYPH POPOVER */}
                <AnimatePresence>
                  {popoverPos && alternateGlyphs.length > 0 && selectedCharIndex !== null && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute z-60 bg-vintage-paper border border-vintage-ink shadow-2xl p-2.5 flex items-center gap-3 pointer-events-auto"
                      style={{
                        left: `${Math.max(16, Math.min(popoverPos.x - 20, (textareaRef.current?.clientWidth || 600) - 280))}px`,
                        top: `${popoverPos.y > 70 ? popoverPos.y - 65 : popoverPos.y + fontSize + 15}px`
                      }}
                    >
                      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-vintage-accent border-r border-vintage-ink/10 pr-2">
                        Alternates
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm">
                        {/* Pilihan Default / Reset */}
                        <button
                          type="button"
                          onClick={() => applyAlternate({ char: text.charAt(selectedCharIndex), glyphIndex: 0, featureTag: '' })}
                          className={`h-11 min-w-11 px-2 flex flex-col items-center justify-center border transition-all group shrink-0 ${
                            !charOverrides[selectedCharIndex] 
                              ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                              : 'border-vintage-ink/20 hover:bg-vintage-ink hover:text-vintage-paper bg-transparent text-vintage-ink'
                          }`}
                          title="Default Style"
                        >
                          <div className="h-6 flex items-center justify-center">
                            {renderGlyphSvg(loadedFontObj ? loadedFontObj.charToGlyphIndex(text.charAt(selectedCharIndex)) : 0, 22) || (
                              <span style={{ ...commonFontStyle, fontSize: '18px', fontFeatureSettings: 'normal' }} className="leading-none">
                                {text.charAt(selectedCharIndex)}
                              </span>
                            )}
                          </div>
                          <span className="text-[7px] opacity-40 uppercase font-sans group-hover:opacity-100 mt-0.5">DEFAULT</span>
                        </button>

                        {/* List Alternate Feature */}
                        {alternateGlyphs.map((alt, idx) => {
                          const isSelected = glyphOverrides[selectedCharIndex] === alt.glyphIndex || (!glyphOverrides[selectedCharIndex] && charOverrides[selectedCharIndex] === alt.featureTag && idx === 0);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyAlternate(alt)}
                              className={`h-11 min-w-11 px-2 flex flex-col items-center justify-center border transition-all group shrink-0 ${
                                isSelected 
                                  ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' 
                                  : 'border-vintage-ink/20 hover:bg-vintage-ink hover:text-vintage-paper bg-transparent text-vintage-ink'
                              }`}
                              title={`Glyph #${alt.glyphIndex} (${alt.featureTag.toUpperCase()})`}
                            >
                              <div className="h-6 flex items-center justify-center">
                                {renderGlyphSvg(alt.glyphIndex, 22) || (
                                  <span 
                                    style={{ 
                                      ...commonFontStyle, 
                                      fontSize: '18px', 
                                      fontFeatureSettings: `"${alt.featureTag}" 1` 
                                    }} 
                                    className="leading-none"
                                  >
                                    {alt.char}
                                  </span>
                                )}
                              </div>
                              <span className="text-[7px] opacity-40 uppercase font-sans group-hover:opacity-100 mt-0.5">
                                {alt.featureTag === 'aalt' ? 'SALT' : alt.featureTag.toUpperCase()}
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
                      key={item.index ?? idx} 
                      className={`aspect-square flex items-center justify-center border-b ${isRightEdge ? '' : 'border-r'} border-vintage-ink/10 hover:bg-vintage-ink hover:text-vintage-paper transition-all cursor-default group relative p-2`}
                      title={item.name ? `${item.name} (#${item.index})` : `Glyph #${item.index}`}
                    >
                      <div className="w-9 h-9 flex items-center justify-center pointer-events-none">
                        {renderGlyphSvg(item.index, 36) || (
                          item.char ? (
                            <span style={{ ...commonFontStyle, fontSize: '28px' }}>{item.char}</span>
                          ) : (
                            <span className="text-[9px] font-mono opacity-30">#{item.index}</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className={`bg-vintage-paper relative z-30 ${viewMode === 'type' ? 'border-t border-vintage-ink/20' : ''}`}>
          {isLayeredMode && viewMode === 'type' && (
            <div className="p-6 md:p-8 border-b border-vintage-ink/20 bg-vintage-ink/3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-vintage-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-vintage-accent">Layer Stacking Order (Top to Bottom)</span>
                </div>

                {/* ADD LAYER DROPDOWN SELECTOR */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAddLayerOpen(!isAddLayerOpen)}
                    className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider border border-vintage-ink/30 hover:bg-vintage-ink hover:text-vintage-paper transition-all flex items-center gap-1.5 relative z-10"
                  >
                    <Plus size={12} /> ADD LAYER
                  </button>

                  <AnimatePresence>
                    {isAddLayerOpen && (
                      <>
                        <div className="fixed inset-0 z-60" onClick={() => setIsAddLayerOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: 5 }} 
                          className="absolute right-0 bottom-full mb-1 w-48 bg-vintage-paper border border-vintage-ink/20 z-70 shadow-2xl overflow-hidden"
                        >
                          <div className="px-3 py-1.5 text-[8px] font-bold uppercase text-vintage-accent border-b border-vintage-ink/10 tracking-widest bg-vintage-ink/5">
                            Select Layer Font
                          </div>
                          {/* Hanya tampilkan font yang lolos filter Layer System */}
                          {availableLayerIndices.map((fIdx) => (
                            <button
                              key={fIdx}
                              type="button"
                              onClick={() => addSpecificLayer(fIdx)}
                              className="w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase border-b border-vintage-ink/5 last:border-0 hover:bg-vintage-ink hover:text-vintage-paper transition-colors"
                            >
                              {detectedStyleNames[fIdx] || `Style ${fIdx + 1}`}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {layers.map((layer, idx) => (
                 <div 
                    key={layer.id} 
                    onDragOver={handleLayerDragOver}
                    onDrop={() => handleLayerDrop(idx)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border transition-all gap-3 ${
                      draggedLayerIdx === idx ? 'opacity-30 border-dashed border-vintage-ink' : ''
                    } ${
                      !layer.isVisible ? 'opacity-40 border-vintage-ink/10 bg-transparent' : 'border-vintage-ink/20 bg-vintage-paper shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Drag Handle Khusus */}
                      <div
                        draggable
                        onDragStart={() => handleLayerDragStart(idx)}
                        onDragEnd={() => setDraggedLayerIdx(null)}
                        className="cursor-grab active:cursor-grabbing text-vintage-ink/40 hover:text-vintage-ink p-1 -m-1"
                        title="Drag to Reorder Layer"
                      >
                        <GripVertical size={15} />
                      </div>
                      <span className="text-[9px] font-mono font-bold opacity-40 w-4">#{idx + 1}</span>
                      
                      <select 
                        value={layer.fontIndex}
                        onChange={(e) => changeLayerFont(layer.id, parseInt(e.target.value))}
                        className="bg-transparent border border-vintage-ink/20 px-2.5 py-1 text-[10px] font-bold uppercase outline-none cursor-pointer"
                      >
                        {availableLayerIndices.map((fIdx) => (
                          <option key={fIdx} value={fIdx} className="bg-vintage-paper text-vintage-ink">
                            {detectedStyleNames[fIdx] || `Style ${fIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {/* COLOR PICKER BUTTON */}
                      <div className="flex items-center gap-1.5 border border-vintage-ink/20 px-2 py-1 relative group cursor-pointer hover:border-vintage-ink transition-colors">
                        <input 
                          type="color"
                          value={layer.color || '#2B2621'}
                          onChange={(e) => changeLayerColor(layer.id, e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          title="Pick Layer Color"
                        />
                        <div 
                          className="w-3.5 h-3.5 border border-vintage-ink/30 shadow-xs" 
                          style={{ backgroundColor: layer.color || '#2B2621' }} 
                        />
                        <span className="text-[8px] font-mono font-bold uppercase text-vintage-ink">
                          {layer.color || '#2B2621'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Toggle Visibility */}
                        <button
                          type="button"
                          onClick={() => toggleLayerVisibility(layer.id)}
                          className="p-1.5 border border-vintage-ink/20 text-vintage-ink/60 hover:text-vintage-ink transition-colors"
                          title={layer.isVisible ? "Hide Layer" : "Show Layer"}
                        >
                          {layer.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>

                        {/* Reorder Buttons */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveLayer(idx, 'up')}
                          className="p-1.5 border border-vintage-ink/20 text-vintage-ink/60 hover:text-vintage-ink disabled:opacity-20 transition-colors"
                          title="Move Up in Stack (Bring Forward)"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === layers.length - 1}
                          onClick={() => moveLayer(idx, 'down')}
                          className="p-1.5 border border-vintage-ink/20 text-vintage-ink/60 hover:text-vintage-ink disabled:opacity-20 transition-colors"
                          title="Move Down in Stack (Send Backward)"
                        >
                          <ArrowDown size={13} />
                        </button>

                        {/* Delete Layer */}
                        {layers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLayer(layer.id)}
                            className="p-1.5 border border-red-300/40 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="Remove Layer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    {dynamicFeatures.map((feat) => {
                      const isActive = !!activeFeatures[feat.tag];
                      return (
                        <button 
                          key={feat.tag} 
                          onClick={() => toggleFeature(feat.tag)} 
                          className={`px-4 py-2 text-[9px] font-bold uppercase transition-all duration-300 rounded-none cursor-pointer ${
                            isActive 
                              ? 'bg-vintage-ink! text-vintage-paper! border-transparent shadow-sm' 
                              : 'bg-transparent border border-vintage-ink/20 text-vintage-ink/60 hover:border-vintage-ink hover:text-vintage-ink'
                          }`}
                        >
                          {feat.name}
                        </button>
                      );
                    })}
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