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

const Policy: React.FC = () => {
  const [policies, setPolicies] = useState<ContentItem[]>([]);
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
    const fetchPolicies = async () => {
      try {
        const { data } = await supabase
          .from('site_content')
          .select('*')
          .eq('category', 'policy')
          .order('sort_order', { ascending: true });

        if (data) {
          setPolicies(data);
          setLastUpdated(formatLastUpdated(data));
        }
      } catch (err) {
        console.error('Failed to fetch policies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const PolicyCard: React.FC<{
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
          {title.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())}
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
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4"
        >
          Customer Service & Policy
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight"
        >
          Refund & <br className="hidden md:block" /> Exchange Policy
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base md:text-lg lg:text-xl italic text-vintage-ink/60 mb-6 leading-relaxed"
        >
          Software is permanent. Selection should be too. Understanding our license and refund terms.
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
          ) : policies.length > 0 ? (
            policies.map((item, index) => (
              <PolicyCard
                key={item.id}
                number={String(index + 1).padStart(2, '0')}
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
              </PolicyCard>
            ))
          ) : (
            <div className="text-center py-12 text-vintage-ink/60">
              No policies available
            </div>
          )}
        </div>
      </section>

      {/* Last Updated Footer */}
      <section className="text-center py-12 px-4 border-t border-vintage-ink/20 relative z-10">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-vintage-ink/60">
          Last Updated: {lastUpdated || 'FEBRUARY 21, 2026'}
        </p>
      </section>
    </div>
  );
};

export default Policy;