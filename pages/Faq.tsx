/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  section_id: string;
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
      className="space-y-6 [&_p]:text-base [&_p]:md:text-lg [&_p]:leading-relaxed [&_div]:flex [&_div]:gap-6 [&_div]:items-start [&_span]:font-bold"
    />
  );
};

const FaqTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
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
                <td key={j} className="p-3 border-r border-vintage-ink/10 last:border-0 text-sm text-vintage-ink/80 leading-relaxed">
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
    const dates = items
      .map((i) => (i.updated_at ? new Date(i.updated_at).getTime() : 0))
      .filter((d) => d > 0);
    if (!dates.length) return '';
    return new Date(Math.max(...dates)).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  };

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data } = await supabase
          .from('site_content')
          .select('*')
          .eq('category', 'faq')
          .order('sort_order', { ascending: true });

        if (data) {
          setFaqs(data);
          setLastUpdated(formatLastUpdated(data));
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const FaqCard: React.FC<{
    number: string;
    title: string;
    children: React.ReactNode;
  }> = ({ number, title, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6 }}
      className="mb-12 md:mb-16 w-full relative z-10"
    >
      <div className="mb-4">
        <h3 className="text-2xl md:text-5xl font-display leading-tight tracking-tight mb-4">
          <span className="opacity-40 mr-3 md:mr-6">{number}</span>
          {title}
        </h3>
      </div>
      <hr className="w-full border-vintage-ink/30 mb-6 md:mb-8" />
      <div className="space-y-6 text-base md:text-lg leading-relaxed text-vintage-ink">
        {children}
      </div>
    </motion.div>
  );

  return (
    <div className="pb-12 relative z-10">
      {/* Hero Section */}
      <section className="text-center mb-16 md:mb-24 max-w-3xl mx-auto relative z-10 px-4 pt-12">
        <motion.p className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4">
          Clarity & Support
        </motion.p>
        <motion.h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight">
          Frequently Asked Questions
        </motion.h2>
        <motion.p className="text-base md:text-lg lg:text-xl italic text-vintage-ink/60 leading-relaxed">
          Clarity for Your Creative Workflow & Technical Requirements.
        </motion.p>
      </section>

      {/* Content Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        {loading ? (
          <div className="animate-pulse font-bold text-vintage-ink">SYNCING_SUPPORT_RECORDS...</div>
        ) : (
          faqs.map((item, index) => (
            <FaqCard
              key={item.id}
              number={item.section_id || String(index + 1).padStart(2, '0')}
              title={item.title}
            >
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
                            {textPart && (
                              textPart.includes('<') ? transformHTMLContent(textPart) : 
                              <p className="text-base md:text-lg leading-relaxed">{textPart}</p>
                            )}
                            <FaqTable headers={tableData.headers} rows={tableData.rows} />
                          </div>
                        );
                      } catch (e) {
                        console.error("FAQ auto-type parsing error:", e);
                      }
                    }
                  }

                  if (item.type === 'table') {
                    try {
                      const tableData = JSON.parse(item.content);
                      return <FaqTable headers={tableData.headers} rows={tableData.rows} />;
                    } catch (e) {
                      return <div className="text-red-500 font-bold text-sm">Error rendering table</div>;
                    }
                  }

                  return item.content.includes('<') ? (
                    transformHTMLContent(item.content)
                  ) : (
                    <div className="space-y-4">
                      {item.content.split('\n').map((paragraph, i) => (
                        paragraph.trim() && (
                          <p key={i} className="text-base md:text-lg leading-relaxed text-vintage-ink/80">
                            {paragraph.trim()}
                          </p>
                        )
                      ))}
                    </div>
                  );
                })()
              )}
            </FaqCard>
          ))
        )}
      </section>

      {/* Last Updated Footer */}
      <section className="text-center py-12 px-4 border-t border-vintage-ink/20">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-vintage-ink/60">
          Last Updated: {lastUpdated || 'FEBRUARY 21, 2026'}
        </p>
      </section>
    </div>
  );
};

export default FAQ;