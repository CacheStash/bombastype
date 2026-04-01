/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ArticleData {
  title: string;
  category: string;
  date: string;
  readTime: string;
  content: string;
  type: string;
}

const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

// Brutalist Table Component
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

const InsightDetail: React.FC = () => {
  const { id } = useParams();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const { data } = await supabase
          .from('site_content')
          .select('*')
          .eq('category', 'insights')
          .eq('section_id', id)
          .single();
        
        if (data) {
          // Logika Penanganan Tipe Berbeda
          if (data.type === 'auto') {
            // Tipe Auto: HTML Mentah + JSON di akhir
            setArticle({
              title: data.title,
              category: data.category,
              date: 'LATEST_UPDATE', // Default jika tidak ada di JSON
              readTime: '5_MIN_READ', 
              content: data.content,
              type: 'auto'
            });
          } else {
            // Tipe Legacy/JSON: Seluruh content adalah objek JSON
            try {
              const parsed = JSON.parse(data.content);
              setArticle({
                title: data.title,
                category: data.category,
                date: parsed.date || 'N/A',
                readTime: parsed.readTime || 'N/A',
                content: parsed.body || data.content,
                type: data.type || 'page'
              });
            } catch (e) {
              // Fallback jika bukan JSON tapi tipe bukan auto
              setArticle({
                title: data.title,
                category: data.category,
                date: 'N/A',
                readTime: 'N/A',
                content: data.content,
                type: 'page'
              });
            }
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
      <div className="font-black animate-pulse uppercase tracking-widest text-xs">Recalling_Data_Stream...</div>
    </div>
  );
  
  if (!article) return <Navigate to="/insights" />;

  return (
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden uppercase">
      {/* VIBRANT BACKGROUND ORBS */}
      <div className="grain-orb-base orb-top-right -z-10! pointer-events-none" />
      <div className="grain-orb-base orb-bottom-left -z-10! pointer-events-none" />
      <div className="grain-orb-base orb-top-right top-auto! bottom-0! -right-[10%]! bg-red-600/20! -z-10! pointer-events-none" />

      <div className="w-full relative z-10">
        <header className="px-6 py-16 md:px-8 border-b border-black mb-12 bg-transparent">
          <Link to="/insights" className="inline-flex items-center gap-2 text-[10px] font-normal hover:underline mb-12">
            <ArrowLeft size={14} /> BACK_TO_LAB
          </Link>
          <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85]">{article.title}</h2>
        </header>

        <main className="px-3 md:px-8 max-w-full mx-auto">
          <div className="w-full border border-black bg-white relative z-10 mb-20">
            <div className="border-b border-black p-6 md:p-10 bg-white flex flex-col md:flex-row justify-between gap-4">
               <span className="text-[10px] font-black tracking-[0.3em] text-orange-600 uppercase">{article.category}</span>
               <div className="flex gap-6 text-[10px] font-bold opacity-40">
                  <span className="flex items-center gap-2"><Calendar size={12}/> {article.date}</span>
                  <span className="flex items-center gap-2"><Clock size={12}/> {article.readTime}</span>
               </div>
            </div>
            <div className="p-6 md:p-14 space-y-10 normal-case text-gray-800 leading-relaxed text-base md:text-xl">
              <div className="flex gap-6 items-start">
                <PlusBullet />
                <div className="w-full space-y-8 text-justify">
                  {(() => {
                    // Logika Parser untuk Tipe AUTO atau Konten yang mengandung JSON Table
                    const jsonStartIndex = article.content.indexOf('{');
                    if (jsonStartIndex !== -1) {
                      const textPart = article.content.substring(0, jsonStartIndex).trim();
                      const jsonPart = article.content.substring(jsonStartIndex).trim();
                      try {
                        const tableData = JSON.parse(jsonPart);
                        return (
                          <>
                            {textPart && <div dangerouslySetInnerHTML={{ __html: textPart }} className="space-y-6" />}
                            <BrutalTable 
                              headers={tableData.headers} 
                              rows={tableData.rows} 
                              title={tableData.title} 
                            />
                          </>
                        );
                      } catch (e) {
                        // Jika JSON gagal di-parse, tampilkan konten mentah
                        return <div dangerouslySetInnerHTML={{ __html: article.content }} className="space-y-6" />;
                      }
                    }
                    // Render standar jika tidak ada JSON
                    return <div dangerouslySetInnerHTML={{ __html: article.content }} className="space-y-6" />;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InsightDetail;