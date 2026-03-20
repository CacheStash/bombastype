import React from 'react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  section_id: string;
  type: string;
updated_at?: string;
}

// Shared Bullet Style - Menggunakan Icon Plus (Hitam)
const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

// Shared Box Style - Border 1px konsisten
const BrutalBox: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`border border-black p-8 md:p-10 bg-white ${className}`}>
    {children}
  </div>
);

// Brutalist Table Component
const BrutalTable: React.FC<{ headers: string[], rows: string[][], title?: string }> = ({ headers, rows, title }) => (
  <div className="w-full border border-black mb-10 overflow-hidden">
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

const FAQ: React.FC = () => {

  const [faqs, setFaqs] = useState<ContentItem[]>([]);
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
    const fetchFaqs = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'faq')
        .order('sort_order', { ascending: true });
      
      if (data) {
        setFaqs(data);
        setLastUpdated(formatLastUpdated(data));
      }
      setLoading(false);
    };
    fetchFaqs();
  }, []);

  const TermCard: React.FC<{ number: string, title: string, children: React.ReactNode }> = ({ number, title, children }) => (
    
    <div id={number} className="mb-12 w-full border border-black bg-white relative z-10 scroll-mt-24">
      <div className="border-b border-black p-6 md:p-10 bg-white">
        <h3 className="text-2xl md:text-5xl font-normal tracking-tighter uppercase leading-tight">
          <span className="opacity-20 mr-4 md:mr-8">{number}</span>
          <span dangerouslySetInnerHTML={{ __html: title }} />
        </h3>
      </div>
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
        {/* HEADER SECTION */}
        <header className="px-6 py-16 md:px-8 border-b border-black mb-12 bg-transparent text-left">
          <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85] mb-6">
            Frequently Asked <br className="hidden md:block" /> Questions
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-widest">
              Clarity for Your Creative Workflow
            </p>
            <p className="text-[10px] md:text-xs font-semibold text-black/40 uppercase tracking-widest">
              — LAST UPDATED: {lastUpdated || 'FEBRUARY 21, 2026'}
            </p>
          </div>
        </header>

        <main className="px-3 md:px-8 max-w-full mx-auto text-left">
          {loading ? (
            <div className="animate-pulse font-bold">LOADING_CONTENT...</div>
          ) : (
            faqs.map((item) => {
              // Deteksi jika item adalah tabel brutalist
              if (item.type === 'table') {
                try {
                  const tableData = JSON.parse(item.content);
                  return (
                    <BrutalTable 
                      key={item.id}
                      title={item.title}
                      headers={tableData.headers}
                      rows={tableData.rows}
                    />
                  );
                } catch (e) {
                  return (
                    <div key={item.id} className="p-4 border border-black text-red-600 font-bold mb-10 uppercase text-xs">
                      Error_Parsing_Table_Data
                    </div>
                  );
                }
              }

              // Default render sebagai kartu FAQ
              return (
                <TermCard key={item.id} number={item.section_id || ''} title={item.title}>
                  <div 
                    className="prose max-w-none prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.content }} 
                  />
                </TermCard>
              );
            })
          )}

          
        </main>
        <div className="h-40 md:h-60 bg-transparent" />
      </div>
    </div>
  );
};

export default FAQ;