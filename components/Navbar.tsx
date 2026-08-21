/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, User, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface NavbarProps {
  onStateChange?: (isActive: boolean) => void;
}

const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/api/images/${filename}`; 
};

const Navbar = ({ onStateChange }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  const location = useLocation();
  const { cartCount } = useCart();

  const navLinks = [
    { name: "FONTS", href: "/fonts" },
    { name: "LICENSE", href: "/license" },
    { name: "ABOUT", href: "/about" },
    { name: "CONTACT", href: "/contact" },
    { name: "POLICY", href: "/policy" },
    { name: "FAQ", href: "/faq" },
    { name: "INSIGHTS", href: "/insights" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('v_global_search')
      .select('*')
      .ilike('search_text', `%${query}%`)
      .limit(15);
    
    if (data) {
      // Mengurutkan: Font selalu di atas (type === 'font')
      const prioritized = [...data].sort((a, b) => {
        if (a.type === 'font' && b.type !== 'font') return -1;
        if (a.type !== 'font' && b.type === 'font') return 1;
        return 0;
      });
      setSuggestions(prioritized);
    } else {
      setSuggestions([]);
    }
  };


  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      // Hysteresis yang lebih lebar untuk mencegah flickering di threshold
      if (scrollPos > 140) {
        setIsScrolled(true);
      } else if (scrollPos < 20) {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (onStateChange) onStateChange(isMobileMenuOpen || isSearchOpen);
  }, [isMobileMenuOpen, isSearchOpen, onStateChange]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  return (
    <>
      {/* 1. STATIC LOGO HEADER - Stabilized height container */}
      <motion.div 
        initial={false}
        animate={{ 
          height: isScrolled ? 0 : 'auto', 
          opacity: isScrolled ? 0 : 1 
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden relative z-50 bg-vintage-paper"
      >
        <header className="text-center pt-6 pb-12">
          <Link to="/" className="inline-flex items-center justify-center gap-6 hover:opacity-80 transition-opacity">
            <div className="h-px w-12 bg-vintage-ink"></div>
            <img 
              src="/LogoBombastype.png" 
              alt="Bombastype" 
              className="h-10 md:h-14 lg:h-16 w-auto object-contain" 
            />
            <div className="h-px w-12 bg-vintage-ink"></div>
          </Link>
        </header>
      </motion.div>

      {/* 2. NAVIGATION BAR */}
      <nav className={`w-full sticky top-0 z-100 transition-all duration-300 py-2 ${
        isScrolled 
          ? "bg-vintage-paper/95 backdrop-blur-md border-b border-vintage-ink shadow-sm" 
          : "bg-vintage-paper border-y border-vintage-ink"
      }`}>
        <div className="flex items-center px-4 md:px-8 max-w-7xl mx-auto h-8">
          
          {/* SISI KIRI: LOGO (Mode Floating) & Menu Mobile */}
          <div className="flex-none flex items-center">
            <AnimatePresence>
              {isScrolled && (
                <motion.div
                  key="floating-logo"
                  initial={{ opacity: 0, x: -20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -20, filter: "blur(8px)" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="mr-6 pr-6 border-r border-vintage-ink"
                >
                  <Link to="/" className="inline-flex items-center">
                    <img 
                      src="/LogoBombastype.png" 
                      alt="Bombastype" 
                      className="h-5 w-auto object-contain" 
                    />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="lg:hidden mr-6 text-vintage-ink" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* TENGAH: NAV LINKS */}
          <div className="hidden lg:flex gap-x-6 flex-none">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.href} 
                className="text-[9px] uppercase tracking-[0.2em] font-bold text-vintage-ink hover:text-vintage-accent transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* SISI KANAN: SEARCH & ACTIONS */}
          <div className="flex-1 flex items-center justify-end gap-4 md:gap-6 text-vintage-ink">
            
            {/* Search Module */}
            <div className="relative flex-1 flex justify-end max-w-lg lg:ml-8">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="overflow-hidden flex justify-end"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="SEARCH..."
                      className="bg-transparent border-b border-vintage-ink text-[10px] tracking-widest outline-none px-2 w-full uppercase"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="flex-none hover:text-vintage-accent ml-2 transition-transform active:scale-90">
                {isSearchOpen ? <X size={18} /> : <Search size={18} />}
              </button>
              
              {isSearchOpen && suggestions.length > 0 && (
                <div className="absolute top-full right-0 mt-4 w-80 md:w-112.5 bg-vintage-paper border border-vintage-ink shadow-2xl p-0 z-50 animate-in fade-in slide-in-from-top-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  {(() => {
                    // 1. Logika Grouping Dinamis berdasarkan Path
                    const groups: Record<string, any[]> = {};
                    suggestions.forEach(item => {
                      let category = 'Archive';
                      if (item.type === 'font') {
                        category = 'Fonts';
                      } else {
                        const pathName = item.path.replace(/^\//, '').split('/')[0];
                        category = pathName ? pathName.charAt(0).toUpperCase() + pathName.slice(1) : 'Studio';
                      }
                      if (!groups[category]) groups[category] = [];
                      groups[category].push(item);
                    });

                    // 2. Render Groups (Fonts Selalu Pertama)
                    return Object.keys(groups)
                      .sort((a,b) => a === 'Fonts' ? -1 : b === 'Fonts' ? 1 : a.localeCompare(b))
                      .map(groupName => (
                        <div key={groupName} className="flex flex-col border-b border-vintage-ink/10 last:border-b-0">
                          {/* Label Kategori - Heritage Style */}
                          <div className="bg-vintage-ink/3 px-6 py-2 border-b border-vintage-ink/5">
                            <span className="text-[9px] font-bold tracking-[0.4em] text-vintage-accent uppercase italic">{groupName}</span>
                          </div>

                          <div className="divide-y divide-vintage-ink/5">
                            {groups[groupName].map((item, idx) => (
                              <Link 
                                key={idx} 
                                to={item.path} 
                                className="group/item block p-6 hover:bg-vintage-ink/5 transition-all"
                                onClick={() => setIsSearchOpen(false)}
                              >
                                <div className="flex flex-col gap-4">
                                  <div className="flex justify-between items-center">
                                    {/* Judul tidak lagi uppercase, menggunakan font-display */}
                                    <span className="text-lg md:text-xl font-display leading-none text-vintage-ink group-hover/item:text-vintage-accent transition-colors">
                                      {item.title}
                                    </span>
                                    <ArrowRight size={16} className="opacity-0 group-hover/item:opacity-100 -translate-x-4 group-hover/item:translate-x-0 transition-all text-vintage-accent" />
                                  </div>
                                  
                                  {/* 3 Thumbnail Heritage Style */}
                                  {item.type === 'font' && (
                                    <div className="flex gap-2 h-16">
                                      {(() => {
                                        const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                                        const images = item.font_images || meta?.preview_images || [];
                                        
                                        return images.slice(0, 3).map((img: string, i: number) => (
                                          <div key={i} className="flex-1 bg-white/20 border border-vintage-ink/10 p-1.5 overflow-hidden group-hover/item:border-vintage-accent/20 transition-colors">
                                            <img 
                                              src={resolvePreviewUrl(img) || ''} 
                                              className="w-full h-full object-contain grayscale group-hover/item:grayscale-0 transition-all duration-700 opacity-70 group-hover/item:opacity-100 scale-105 group-hover/item:scale-100" 
                                              alt="preview" 
                                            />
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              )}
            </div>

            {/* Account Module */}
            <div 
              className="relative flex items-center h-full"
              onMouseEnter={() => user && setIsAccountDropdownOpen(true)}
              onMouseLeave={() => setIsAccountDropdownOpen(false)}
            >
              <Link to={user ? "/user/dashboard" : "/user/auth"} className="flex-none flex items-center gap-2 hover:text-vintage-accent transition-colors">
                <User size={18} />
                <span className="hidden sm:inline text-[9px] font-bold tracking-[0.2em]">{user ? "ACCOUNT" : "LOGIN"}</span>
              </Link>

              <AnimatePresence>
                {user && isAccountDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-4 w-40 bg-vintage-paper border border-vintage-ink shadow-xl z-50 flex flex-col overflow-hidden"
                  >
                    <Link 
                      to="/user/dashboard" 
                      className="px-4 py-3 text-[10px] font-bold tracking-widest text-vintage-ink bg-transparent hover:bg-vintage-ink hover:text-vintage-paper! transition-colors border-b border-vintage-ink/10 block"
                      onClick={() => setIsAccountDropdownOpen(false)}
                    >
                      DASHBOARD
                    </Link>
                    <button 
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setIsAccountDropdownOpen(false);
                      }}
                      className="px-4 py-3 text-[10px] font-bold tracking-widest text-vintage-ink bg-transparent hover:bg-vintage-ink hover:text-vintage-paper! transition-colors text-left w-full cursor-pointer block border-none outline-none"
                    >
                      LOGOUT
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cart Module */}
            <Link to="/cart" className="flex-none relative hover:text-vintage-accent transition-colors">
              <ShoppingCart size={18} />
              <span className="absolute -top-2 -right-2 bg-vintage-ink text-vintage-paper text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute top-full left-0 w-full bg-vintage-paper border-b border-vintage-ink p-6 flex flex-col gap-6 lg:hidden z-40 shadow-lg"
            >
              {navLinks.map((link) => (
                <Link key={link.name} to={link.href} className="text-xs uppercase tracking-[0.3em] font-bold text-vintage-ink flex justify-between items-center group">
                  {link.name} <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;