import React from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  section_id: string;
  category: string;
  type: string; // Tambahkan properti type
  updated_at?: string;
}

// Brutalist Table Component (Konsisten dengan FAQ)
const BrutalTable: React.FC<{ headers: string[], rows: string[][], title?: string }> = ({ headers, rows, title }) => (
  <div className="w-full border border-black mb-10 overflow-hidden text-left">
    {title && (
      <div className="bg-black text-white p-4 font-bold text-xs md:text-sm tracking-[0.2em] uppercase">
        {title}
      </div>
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-black bg-[#f9f9f9]">
            {headers.map((h, i) => (
              <th key={i} className="p-4 border-r border-black last:border-0 font-bold text-[10px] md:text-xs uppercase tracking-widest text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`p-4 border-r border-black last:border-0 font-normal text-xs md:text-sm normal-case leading-tight ${cell === '❌' ? 'text-red-500 font-bold' : cell === '✅' ? 'text-green-600 font-bold' : 'text-black'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Shared Bullet Style
const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

// Shared Box Style - Brutalist Standard
const BrutalBox: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`border border-black p-8 md:p-10 bg-white ${className}`}>
    {children}
  </div>
);

const Insights: React.FC = () => {

  const [insights, setInsights] = useState<ContentItem[]>([]);
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
    const fetchInsights = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'insights')
        .order('sort_order', { ascending: true });
      
      if (data) {
        setInsights(data);
        setLastUpdated(formatLastUpdated(data));
      }
      setLoading(false);
    };
    fetchInsights();
  }, []);

  // Komponen InsightCard - Mengikuti Style TermCard License.tsx
  const InsightCard: React.FC<{ 
    number: string, 
    title: string, 
    category: string, 
    children: React.ReactNode,
    linkText: string 
  }> = ({ number, title, category, children, linkText }) => (
    <div id={number} className="mb-12 w-full border border-black bg-white relative z-10 scroll-mt-24">
      {/* Title Section: Nomor di sisi kiri title dengan text yang sama */}
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
        <div className="flex gap-6 items-start">
          <PlusBullet />
          <div className="space-y-10 w-full">
            {children}
            
            {/* Brutalist Action Link */}
            <Link to={`/insight/${number}`} className="inline-flex items-center gap-6 group/link pt-4">
              <span className="text-2xl md:text-4xl font-normal tracking-tighter uppercase border-b-4 border-black group-hover/link:border-orange-600 transition-colors">
                {linkText}
              </span>
              <ArrowRight size={32} strokeWidth={1.5} className="group-hover/link:translate-x-4 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden uppercase">
      
      {/* VIBRANT BACKGROUND ORBS - Fixed Back-Layering & Pointer-Events */}
      <div className="grain-orb-base orb-top-right -z-10! pointer-events-none" />
      <div className="grain-orb-base orb-bottom-left -z-10! pointer-events-none" />
      <div className="grain-orb-base orb-top-right top-auto! bottom-0! -right-[10%]! bg-red-600/20! -z-10! pointer-events-none" />

      <div className="w-full relative z-10">
        {/* HEADER SECTION - Konsisten dengan License/Policy/FAQ */}
        <header className="px-6 py-16 md:px-8 border-b border-black mb-12 bg-transparent text-left">
          <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85] mb-6">
            The Type Lab
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-widest">
              Tips, Tricks, and Typography Trends.
            </p>
            <p className="text-[10px] md:text-xs font-semibold text-black/40 uppercase tracking-widest">
              — LAST UPDATED: {lastUpdated || 'FEBRUARY 21, 2026'}
            </p>
          </div>
        </header>

        {/* CONTENT MAIN */}
        <main className="px-3 md:px-8 max-w-full mx-auto text-left">
          
          {loading ? (
            <div className="animate-pulse font-bold">SYNCING_LAB_RECORDS...</div>
          ) : (
            insights.map((item) => {
              // Penanganan Tipe AUTO (Text + Table)
              if (item.type === 'auto') {
                const jsonStartIndex = item.content.indexOf('{');
                if (jsonStartIndex !== -1) {
                  const textPart = item.content.substring(0, jsonStartIndex).trim();
                  const jsonPart = item.content.substring(jsonStartIndex).trim();
                  try {
                    const tableData = JSON.parse(jsonPart);
                    return (
                      <InsightCard 
                        key={item.id} 
                        number={item.section_id || ''} 
                        category={item.category || 'Typographic Insight'} 
                        title={item.title}
                        linkText="VIEW_DETAILS"
                      >
                        <div className="space-y-6">
                          <div 
                            className="text-lg md:text-2xl"
                            dangerouslySetInnerHTML={{ __html: textPart }} 
                          />
                          <BrutalTable headers={tableData.headers} rows={tableData.rows} />
                        </div>
                      </InsightCard>
                    );
                  } catch (e) { console.error("Insight auto-parse error", e); }
                }
              }

              // Logika JSON Original (summary, date, dll)
              try {
                const data = JSON.parse(item.content);
                return (
                  <InsightCard 
                    key={item.id} 
                    number={item.section_id || ''} 
                    category={item.category || 'Typographic Insight'} 
                    title={item.title}
                    linkText={data.linkText || 'READ_MORE'}
                  >
                    <p className="text-lg md:text-2xl">
                      {data.summary}
                    </p>
                  </InsightCard>
                );
              } catch (e) { return null; }
            })
          )}

        </main>

        {/* Footer Spacer */}
        <div className="h-40 md:h-60 bg-transparent" />
      </div>
    </div>
  );
};

export default Insights;