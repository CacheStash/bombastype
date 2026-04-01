/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
      className="space-y-6 [&_p]:text-base [&_p]:md:text-lg [&_p]:leading-relaxed [&_p]:font-serif [&_div]:flex [&_div]:gap-6 [&_div]:items-start [&_span]:font-bold text-vintage-ink/80"
    />
  );
};

const InsightTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="w-full border border-vintage-ink/30 mb-8 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-vintage-ink/30 bg-vintage-ink/5">
            {headers.map((h, i) => (
              <th key={i} className="p-3 border-r border-vintage-ink/20 last:border-0 font-bold text-xs uppercase tracking-wider text-vintage-ink/70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-vintage-ink/10 last:border-0 hover:bg-vintage-ink/5">
              {row.map((cell, j) => (
                <td key={j} className="p-3 border-r border-vintage-ink/10 last:border-0 text-sm text-vintage-ink/80 leading-relaxed font-serif">
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

const Insights: React.FC = () => {
  const [insights, setInsights] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchInsights = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('category', 'insights')
        .order('sort_order', { ascending: true });
      
      if (data) {
        setInsights(data);
        const dates = data.map(i => i.updated_at ? new Date(i.updated_at).getTime() : 0).filter(d => d > 0);
        if (dates.length) {
          setLastUpdated(new Date(Math.max(...dates)).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          }).toUpperCase());
        }
      }
      setLoading(false);
    };
    fetchInsights();
  }, []);

  const InsightCard: React.FC<{ 
    number: string, 
    title: string, 
    children: React.ReactNode,
    sectionId: string 
  }> = ({ number, title, children, sectionId }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6 }}
      className="mb-12 md:mb-16 w-full relative z-20"
    >
      <div className="mb-4">
        <h3 className="text-2xl md:text-5xl font-display leading-tight tracking-tight mb-4 text-vintage-ink">
          <span className="opacity-40 mr-3 md:mr-6">{number}</span>
          {title}
        </h3>
      </div>
      <hr className="w-full border-vintage-ink/30 mb-6 md:mb-8" />
      <div className="space-y-6">
        <div className="text-vintage-ink">
          {children}
        </div>
        <Link 
          to={`/insight/${sectionId}`} 
          className="inline-flex items-center gap-4 group text-vintage-ink hover:text-vintage-accent transition-colors pt-4 relative z-30"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] border-b border-current pb-1">
            Read Full Insight
          </span>
          <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );

  return (
    <div className="pb-12 relative z-10">
      <section className="text-center mb-16 md:mb-24 max-w-3xl mx-auto relative z-10 px-4 pt-12">
        <motion.p className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4">
          The Type Lab
        </motion.p>
        <motion.h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight text-vintage-ink">
          Typographic Insights
        </motion.h2>
        <motion.p className="text-base md:text-lg lg:text-xl italic text-vintage-ink/60 leading-relaxed">
          Tips, tricks, and technical deep-dives into the world of letterpress and digital type.
        </motion.p>
      </section>

      <main className="px-4 md:px-8 relative z-10">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-vintage-ink/5 animate-pulse border border-vintage-ink/20" />
            ))}
          </div>
        ) : (
          insights.map((item, index) => {
            const displayNum = String(index + 1).padStart(2, '0');
            return (
              <InsightCard key={item.id} number={displayNum} sectionId={item.section_id} title={item.title}>
                {item.content && (
                  (() => {
                    if (item.type === 'auto') {
                      const jsonStartIndex = item.content.indexOf('{');
                      if (jsonStartIndex !== -1) {
                        const textPart = item.content.substring(0, jsonStartIndex).trim();
                        const jsonPart = item.content.substring(jsonStartIndex).trim();
                        try {
                          const tableData = JSON.parse(jsonPart);
                          return (
                            <div className="space-y-8">
                              {textPart && transformHTMLContent(textPart)}
                              <InsightTable headers={tableData.headers} rows={tableData.rows} />
                            </div>
                          );
                        } catch (e) { console.error(e); }
                      }
                    }

                    try {
                      const data = JSON.parse(item.content);
                      return (
                        <p className="text-base md:text-lg leading-relaxed font-serif text-vintage-ink/80">
                          {data.summary}
                        </p>
                      );
                    } catch (e) {
                      return transformHTMLContent(item.content);
                    }
                  })()
                )}
              </InsightCard>
            );
          })
        )}
      </main>

      <section className="text-center py-12 px-4 border-t border-vintage-ink/20 mt-20">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-vintage-ink/60">
          Last Updated: {lastUpdated || 'FEBRUARY 21, 2026'}
        </p>
      </section>
    </div>
  );
};

export default Insights;