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
          <Link to="/" className="inline-flex items-center justify-center gap-6 hover:opacity-70 transition-opacity">
            <div className="h-px w-12 bg-vintage-ink"></div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-blackletter tracking-tighter text-vintage-ink">
              Type & Heritage
            </h1>
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
                  <Link to="/" className="text-xl font-blackletter tracking-tighter text-vintage-ink whitespace-nowrap">
                    Type & Heritage
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
                <div className="absolute top-full right-0 mt-4 w-72 md:w-100 bg-vintage-paper border border-vintage-ink shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {['font', 'page'].map((groupType) => {
                    const groupItems = suggestions.filter(item => item.type === groupType);
                    if (groupItems.length === 0) return null;

                    return (
                      <div key={groupType} className="mb-6 last:mb-0">
                        <h5 className="text-[8px] font-bold tracking-[0.4em] text-vintage-accent uppercase mb-3 border-b border-vintage-ink/10 pb-1">
                          {groupType === 'font' ? 'Heritage Fonts' : 'Studio Pages'}
                        </h5>
                        <div className="space-y-4">
                          {groupItems.map((item, idx) => (
                            <Link 
                              key={idx} 
                              to={item.path} 
                              className="group/item block"
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold uppercase tracking-widest group-hover/item:text-vintage-accent transition-colors">
                                    {item.title}
                                  </span>
                                  <ArrowRight size={12} className="opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all text-vintage-accent" />
                                </div>
                                
                                {/* 3 Thumbnail Preview khusus Font */}
                                {groupType === 'font' && item.metadata?.preview_images && (
                                  <div className="flex gap-1.5 h-12">
                                    {item.metadata.preview_images.slice(0, 3).map((imgId: string, i: number) => (
                                      <div key={i} className="flex-1 bg-vintage-ink/5 border border-vintage-ink/10 overflow-hidden">
                                        <img 
                                          src={`/api/images/${imgId}`} 
                                          className="w-full h-full object-cover grayscale group-hover/item:grayscale-0 transition-all duration-500 scale-110 group-hover/item:scale-100" 
                                          alt="preview" 
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {groupType === 'page' && (
                                  <p className="text-[10px] italic opacity-50 line-clamp-1 font-serif">
                                    View details and archival information...
                                  </p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                      className="px-4 py-3 text-[10px] font-bold tracking-widest hover:bg-vintage-ink hover:text-vintage-paper transition-colors border-b border-vintage-ink/10"
                      onClick={() => setIsAccountDropdownOpen(false)}
                    >
                      DASHBOARD
                    </Link>
                    <button 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setIsAccountDropdownOpen(false);
                      }}
                      className="px-4 py-3 text-[10px] font-bold tracking-widest hover:bg-vintage-ink hover:text-vintage-paper transition-colors text-left w-full"
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