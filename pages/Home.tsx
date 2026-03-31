/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Pastikan path import benar

// Komponen Kartu dipertahankan untuk fleksibilitas konten halaman Home
const FontCard = ({ title, subtitle, fontClass, price }: { title: string, subtitle: string, fontClass: string, price: string }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="vintage-card flex flex-col items-center text-center h-full p-6 pt-10"
  >
    <div className="h-6 flex items-center justify-center">
      <p className="text-[12px] uppercase tracking-widest text-vintage-accent font-bold">{subtitle}</p>
    </div>
    <hr className="w-full border-vintage-ink my-4" />
    <div className="h-32 flex items-center justify-center w-full px-4">
      <h3 className={`text-3xl leading-tight ${fontClass}`}>{title}</h3>
    </div>
    <hr className="w-full border-vintage-ink/20 my-4" />
    <div className="h-10 flex items-center justify-center px-4">
      <p className="text-sm italic opacity-70 leading-tight">Meticulously digitized for timeless design.</p>
    </div>
    <hr className="w-full border-vintage-ink/20 mt-4 mb-6" />
    <div className="mt-auto w-full">
      <div className="text-sm font-bold mb-4">{price}</div>
      <button className="vintage-btn py-3 text-[12px] w-full">VIEW FONTS</button>
    </div>
  </motion.div>
);

export default function Home() {
  const navigate = useNavigate();
  const [featuredFonts, setFeaturedFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    try {
      // Mengambil 3 font dengan flag is_featured di metadata
      const { data, error } = await supabase
        .from('fonts')
        .select('*')
        .filter('metadata->is_featured', 'eq', true)
        .limit(3);

      if (error) throw error;
      if (data) setFeaturedFonts(data);
    } catch (err) {
      console.error("Error fetching featured fonts:", err);
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
        
        {loading ? (
          <div className="text-center py-20 italic opacity-40 font-serif">
            Consulting Heritage Archive...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {featuredFonts.map((font) => (
              <motion.div 
                key={font.id}
                whileHover={{ scale: 1.02 }}
                className="vintage-card flex flex-col p-0 overflow-hidden h-full cursor-pointer"
                onClick={() => navigate(`/font/${font.id}`)}
              >
                <div className="aspect-3/2 w-full bg-vintage-ink/5 border-b border-vintage-ink relative group overflow-hidden">
                  {/* Mengambil preview_images nomor 1 (index 0) */}
                  {font.preview_images && font.preview_images.length > 0 ? (
                    <img 
                      src={`/api/images/${font.preview_images[0]}`} 
                      alt={font.name} 
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      NO PREVIEW
                    </div>
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
            ))}
          </div>
        )}
      </section>

      {/* Recent Fonts Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        <div className="divider">
          <h2 className="text-3xl md:text-5xl font-script capitalize">Recent Fonts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FontCard subtitle="An Ornate Serif" title="The Victoria" fontClass="font-display" price="$39 - $49" />
          <FontCard subtitle="Rough & Textured" title="Old Market" fontClass="font-playfair italic" price="$39 - $49" />
          <FontCard subtitle="Classic Script" title="Retro Signage" fontClass="font-script text-5xl" price="$39 - $49" />
          <FontCard subtitle="Traditional Gothic" title="Artisan Black" fontClass="font-blackletter" price="$39 - $49" />
        </div>
      </section>
    </div>
  );
}