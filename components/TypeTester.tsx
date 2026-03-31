import React, { useState, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Type, Grid, Keyboard, ChevronDown , ChevronLeft, ChevronRight } from 'lucide-react';
import { FontConfig } from '../types';
import opentype from 'opentype.js';

interface TypeTesterProps {
  config: FontConfig & { 
    metadata?: { 
      primary_font_index?: number 
    } 
  };
  defaultText?: string;
  isEven?: boolean;
}

const TypeTester: React.FC<TypeTesterProps> = ({ 
  config, 
  defaultText = "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.",
  isEven = true 
}) => {
  const [text, setText] = useState(config.randomText || defaultText);
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

  useEffect(() => {
    const files = Array.isArray(config.font_files) ? config.font_files : [];
    if (files.length === 0) return;

    const configAny = config as any;
    const version = new Date(configAny.updated_at || configAny.created_at || Date.now()).getTime();

    files.forEach((file, index) => {
      // Lewati jika nama style sudah dideteksi agar tidak overload
      if (detectedStyleNames[index]) return;

      const url = file.startsWith('http') || file.startsWith('/') ? file : `/api/fonts/${file}?v=${version}`;

      opentype.load(url, (err, font) => {
        if (!err && font) {
          const names = font.names as any;
          // Check if font has variation axes (Variable Font)
          const isVariable = font.tables.fvar?.axes?.length > 0;
          const detectedName = names.preferredSubfamily?.en || names.fontSubfamily?.en;
          
          // Force "Variable" label if axes are detected
          const styleName = isVariable ? "Variable" : detectedName;

          if (styleName) {
            setDetectedStyleNames(prev => ({
              ...prev,
              [index]: styleName
            }));
          }
        }
      });
    });
  }, [config.font_files])

  const [activeFeatures, setActiveFeatures] = useState<Record<string, boolean>>({});
  const [dynamicFeatures, setDynamicFeatures] = useState<{ tag: string; name: string }[]>([]);
  
  const [lineHeight, setLineHeight] = useState(1.1);
  const [letterSpacing, setLetterSpacing] = useState(0);
  
  const [mapPage, setMapPage] = useState(0);
  const [mapGridSize, setMapGridSize] = useState(10);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const PRESET_SIZES = [12, 14, 16, 18, 20, 24, 32, 36, 48, 64, 72, 96, 120, 144, 200];

  const FEATURE_NAMES: Record<string, string> = {
    liga: 'Standard Ligatures',
    dlig: 'Discretionary Lig',
    calt: 'Contextual Alt',
    aalt: 'Access All Alt',
    salt: 'Stylistic Alt',
  };

  const ALLOWED_TAGS = new Set([
      'liga', 'dlig', 'calt', 'aalt', 'salt',
      ...Array.from({ length: 20 }, (_, i) => `ss${String(i + 1).padStart(2, '0')}`) 
  ]);

  const rowsPerPage = mapGridSize === 10 ? 3 : mapGridSize === 20 ? 5 : 7;
  const glyphsPerPage = mapGridSize * rowsPerPage;

  useEffect(() => {
    let targetFile = '';
    const files = Array.isArray(config.font_files) && config.font_files.length > 0 
      ? config.font_files 
      : (config.file_url ? [config.file_url] : (config.file ? [config.file] : []));

    if (files[activeStyleIndex]) {
       const f = files[activeStyleIndex];
       const configAny = config as any;
       const version = new Date(configAny.updated_at || configAny.created_at || Date.now()).getTime();
       targetFile = f.startsWith('http') || f.startsWith('/') ? f : `/api/fonts/${f}?v=${version}`;
    }
    if (!targetFile) return;

    setIsLoadingGlyphs(true);
    
    opentype.load(targetFile, (err, font) => {
      setIsLoadingGlyphs(false);
      if (err || !font) return;

      const names = font.names as any;
      // Check if the active font is a Variable Font
      const isVariable = font.tables.fvar?.axes?.length > 0;
      const detectedName = names.preferredSubfamily?.en || names.fontSubfamily?.en;

      // Force "Variable" label for the active style display
      const rawStyleName = isVariable ? "Variable" : detectedName;
      
      if (rawStyleName) {
        setDetectedStyleNames(prev => ({
          ...prev,
          [activeStyleIndex]: rawStyleName
        }));
      }

      const glyphs = [];
      for (let i = 0; i < font.glyphs.length && i < 2000; i++) { 
        const glyph = font.glyphs.get(i);
        if (glyph.unicode) {
           glyphs.push({ char: String.fromCharCode(glyph.unicode), index: i, unicode: glyph.unicode });
        }
      }
      setDetectedGlyphs(glyphs);
      setFilteredGlyphs(glyphs); 

      if (font.tables.fvar?.axes?.length > 0) {
          const autoAxes = font.tables.fvar.axes.map((axis: any) => ({
              tag: axis.tag,
              name: axis.name?.en || axis.tag,
              min: axis.minValue, max: axis.maxValue, default: axis.defaultValue
          }));
          setDetectedAxes(autoAxes);
          const vals: Record<string, number> = {};
          autoAxes.forEach((axis: any) => vals[axis.tag] = axis.default);
          setAxesValues(prev => ({ ...prev, ...vals }));
      } else {
          setDetectedAxes([]);
      }

      const foundTags = new Set<string>();
      if (font.tables.gsub?.features) {
        font.tables.gsub.features.forEach((f: any) => {
           if (f.tag && ALLOWED_TAGS.has(f.tag)) foundTags.add(f.tag);
        });
      }

      setDynamicFeatures(Array.from(foundTags).sort().map(tag => ({
        tag, name: FEATURE_NAMES[tag] || (tag.startsWith('ss') ? `Stylistic Set ${parseInt(tag.slice(2))}` : tag.toUpperCase())
      })));

      setActiveFeatures({});
    });
  }, [config, activeStyleIndex]);

 useEffect(() => {
    setFilteredGlyphs(detectedGlyphs); 
  }, [activeFeatures, detectedGlyphs]);

  // FIXED: Otomatis pindah ke 'type' view jika layar dikecilkan ke mobile/tablet portrait
  useEffect(() => {
    const handleResize = () => {
      // 1024px adalah standar breakpoint 'lg' Tailwind
      if (window.innerWidth < 1024 && viewMode === 'glyphs') {
        setViewMode('type');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const toggleFeature = (tag: string) => {
    setActiveFeatures(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const currentFontFamily = `"${config.name}-${activeStyleIndex}"`;
  const fontFeatureSettings = Object.entries(activeFeatures).map(([t, on]) => `"${t}" ${on ? 'on' : 'off'}`).join(', ') || 'normal';
  const fontVariationSettings = Object.entries(axesValues).map(([t, v]) => `"${t}" ${v}`).join(', ');

  const commonFontStyle = {
    fontFamily: currentFontFamily,
    fontVariationSettings,
    fontFeatureSettings,
  };

  const activeAxes = detectedAxes.length > 0 ? detectedAxes : config.axes;
  const hasAxes = activeAxes && activeAxes.length > 0;
  const hasFeatures = dynamicFeatures.length > 0;

  return (
    <div className="w-full h-full relative group bg-transparent">
      {/* ORB LAMA DI SINI SUDAH DIHAPUS DAN DIPINDAHKAN KE HOME.TSX */}
      <div className="relative z-10 h-full flex flex-col">
        {/* FIXED: Menggunakan flex-nowrap agar satu baris di iPad Landscape/Desktop */}
        <div className="grid grid-cols-2 lg:flex lg:flex-nowrap items-stretch justify-between border-b border-black bg-white/10 backdrop-blur-[2px] relative z-20">
          
          {/* GRID 1: View Mode - SEKARANG HANYA SATU BUTTON TOGGLE (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center gap-2 px-4 lg:px-8 py-4 lg:py-8 border-r border-black justify-start">
              <button 
                onClick={() => setViewMode(viewMode === 'type' ? 'glyphs' : 'type')} 
                className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase transition-colors bg-black text-white hover:bg-gray-800"
              >
                {viewMode === 'type' ? <Grid size={14}/> : <Keyboard size={14}/>}
                <span>{viewMode === 'type' ? 'Map View' : 'Type View'}</span>
              </button>
          </div>

          {/* GRID 2: Style Dropdown - Label "Style" hanya muncul di Mobile (lg:hidden) */}
          <div className="col-span-2 lg:col-span-1 lg:ml-auto flex items-center gap-6 px-4 lg:px-8 py-4 lg:py-8 border-b lg:border-b-0 lg:border-l border-black justify-between lg:justify-end lg:order-last">
              <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
                <span className="font-bold text-xs text-gray-400 uppercase lg:hidden">Style</span>
                <div className="relative z-100">
                   <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-2 appearance-none font-bold text-xs uppercase outline-none cursor-pointer py-1 pl-0 pr-2 bg-transparent hover:text-gray-600 transition-colors border-b border-transparent hover:border-black min-w-20 justify-between relative z-10"
                   >
                      <span>
                        {/* FIXED: Gunakan nama yang dideteksi, jika belum ada gunakan fallback angka */}
                        {detectedStyleNames[activeStyleIndex] || (
                          Array.isArray(config.font_files) && config.font_files.length > 0 
                            ? `Style ${String(activeStyleIndex + 1).padStart(2, '0')}`
                            : 'Style 01'
                        )}
                     </span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                   </button>

                   {isDropdownOpen && (
                     <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl border border-black z-50 overflow-hidden shadow-none">
                          {Array.isArray(config.font_files) && config.font_files.length > 0 ? (
                            config.font_files.map((_, i) => (
                              <button
                                key={i}
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    setActiveStyleIndex(i); 
                                    setIsDropdownOpen(false); 
                                }}
                                className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors block ${
                                  activeStyleIndex === i 
                                    ? 'bg-black text-white' 
                                    : 'text-black hover:bg-black hover:text-white'
                                }`}
                              >
                                {/* FIXED: Tampilkan nama style spesifik jika sudah pernah di-load sebelumnya */}
                                {detectedStyleNames[i] || `Style ${String(i + 1).padStart(2, '0')}`}
                              </button>
                            ))
                          ) : (
                             <button className="w-full text-left px-4 py-3 text-xs font-bold uppercase text-black cursor-default">
                               Style 01
                             </button>
                          )}
                      </div>
                     </>
                   )}
                </div>
              </div>
          </div>

          {/* GRID 3: Size (Type) / Map Grid (Map) - LEFT COLUMN (50% Width on Mobile/Tab) */}
          <div className="flex items-center gap-2 px-4 lg:px-8 py-4 lg:py-8 border-r border-black justify-center lg:justify-start">
             {viewMode === 'type' ? (
                <>
                  <div className="flex items-center gap-2">
                    {/* Label "Size" disembunyikan di desktop (lg:hidden) */}
                    <span className="font-bold text-xs text-gray-400 uppercase lg:hidden">Size</span>
                    <div className="relative z-110">
                       <button 
                          onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                          className="flex items-center gap-2 appearance-none font-bold text-xs uppercase outline-none cursor-pointer py-1 pl-0 pr-2 bg-transparent hover:text-gray-600 transition-colors border-b border-transparent hover:border-black min-w-16.25 justify-between relative z-10"
                       >
                          <span>{fontSize} PX</span>
                          <ChevronDown size={14} className={`transition-transform duration-200 ${isSizeDropdownOpen ? 'rotate-180' : ''}`} />
                       </button>

                       {isSizeDropdownOpen && (
                         <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSizeDropdownOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-32 bg-white/95 backdrop-blur-xl border border-black z-50 overflow-y-auto max-h-75 shadow-none custom-scrollbar">
                              {PRESET_SIZES.map((size) => (
                                <button
                                  key={size}
                                  onClick={(e) => { 
                                      e.stopPropagation();
                                      setFontSize(size); 
                                      setIsSizeDropdownOpen(false); 
                                  }}
                                  className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors block ${
                                    fontSize === size 
                                      ? 'bg-black text-white' 
                                      : 'text-black hover:bg-black hover:text-white'
                                  }`}
                                >
                                  {size} PX
                                </button>
                              ))}
                          </div>
                         </>
                       )}
                    </div>
                  </div>
                </>
             ) : (
               [10, 20, 30].map(size => (
                  <button key={size} onClick={() => { setMapGridSize(size); setMapPage(0); }} className={`px-3 py-1 text-xs font-bold border border-black ${mapGridSize === size ? 'bg-black text-white' : 'bg-transparent hover:bg-gray-200 uppercase'}`}>{size}</button>
                ))
             )}
          </div>

          {/* GRID 4: Align (Type) / Pagination (Map) - RIGHT COLUMN ON MOBILE */}
          <div className="flex items-center gap-2 px-4 lg:px-8 py-4 lg:py-8 justify-center xl:border-r xl:border-black lg:justify-start">
             {viewMode === 'type' ? (
                <>
                  <button onClick={() => setAlign('left')} className={`p-2 ${align === 'left' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}><AlignLeft size={16}/></button>
                  <button onClick={() => setAlign('center')} className={`p-2 ${align === 'center' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}><AlignCenter size={16}/></button>
                  <button onClick={() => setAlign('right')} className={`p-2 ${align === 'right' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}><AlignRight size={16}/></button>
                </>
             ) : (
              <div className="flex gap-1 items-center">
                  <button 
                    onClick={() => setMapPage(Math.max(0, mapPage - 1))} 
                    disabled={mapPage === 0} 
                    className="p-2 border border-black disabled:opacity-20 hover:bg-black hover:text-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setMapPage(mapPage + 1)} 
                    disabled={(mapPage + 1) * glyphsPerPage >= filteredGlyphs.length} 
                    className="p-2 border border-black disabled:opacity-20 hover:bg-black hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
               </div>
             )}
          </div>

        </div>

        <div className="min-h-75 mb-8 relative">
          {viewMode === 'type' ? (
              <textarea 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                className="w-full min-h-75 bg-transparent outline-none resize-none pt-4 pr-4 pb-4 pl-6 md:pl-8 relative z-10" 
                style={{ 
                    ...commonFontStyle,
                    fontSize: `${fontSize}px`, 
                    textAlign: align,
                    lineHeight: lineHeight,
                    letterSpacing: `${letterSpacing}em`
                }} 
                spellCheck={false} 
              />
          ) : (
              <div className="w-full grid content-start" style={{ gridTemplateColumns: `repeat(${mapGridSize}, minmax(0, 1fr))` }}>
                {filteredGlyphs.slice(mapPage * glyphsPerPage, (mapPage + 1) * glyphsPerPage).map((item, idx) => (
                  <div key={idx} className="aspect-square flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-default border-none">
                        <span style={{ 
                          ...commonFontStyle,
                          fontSize: mapGridSize === 10 ? '60px' : mapGridSize === 20 ? '32px' : '20px' 
                        }}>
                          {item.char}
                        </span>
                    </div>
                ))}
              </div>
          )}
        </div>

        {/* SETTINGS PANEL */}
        <div className="bg-transparent border-t border-black">
          <div className={`grid grid-cols-1 md:grid-cols-2 ${(hasAxes || hasFeatures) ? 'border-b border-black' : ''}`}>
              <div className="flex items-center gap-4 px-4 md:px-8 py-6 md:py-8 border-b md:border-b-0 md:border-r border-black">
               <label className="w-24 font-bold text-xs uppercase">Leading</label>
                  <input type="range" min="0.8" max="2.0" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(parseFloat(e.target.value))} className="grow h-px bg-black appearance-none cursor-pointer accent-black"/>
                  <span className="w-12 text-right font-bold text-xs">{lineHeight.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-4 px-4 md:px-8 py-6 md:py-8">
                  <label className="w-24 font-bold text-xs uppercase">Tracking</label>
                  <input type="range" min="-0.1" max="0.5" step="0.01" value={letterSpacing} onChange={(e) => setLetterSpacing(parseFloat(e.target.value))} className="grow h-px bg-black appearance-none cursor-pointer accent-black"/>
                  <span className="w-12 text-right font-bold text-xs">{letterSpacing.toFixed(2)}</span>
                  </div>
          </div>

          {(hasAxes || hasFeatures) && (
            <div className={`grid grid-cols-1 ${hasAxes && hasFeatures ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
                {hasAxes && (
                  <div className={`${hasFeatures ? 'md:col-span-2 border-b md:border-b-0' : 'md:col-span-1'} space-y-4 px-4 md:px-8 py-6 md:py-8 border-black`}>
                    <h4 className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-widest">Variable Axes</h4>
                    {activeAxes.map((axis: any) => (
                      <div key={axis.tag} className="flex items-center gap-4">
                        <label className="w-16 font-bold text-xs uppercase truncate">{axis.name}</label>
                        <input type="range" min={axis.min} max={axis.max} step={1} value={axesValues[axis.tag] ?? axis.default} onChange={(e) => setAxesValues(p => ({...p, [axis.tag]: parseFloat(e.target.value)}))} className="grow h-px bg-black appearance-none cursor-pointer accent-black"/>
                        <span className="w-12 text-right font-bold text-xs">{Math.round(axesValues[axis.tag] ?? axis.default)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {hasFeatures && (
                  <div className={`${hasAxes ? 'md:col-span-1 md:border-l' : 'md:col-span-1'} border-black px-4 md:px-8 py-6 md:py-8`}>
                    <h4 className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-widest">Features</h4>
                    <div className="flex flex-col gap-2 max-h-50 overflow-y-auto custom-scrollbar">
                      {dynamicFeatures.map((feat) => (
                        <label key={feat.tag} className="flex items-center justify-between cursor-pointer group select-none">
                          <span className="text-sm font-bold uppercase group-hover:text-gray-600 transition-colors">
                            {feat.name} <span className="text-gray-400 font-bold text-[10px] ml-2">.{feat.tag}</span>
                          </span>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={activeFeatures[feat.tag] || false} onChange={() => toggleFeature(feat.tag)} />
                            <div className="w-9 h-5 rounded-full bg-transparent border border-black peer-checked:bg-black peer-checked:border-black after:content-[''] after:absolute after:top-0.75 after:left-0.75 after:bg-black after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
                          </div>
                        </label>
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