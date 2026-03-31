/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// FontCard yang telah dimodifikasi sesuai instruksi
const FontCard = ({ fontName, price, onClick, primaryIndex = 0 }: { fontName: string, price: number, onClick: () => void, primaryIndex?: number }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className="vintage-card flex flex-col items-center text-center h-full p-6 pt-10 cursor-pointer"
  >
    {/* Atas: Nama Font */}
    <div className="h-6 flex items-center justify-center">
      <p className="text-[12px] uppercase tracking-widest text-vintage-accent font-bold">{fontName}</p>
    </div>
    
    <hr className="w-full border-vintage-ink my-4" />
    
    {/* Tengah: Preview ABC-Z - Diperluas ke h-44 dan padding ditingkatkan untuk mencegah clipping */}
    <div className="h-44 flex items-center justify-center w-full px-2 overflow-hidden bg-vintage-ink/2">
      <h3 
        className="text-4xl md:text-5xl leading-[1.4] break-all tracking-tight py-4"
        style={{ fontFamily: `"${fontName}-${primaryIndex}"` }} 
      >
        ABCDEFGHIJKLMNOPQRSTUVWXYZ
      </h3>
    </div>
    
    <hr className="w-full border-vintage-ink/20 my-4" />
    
    {/* Bawah Tengah: Angka 0-9 - Warna Solid (Tanpa Opacity) */}
    <div className="h-10 flex items-center justify-center px-4">
      <p 
        className="text-2xl font-bold text-vintage-ink tracking-[0.3em]"
        style={{ fontFamily: `"${fontName}-${primaryIndex}"` }}
      >
        0123456789
      </p>
    </div>
    
    <hr className="w-full border-vintage-ink/20 mt-4 mb-6" />
    
    {/* Footer: Harga & Button */}
    <div className="mt-auto w-full">
      <div className="text-[11px] font-bold mb-4 uppercase tracking-tighter">Starting at ${price}</div>
      <button className="vintage-btn py-3 text-[12px] w-full">VIEW FONTS</button>
    </div>
  </motion.div>
);

export default function Home() {
  const navigate = useNavigate();
  const [featuredFonts, setFeaturedFonts] = useState<any[]>([]);
  const [recentFonts, setRecentFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  // Logic Font Loader sesuai standar TypeTester
  useEffect(() => {
    if (recentFonts.length === 0) return;

    const styleId = "dynamic-fonts-home";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    const fontFaces = recentFonts.map(f => {
      const pIdx = f.metadata?.primary_font_index || 0;
      const files = Array.isArray(f.font_files) ? f.font_files : [];
      const file = files[pIdx]; 
      
      if (!file) return '';
      
      const version = new Date(f.updated_at || f.created_at || Date.now()).getTime();
      const url = file.startsWith('http') || file.startsWith('/') 
        ? file 
        : `/api/fonts/${file}?v=${version}`;

      return `
        @font-face {
          font-family: "${f.name}-${pIdx}";
          src: url("${url}");
          font-display: swap;
        }
      `;
    }).join("\n");

    styleTag.innerHTML = fontFaces;
  }, [recentFonts]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch 3 Featured Fonts
      const { data: featured } = await supabase
        .from('fonts')
        .select('*')
        .filter('metadata->is_featured', 'eq', true)
        .limit(3);

      // 2. Fetch 4 Recent Fonts (Berdasarkan created_at terbaru)
      const { data: recent } = await supabase
        .from('fonts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (featured) setFeaturedFonts(featured);
      if (recent) setRecentFonts(recent);
      
    } catch (err) {
      console.error("Data retrieval failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-12">
      {/* Hero Section */}
      <section className="text-center mb-16 max-w-3xl mx-auto relative z-10 px-4 pt-12">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4"
        >
          Retro Refinement: Authentic Vintage & Victorian Typefaces
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight"
        >
          Heritage Display
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base md:text-lg lg:text-xl italic opacity-80 mb-6 leading-relaxed"
        >
          Discover curated collections of historic fonts, meticulously digitized for timeless design, branding, & letterpress.
        </motion.p>

        <div className="flex justify-center mt-12 w-full max-w-xl mx-auto relative z-30">
          <button 
            onClick={() => navigate('/fonts')}
            className="vintage-btn btn-reverse px-16 py-4 text-sm tracking-[0.3em]"
          >
            EXPLORE OUR FONTS
          </button>
        </div>
      </section>

      {/* Featured Fonts Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        <div className="divider">
          <h2 className="text-3xl md:text-5xl font-script capitalize">Featured Fonts</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
          {loading ? (
             [1,2,3].map(i => <div key={i} className="h-80 bg-vintage-ink/5 animate-pulse" />)
          ) : (
            featuredFonts.map((font) => (
              <motion.div 
                key={font.id}
                whileHover={{ scale: 1.02 }}
                className="vintage-card flex flex-col p-0 overflow-hidden h-full cursor-pointer"
                onClick={() => navigate(`/font/${font.id}`)}
              >
                <div className="aspect-3/2 w-full bg-vintage-ink/5 border-b border-vintage-ink relative group overflow-hidden">
                  {font.preview_images?.[0] && (
                    <img 
                      src={`/api/images/${font.preview_images[0]}`} 
                      alt={font.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  )}
                  <div className="absolute top-3 right-3 bg-vintage-paper/95 px-3 py-1 text-[12px] font-bold tracking-widest border border-vintage-ink">
                    ${font.price}
                  </div>
                </div>
                <div className="p-6 text-center grow flex flex-col justify-between gap-4">
                  <h3 className="text-2xl font-display leading-tight">{font.name}</h3>
                  <button className="vintage-btn py-3 text-[12px] w-full">VIEW FONTS</button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Recent Fonts Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        <div className="divider">
          <h2 className="text-3xl md:text-5xl font-script capitalize">Recent Fonts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
          {loading ? (
             [1,2,3,4].map(i => <div key={i} className="h-64 bg-vintage-ink/5 animate-pulse" />)
          ) : (
            recentFonts.map((font) => (
              <FontCard 
                key={font.id}
                fontName={font.name} 
                price={font.price} 
                onClick={() => navigate(`/font/${font.id}`)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}