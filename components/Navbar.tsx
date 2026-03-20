import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  onStateChange?: (isActive: boolean) => void;
}


const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/api/images/${filename}`; 
};

const Navbar: React.FC<NavbarProps> = ({ onStateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const location = useLocation();
  const { cartCount } = useCart();

  const menuItems = ['Fonts', 'License', 'About', 'Contact', 'Policy', 'FAQ', 'Insights'];

  // AUTH LOGIC
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
     await supabase.auth.signOut();
    setIsOpen(false);
  };

    const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Cari di tabel Fonts
      const { data, error } = await supabase
        .from('v_global_search')
        .select('*')
        .ilike('search_text', `%${query}%`)
        .order('type', { ascending: true }) // 'font' (f) akan muncul sebelum 'page' (p)
        .limit(10);
      
      if (error) throw error;
      setSuggestions(data || []);
    } catch (err) {
      console.error("Search Fail:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Reset search saat overlay ditutup
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery('');
      setSuggestions([]);
    }
  }, [isSearchOpen]);

   
  // OVERLAY LOGIC
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isOpen || isSearchOpen);
    }
  }, [isOpen, isSearchOpen, onStateChange]);

  useEffect(() => {
    setIsOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`w-full sticky top-0 z-[100] transition-all duration-300 mb-[-1px] ${
      isScrolled ? 'backdrop-blur-xl bg-[#EDEBE6]/70' : 'bg-[#EDEBE6]'
    }`}>
      
      {/* 1. MAIN BAR */}
      <div className={`w-full flex justify-between items-center h-14 md:h-16 px-0 relative z-[130] border-b border-black transition-colors duration-300 ${
        (isOpen || isSearchOpen) ? 'bg-[#EDEBE6]' : 'bg-transparent'
      }`}>
        
        {/* Left: Toggle & Logo */}
        <div className="flex items-center gap-2 md:gap-4 h-full border-r border-black px-3 md:px-8 flex-1 md:flex-none md:w-[450px] min-w-0">
          <button 
            onClick={() => { setIsOpen(!isOpen); setIsSearchOpen(false); }}
            className="p-1 hover:bg-black hover:text-white transition-colors border border-black md:border-transparent md:hover:border-black shrink-0"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/" className="font-normal tracking-tighter text-xl md:text-2xl uppercase hover:opacity-70 transition-opacity truncate">
            Subqi Studio
          </Link>
        </div>

        {/* Right: Search & Cart */}
        <div className="flex items-center justify-end gap-2 md:gap-4 h-full border-l-0 md:border-l border-black px-3 md:px-8 shrink-0 bg-inherit">
            <button
              onClick={() => { setIsSearchOpen(!isSearchOpen); setIsOpen(false); }}
              className={`p-1 transition-colors border border-transparent ${isSearchOpen ? 'bg-black text-white' : 'hover:bg-black hover:text-white hover:border-black'}`}
            >
               {isSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            <Link 
              to="/cart" 
              className="flex items-center gap-2 font-bold text-xs md:text-sm border border-black px-3 py-1.5 hover:bg-black hover:text-white transition-all whitespace-nowrap uppercase group"
            >
               <Plus size={16} className="shrink-0 group-hover:rotate-90 transition-transform duration-300" />
               <span>CART ({cartCount})</span>
            </Link>
        </div>
      </div>

      {/* 2. SEARCH OVERLAY */}
      <div className={`fixed inset-0 top-0 w-full h-fit bg-[#EDEBE6] z-[120] border-b border-black transition-transform duration-700 cubic-bezier(0.85, 0, 0.15, 1) ${
        isSearchOpen ? 'translate-y-0' : '-translate-y-full'
      }`}>
          <div className="h-14 md:h-16 w-full border-b border-black"></div>
          <div className="p-4 md:p-10 max-w-full">
              <div className="flex items-center w-full gap-0 border border-black bg-transparent overflow-hidden">
                  <div className="p-4 border-r border-black flex items-center justify-center bg-transparent">
                      <Search size={24} className="opacity-50"/>
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="TYPE TO SEARCH ANYTHING AT THIS SITE..." 
                    className="w-full p-4 md:text-2xl font-normal uppercase bg-transparent outline-none placeholder:text-gray-400"
                    autoFocus={isSearchOpen}
                  />
                  <button className="p-4 px-6 hover:bg-black hover:text-white border-l border-black transition-colors md:text-xl font-bold">
                      {isSearching ? '...' : 'SEARCH'}
                  </button>
              </div>

              {/* AUTO-SUGGESTION DROPDOWN */}
              {suggestions.length > 0 && (
                <div className="border-x border-b border-black bg-white divide-y divide-black/10 max-h-[60vh] overflow-y-auto">
                  {suggestions.map((item, index) => (
                    <Link
                      key={index}
                      to={item.path}
                      className="flex items-center justify-between p-4 md:px-8 hover:bg-black hover:text-white transition-all group"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">
                          {item.type === 'page' ? item.category : item.type}
                        </span>
                        <span className="text-xl md:text-3xl font-normal uppercase tracking-tighter leading-none">
                          {item.title}
                        </span>
                        {item.type === 'font' && item.font_images?.[0] && (
                          <div className="mt-4 flex gap-2">
                            {item.font_images.slice(0, 3).map((img: string, i: number) => (
                              <div key={i} className="border border-black/10 bg-[#f9f9f9] p-1 w-fit group-hover:border-white transition-colors">
                                <img 
                                  src={resolvePreviewUrl(img) || ''} 
                                  alt={`${item.title} preview ${i}`} 
                                  className="h-12 md:h-16 w-auto object-contain grayscale-0 group-hover:grayscale transition-all duration-500" 
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={24} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  ))}
                </div>
              )}
              
          </div>
      </div>

      {/* 3. NAVIGATION MENU OVERLAY */}
      <div className={`fixed inset-0 top-0 w-full h-screen bg-[#EDEBE6] z-[110] transition-transform duration-700 cubic-bezier(0.85, 0, 0.15, 1) flex flex-col ${
        isOpen ? 'translate-y-0' : '-translate-y-full'
      }`}>
          <div className="h-14 md:h-16 w-full border-b border-black bg-[#EDEBE6] flex-shrink-0"></div>

          <div className="flex-1 overflow-y-auto pt-0"> 
              {/* FIXED: Menghapus h-full pada mobile agar tidak ada gap antar blok menu */}
              <div className="grid grid-cols-1 lg:grid-cols-2 w-full lg:h-full border-black">
                  
                  {/* Column 1: Items 1-4 */}
                  <div className="flex flex-col border-r-0 lg:border-r border-black">
                      {menuItems.slice(0, 4).map((item) => (
                        <Link 
                          key={item} 
                          to={`/${item.toLowerCase()}`}
                         className="text-3xl lg:text-6xl font-normal uppercase tracking-tighter px-3 lg:px-8 py-6 lg:py-10 border-b border-black hover:bg-black hover:text-white transition-all flex justify-between items-center group"
                        >
                          <span>{item}</span>
                          <ArrowRight size={32} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      ))}
                  </div>

                  {/* Column 2: Items 5-7 + Auth Button */}
                  <div className="flex flex-col">
                      {menuItems.slice(4).map((item) => (
                        <Link 
                          key={item} 
                          to={`/${item.toLowerCase()}`}
                          className="text-3xl lg:text-6xl font-normal uppercase tracking-tighter px-3 lg:px-8 py-6 lg:py-10 border-b border-black hover:bg-black hover:text-white transition-all flex justify-between items-center group"
                        >
                          <span>{item}</span>
                          <ArrowRight size={32} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      ))}

                      {/* Baris ke-4 Kolom Kanan: Login/Logout */}
                      {user ? (
                        <Link 
                          to="/user/dashboard"
                         className="text-3xl lg:text-6xl font-normal uppercase tracking-tighter px-3 lg:px-8 py-6 lg:py-10 border-b border-black hover:bg-black hover:text-white transition-all flex justify-between items-center group"
                        >
                          <span>DASHBOARD</span>
                          <ArrowRight size={32} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      ) : (
                        <Link 
                          to="/user/auth"
                          className="text-3xl lg:text-6xl font-normal uppercase tracking-tighter px-3 lg:px-8 py-6 lg:py-10 border-b border-black hover:bg-black hover:text-white transition-all flex justify-between items-center group"
                        >
                          <span>LOGIN</span>
                          <ArrowRight size={32} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      )}
                      
                      <div className="flex-1 border-b border-black md:border-b-0"></div>
                  </div>
              </div>

    
          </div>
      </div>
    </nav>
  );
};

export default Navbar;