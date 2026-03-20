import React from 'react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  section_id: string;
  category: string;
  type: string;
updated_at?: string;
}
// Shared Bullet Style
const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

// Shared Box Style
const BrutalBox: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`border border-black p-8 md:p-10 bg-white ${className}`}>
    {children}
  </div>
);

const About: React.FC = () => {

  const [aboutSections, setAboutSections] = useState<ContentItem[]>([]);
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
    const fetchAbout = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'about')
        .order('sort_order', { ascending: true });
      
      if (data) {
        setAboutSections(data);
        setLastUpdated(formatLastUpdated(data));
      }
      setLoading(false);
    };
    fetchAbout();
  }, []);
  // Component AboutCard - Consistent with License.tsx style
  const AboutCard: React.FC<{ 
    number: string, 
    title: string, 
    category: string, 
    children: React.ReactNode 
  }> = ({ number, title, category, children }) => (
    <div id={number} className="mb-12 w-full border border-black bg-white relative z-10 scroll-mt-24">
      {/* Title Section: Number on the left with identical font style */}
      <div className="border-b border-black p-6 md:p-10 bg-white">
        <span className="text-[10px] font-black tracking-[0.3em] text-orange-600 block mb-4 uppercase">
          {category}
        </span>
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
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden uppercase">
      
      {/* VIBRANT BACKGROUND ORBS - Fixed Back-Layering & Pointer-Events */}
      <div className="grain-orb-base orb-top-right !-z-10 pointer-events-none" />
      <div className="grain-orb-base orb-bottom-left !-z-10 pointer-events-none" />
      <div className="grain-orb-base orb-top-right !top-auto !bottom-0 !-right-[10%] !bg-red-600/20 !-z-10 pointer-events-none" />

      <div className="max-w-full mx-auto relative z-10">
        {/* HEADER SECTION - Theme Updated to $0 Dollar Cost */}
        <header className="px-6 py-16 md:px-8 border-b border-black mb-12 bg-transparent text-left">
          <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85] mb-6">
            The Zero-Dollar <br className="hidden md:block" /> Architecture
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-widest">
              100% Indie. Built Natively. No CMS.
            </p>
            <p className="text-[10px] md:text-xs font-semibold text-black/40 uppercase tracking-widest">
              — LAST UPDATED: {lastUpdated || 'FEBRUARY 21, 2026'}
            </p>
          </div>
        </header>

        {/* CONTENT MAIN */}
        <main className="px-3 md:px-8 max-w-full mx-auto text-left">
          
          {loading ? (
            <div className="animate-pulse font-bold">LOADING_MANIFESTO...</div>
          ) : (
            aboutSections.map((item) => {
              // TEMPLATE: Special Footer dengan Orb Dekoratif
              if (item.type === 'special_footer') {
                try {
                  const data = JSON.parse(item.content);
                  return (
                    <section key={item.id} className="mt-12 w-full border border-black bg-black text-white p-10 md:p-20 relative z-10 overflow-hidden">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/20 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                       <div className="relative z-10 space-y-10">
                          <h3 
                            className="text-4xl md:text-7xl font-normal tracking-tighter uppercase italic leading-[0.9]"
                            dangerouslySetInnerHTML={{ __html: data.italic_text }}
                          />
                          <p className="text-lg md:text-2xl normal-case text-gray-400 font-normal leading-relaxed max-w-4xl">
                            {data.body_text}
                          </p>
                          <div className="pt-6">
                             <p className="text-base md:text-lg font-bold uppercase tracking-[0.3em] text-orange-600">
                               {data.location}
                             </p>
                          </div>
                       </div>
                    </section>
                  );
                } catch (e) { return null; }
              }

              // TEMPLATE: Kartu About Standar
              return (
                <AboutCard 
                  key={item.id} 
                  number={item.section_id || ''} 
                  category={item.title.includes('?') ? 'The Core Hypothesis' : 'Technical Identity'} 
                  title={item.title}
                >
                  <div 
                    className="prose max-w-none prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.content }} 
                  />
                </AboutCard>
              );
            })

          )}

        </main>

        {/* Footer Spacer */}
        <div className="h-40 md:h-60 bg-transparent" />
      </div>
    </div>
  );
};

export default About;