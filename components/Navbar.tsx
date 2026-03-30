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
    const { data } = await supabase.from('v_global_search').select('*').ilike('search_text', `%${query}%`).limit(8);
    setSuggestions(data || []);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      // Menambahkan Hysteresis: Aktif di 120px, Non-aktif hanya jika scroll balik ke atas 50px
      if (scrollPos > 120) {
        setIsScrolled(true);
      } else if (scrollPos < 50) {
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
      {/* 1. STATIC LOGO HEADER */}
      <AnimatePresence>
        {!isScrolled && (
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-center pt-6 pb-12 relative z-50"
          >
            <Link to="/" className="inline-flex items-center justify-center gap-6 hover:opacity-70 transition-opacity">
              <div className="h-px w-12 bg-vintage-ink"></div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-blackletter tracking-tighter text-vintage-ink">
                Type & Heritage
              </h1>
              <div className="h-px w-12 bg-vintage-ink"></div>
            </Link>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 2. NAVIGATION BAR */}
      <nav className={`w-full sticky top-0 z-100 transition-all duration-300 py-2 ${
        isScrolled 
          ? "bg-vintage-paper/95 backdrop-blur-md border-b" 
          : "relative bg-transparent mb-16 border-y"
      }`}>
        <div className="flex items-center px-4 md:px-8 max-w-7xl mx-auto h-8">
          
          {/* SISI KIRI: LOGO (Mode Floating) & Menu Mobile */}
          <div className="flex-none flex items-center">
            <AnimatePresence>
              {isScrolled && (
                <motion.div
                  initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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

          {/* TENGAH: NAV LINKS (Flex-none agar tidak goyang saat search melebar) */}
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

          {/* SISI KANAN: SEARCH (FLEKSIBEL) & ACTIONS */}
          <div className="flex-1 flex items-center justify-end gap-4 md:gap-6 text-vintage-ink">
            
            {/* Area Search yang Fleksibel */}
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
              
              {/* Overlay Hasil Pencarian */}
              {isSearchOpen && suggestions.length > 0 && (
                <div className="absolute top-full right-0 mt-4 w-64 bg-vintage-paper border border-vintage-ink shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {suggestions.map((item, idx) => (
                    <Link 
                      key={idx} 
                      to={item.path} 
                      className="block p-2 hover:bg-vintage-ink hover:text-vintage-paper text-[10px] uppercase tracking-wider transition-colors"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Akun */}
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

            {/* Tombol Keranjang */}
            <Link to="/cart" className="flex-none relative hover:text-vintage-accent transition-colors">
              <ShoppingCart size={18} />
              <span className="absolute -top-2 -right-2 bg-vintage-ink text-vintage-paper text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>

        {/* Menu Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute top-full left-0 w-full bg-vintage-paper border-b border-vintage-ink p-6 flex flex-col gap-6 lg:hidden z-40"
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