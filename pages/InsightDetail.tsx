import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ArticleData {
  title: string;
  category: string;
  date: string;
  readTime: string;
  content: string;
}

const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

const InsightDetail: React.FC = () => {
  const { id } = useParams();

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'insights')
        .eq('section_id', id)
        .single();
      
      if (data) {
        try {
          const parsed = JSON.parse(data.content);
          setArticle({
            title: data.title,
            category: data.category,
            date: parsed.date,
            readTime: parsed.readTime,
            content: parsed.body
          });
        } catch (e) { console.error("Parse error", e); }
      }
      setLoading(false);
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
      {/* VIBRANT BACKGROUND ORBS - Fixed Back-Layering & Pointer-Events */}
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
                <div 
                  className="w-full space-y-8 text-justify" 
                  dangerouslySetInnerHTML={{ __html: article.content }} 
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InsightDetail;