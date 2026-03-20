import React from 'react';
import { Plus } from 'lucide-react';

// Shared Bullet Style - Menggunakan Icon Plus (Hitam)
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  section_id: string;
updated_at?: string;
}
const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

// Shared Box Style - Brutalist Box standar (Border hitam tegas)
const BrutalBox: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`border border-black p-8 md:p-10 bg-white ${className}`}>
    {children}
  </div>
);

const License: React.FC = () => {
  // Komponen Kartu Term - Kotak Biasa Brutalist Style
  const [licenses, setLicenses] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState<string>('');

  const formatLastUpdated = (items: ContentItem[]) => {
    const dates = items.map(i => i.updated_at ? new Date(i.updated_at).getTime() : 0).filter(d => d > 0);
    if (!dates.length) return '';
    return new Date(Math.max(...dates)).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }).toUpperCase();
  };

  useEffect(() => {
    const fetchLicenses = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'license')
        .order('sort_order', { ascending: true });
      
      if (data) {
        setLicenses(data);
        setLastUpdated(formatLastUpdated(data));
      }
      setLoading(false);
    };
    
    fetchLicenses();
  }, []);
  const TermCard: React.FC<{ number: string, title: string, children: React.ReactNode }> = ({ number, title, children }) => (
    <div id={number} className="mb-12 w-full border border-black bg-white relative z-10 scroll-mt-24">
      {/* Title Section: Nomor di sisi kiri title dengan text yang sama */}
      <div className="border-b border-black p-6 md:p-10 bg-white">
        <h3 className="text-3xl md:text-6xl font-normal tracking-tighter uppercase leading-none">
          <span className="opacity-20 mr-4 md:mr-8">{number}</span>
          {title}
        </h3>
      </div>

      {/* Content Section */}
      <div className="p-6 md:p-14 space-y-10 normal-case text-gray-800 leading-relaxed text-base md:text-xl">
        {children}
      </div>
    </div>
  );

  return (
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-[#F5F5F0] overflow-x-hidden uppercase">
      
      {/* VIBRANT BACKGROUND ORBS - Fixed Back-Layering & Pointer-Events */}
      <div className="grain-orb-base orb-top-right !-z-10 pointer-events-none" />
      <div className="grain-orb-base orb-bottom-left !-z-10 pointer-events-none" />
      <div className="grain-orb-base orb-top-right !top-auto !bottom-0 !-right-[10%] !bg-red-600/20 !-z-10 pointer-events-none" />

      <div className="w-full relative z-10">
        {/* HEADER SECTION */}
        <header className="px-6 py-16 md:px-8 border-b border-black mb-12 bg-transparent text-left">
          <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85] mb-6">
            License Agreement
          </h2>
          {/* 2. SUB-HEADER INFO - Tambah info Update Terakhir */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs md:text-sm font-normal text-black uppercase tracking-[0.3em]">
              Clear Additive Terms for Creative Freedom
            </p>
            <p className="text-xs md:text-sm font-normal text-black uppercase tracking-widest">
            — LAST UPDATED: {lastUpdated || 'FEBRUARY 21, 2026'}
            </p>
          </div>
        </header>

        {/* CONTENT MAIN */}
        <main className="px-3 md:px-8 max-w-full mx-auto text-left">
          
          {loading ? (
            <div className="animate-pulse font-bold">LOADING_LICENSE_TERMS...</div>
          ) : (
            licenses.map((item) => (
              <TermCard key={item.id} number={item.section_id || ''} title={item.title}>
                <div 
                  className="prose max-w-none prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.content }} 
                />
              </TermCard>
            ))
          )}

        </main>

        <div className="h-40 md:h-60 bg-transparent" />
      </div>
    </div>
  );
};

export default License;