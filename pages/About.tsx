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
  category: string;
  type: string;
  updated_at?: string;
}

const transformHTMLContent = (html: string): React.ReactNode => {
  // Replace old Tailwind classes with vintage color scheme
  let transformed = html
    // Colors
    .replace(/text-black/g, 'text-vintage-ink')
    .replace(/text-gray-600/g, 'text-vintage-ink/70')
    .replace(/text-gray-400/g, 'text-vintage-ink/50')
    // Font sizes - normalize to design system
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

const About: React.FC = () => {
  const [aboutSections, setAboutSections] = useState<ContentItem[]>([]);
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
    const fetchAbout = async () => {
      try {
        const { data } = await supabase
          .from('site_content')
          .select('*')
          .eq('category', 'about')
          .order('sort_order', { ascending: true });

        if (data) {
          setAboutSections(data);
          setLastUpdated(formatLastUpdated(data));
        }
      } catch (err) {
        console.error('Failed to fetch about content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  const AboutCard: React.FC<{
    number: string;
    title: string;
    category: string;
    children: React.ReactNode;
  }> = ({ number, title, category, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6 }}
      className="mb-12 md:mb-16 w-full relative z-10"
    >
      {/* Title with Number */}
      <div className="mb-4">
        <h3 className="text-2xl md:text-5xl font-display leading-tight tracking-tight mb-4">
          <span className="opacity-40 mr-3 md:mr-6">{number}</span>
          {title}
        </h3>
      </div>

      {/* HR Line */}
      <hr className="w-full border-vintage-ink/30 mb-6 md:mb-8" />

      {/* Content Section */}
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
          Our Story & Mission
        </motion.p>
        <motion.h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight">
          About BombasType
        </motion.h2>
        <motion.p className="text-base md:text-lg lg:text-xl italic opacity-80 mb-6 leading-relaxed">
          Authentic vintage typefaces crafted for timeless design and letterpress tradition.
        </motion.p>
      </section>

      {/* Content Section */}
      <section className="mb-16 md:mb-24 relative z-10 px-4">
        <div>
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-vintage-ink/5 animate-pulse border border-vintage-ink/20" />
              ))}
            </div>
          ) : aboutSections.length > 0 ? (
            aboutSections.map((item, index) => {
              if (item.type === 'special_footer') {
                try {
                  const data = JSON.parse(item.content);
                  return (
                    <motion.section
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-100px' }}
                      transition={{ duration: 0.6 }}
                      className="mt-16 md:mt-24 w-full border border-vintage-ink bg-vintage-ink text-vintage-paper p-10 md:p-16 relative z-10 overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-vintage-accent/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                      <div className="relative z-10 space-y-8">
                        {data.italic_text && (
                          <h3 className="text-4xl md:text-6xl font-display tracking-tight uppercase italic leading-tight">
                            {data.italic_text}
                          </h3>
                        )}
                        {data.body_text && (
                          <p className="text-base md:text-lg normal-case text-vintage-paper/90 font-normal leading-relaxed max-w-3xl">
                            {data.body_text}
                          </p>
                        )}
                        {data.location && (
                          <div className="pt-6">
                            <p className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-vintage-accent">
                              {data.location}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.section>
                  );
                } catch (e) {
                  console.error('Failed to parse special footer:', e);
                  return null;
                }
              }

              return (
                <AboutCard
                  key={item.id}
                  number={String(index + 1).padStart(2, '0')}
                  category={item.category || 'About'}
                  title={item.title}
                >
                  {item.content && (
                    item.content.includes('<') ? (
                      transformHTMLContent(item.content)
                    ) : (
                      <div className="space-y-4">
                        {item.content.split('\n').map((paragraph, i) => (
                          paragraph.trim() && (
                            <p key={i} className="text-base md:text-lg leading-relaxed">
                              {paragraph.trim()}
                            </p>
                          )
                        ))}
                      </div>
                    )
                  )}
                </AboutCard>
              );
            })
          ) : (
            <div className="text-center py-12 text-vintage-ink/60">
              No content available
            </div>
          )}
        </div>
      </section>

      {/* Last Updated Footer */}
      <section className="text-center py-12 px-4 border-t border-vintage-ink/20 relative z-10">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-vintage-ink/60">
          Last Updated: {lastUpdated || 'N/A'}
        </p>
      </section>
    </div>
  );
};

export default About;