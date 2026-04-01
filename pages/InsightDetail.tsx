/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface ArticleData {
  title: string;
  category: string;
  date: string;
  readTime: string;
  content: string;
  type: string;
}

const transformHTMLContent = (html: string): React.ReactNode => {
  let transformed = html
    .replace(/text-black/g, 'text-vintage-ink')
    .replace(/text-gray-600/g, 'text-vintage-ink/70')
    .replace(/text-gray-400/g, 'text-vintage-ink/50')
    .replace(/text-\d+xl/g, 'text-lg md:text-xl')
    .replace(/class="([^"]*)"/g, (match, classes) => {
      const classList = classes
        .split(/\s+/)
        .filter((cls: string) => !cls.startsWith('mb-') && !cls.startsWith('mt-'))
        .join(' ');
      return `class="${classList}"`;
    });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: transformed }}
      className="space-y-4 [&_p]:text-base [&_p]:md:text-lg [&_p]:leading-relaxed [&_p]:font-serif text-vintage-ink/90"
    />
  );
};

const InsightTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="w-full border border-vintage-ink/30 my-10 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-vintage-ink/30 bg-vintage-ink/5">
            {headers.map((h, i) => (
              <th key={i} className="p-4 border-r border-vintage-ink/20 last:border-0 font-bold text-xs uppercase tracking-wider text-vintage-ink/70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-vintage-ink/10 last:border-0 hover:bg-vintage-ink/5">
              {row.map((cell, j) => (
                <td key={j} className="p-4 border-r border-vintage-ink/10 last:border-0 text-sm text-vintage-ink/80 leading-relaxed font-serif">
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
          if (data.type === 'auto') {
            setArticle({
              title: data.title, category: data.category, date: 'LATEST_UPDATE',
              readTime: '5_MIN_READ', content: data.content, type: 'auto'
            });
          } else {
            try {
              const parsed = JSON.parse(data.content);
              setArticle({
                title: data.title, category: data.category, date: parsed.date || 'N/A',
                readTime: parsed.readTime || 'N/A', content: parsed.body || data.content, type: data.type || 'page'
              });
            } catch (e) {
              setArticle({
                title: data.title, category: data.category, date: 'N/A', readTime: 'N/A',
                content: data.content, type: 'page'
              });
            }
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchArticle();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-vintage-paper">
      <div className="font-display italic animate-pulse text-vintage-ink">Recalling_Data_Stream...</div>
    </div>
  );
  
  if (!article) return <Navigate to="/insights" />;

  return (
    <div className="pb-20 relative z-10 text-vintage-ink">
      <header className="px-4 py-12 max-w-3xl mx-auto border-b border-vintage-ink/20 mb-12 text-center">
        <Link to="/insights" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-vintage-accent hover:underline mb-8">
          <ArrowLeft size={14} /> Back to Lab
        </Link>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-7xl font-display mb-8 leading-tight tracking-tight"
        >
          {article.title}
        </motion.h2>
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
          <span className="flex items-center gap-2"><Calendar size={12}/> {article.date}</span>
          <span className="flex items-center gap-2"><Clock size={12}/> {article.readTime}</span>
        </div>
      </header>

      <main className="px-4 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {(() => {
            const jsonStartIndex = article.content.indexOf('{');
            if (jsonStartIndex !== -1) {
              const textPart = article.content.substring(0, jsonStartIndex).trim();
              const jsonPart = article.content.substring(jsonStartIndex).trim();
              try {
                const tableData = JSON.parse(jsonPart);
                return (
                  <div className="space-y-6">
                    {textPart && transformHTMLContent(textPart)}
                    <InsightTable headers={tableData.headers} rows={tableData.rows} />
                  </div>
                );
              } catch (e) { return transformHTMLContent(article.content); }
            }
            return transformHTMLContent(article.content);
          })()}
        </motion.div>
      </main>
    </div>
  );
};

export default InsightDetail;