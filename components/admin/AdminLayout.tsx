import React, { useState } from 'react';
import { LayoutDashboard, Type, ShoppingCart, LogOut, Tag, Menu, X, Mail } from 'lucide-react';
import ProductManager from './ProductManager';
import { FileText } from 'lucide-react'; // Icon baru untuk Content
import ContentManager from './ContentManager';
import PromotionsManager from './PromotionsManager'; 
import Orders from './Orders';
import Statistics from './Statistics';
import AdminMessages from './AdminMessages';
import { supabase } from '../../lib/supabase';

import { useEffect } from 'react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Setup realtime listener opsional di sini jika ingin auto-update
  }, []);

  const fetchUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from('font_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Gagal keluar: " + error.message);
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-vintage-paper text-vintage-ink font-serif selection:bg-vintage-ink selection:text-vintage-paper">
      {/* MOBILE ADMIN NAV */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-vintage-ink/10 bg-vintage-paper sticky top-0 z-50">
        <h1 className="font-blackletter uppercase tracking-tighter text-2xl">Studio_Admin</h1>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 border border-vintage-ink/20 hover:bg-vintage-ink hover:text-vintage-paper transition-all"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
        fixed md:sticky md:top-0 w-full md:w-72 border-r-0 md:border-r border-vintage-ink/10 bg-vintage-paper flex flex-col transition-all duration-300 z-40
        ${isMenuOpen ? 'top-[65px] h-[calc(100vh-65px)] border-b border-vintage-ink/10' : 'top-[-100%] md:top-0 h-0 md:h-screen overflow-hidden md:overflow-visible'}
      `}>
        <div className="p-10 border-b border-vintage-ink/10 hidden md:block">
         <h1 className="font-blackletter uppercase tracking-tighter text-3xl">Studio Admin</h1>
         <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mt-2">Heritage Management</p>
        </div>
        
        <nav className="flex-grow p-6 space-y-1">
          <button onClick={() => handleTabChange('stats')} className={`w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] transition-all ${activeTab === 'stats' ? 'bg-vintage-ink text-vintage-paper shadow-xl' : 'hover:bg-vintage-ink/5'}`}>
            <LayoutDashboard size={16} /> Statistics
          </button>
          <button onClick={() => handleTabChange('inbox')} className={`w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] transition-all relative ${activeTab === 'inbox' ? 'bg-vintage-ink text-vintage-paper shadow-xl' : 'hover:bg-vintage-ink/5'}`}>
            <Mail size={16} /> Inbox & Broadcast
            {unreadCount > 0 && (
              <span className="absolute right-4 bg-vintage-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => handleTabChange('products')} className={`w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] transition-all ${activeTab === 'products' ? 'bg-vintage-ink text-vintage-paper shadow-xl' : 'hover:bg-vintage-ink/5'}`}>
            <Type size={16} /> Typeface Archive
          </button>
          <button onClick={() => handleTabChange('promotions')} className={`w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] transition-all ${activeTab === 'promotions' ? 'bg-vintage-ink text-vintage-paper shadow-xl' : 'hover:bg-vintage-ink/5'}`}>
            <Tag size={16} /> Promotions
          </button>
          <button onClick={() => handleTabChange('orders')} className={`w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] transition-all ${activeTab === 'orders' ? 'bg-vintage-ink text-vintage-paper shadow-xl' : 'hover:bg-vintage-ink/5'}`}>
            <ShoppingCart size={16} /> Acquisition
          </button>
          <button onClick={() => handleTabChange('content')} className={`w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] transition-all ${activeTab === 'content' ? 'bg-vintage-ink text-vintage-paper shadow-xl' : 'hover:bg-vintage-ink/5'}`}>
            <FileText size={16} /> Content
          </button>
        </nav>

        <div className="p-6 border-t border-vintage-ink/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-4 font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-red-900/10 text-red-900/60 transition-all cursor-pointer">
            <LogOut size={16} /> Terminate Session
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-8 md:p-16 overflow-x-hidden overflow-y-auto w-full bg-vintage-paper">
        {activeTab === 'products' && <ProductManager />}
        {activeTab === 'promotions' && <PromotionsManager />}
        {activeTab === 'content' && <ContentManager />}
        {activeTab === 'stats' && <Statistics />}
        {activeTab === 'inbox' && <AdminMessages />}
        {activeTab === 'orders' && <Orders />}
      </main>
    </div>
  );
};

export default AdminDashboard;