import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Type, ShoppingCart, LogOut, Tag, Menu, X, Mail, FileText } from 'lucide-react';
import ProductManager from './ProductManager';
import ContentManager from './ContentManager';
import PromotionsManager from './PromotionsManager'; 
import Orders from './Orders';
import Statistics from './Statistics';
import AdminMessages from './AdminMessages';
import { supabase } from '../../lib/supabase';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
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

  const navItems = [
    { id: 'stats', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox & Messages', icon: Mail, badge: unreadCount },
    { id: 'products', label: 'Typeface Inventory', icon: Type },
    { id: 'promotions', label: 'Promotional Deals', icon: Tag },
    { id: 'orders', label: 'Customer Orders', icon: ShoppingCart },
    { id: 'content', label: 'Site Content', icon: FileText },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-vintage-paper text-vintage-ink font-serif selection:bg-vintage-ink selection:text-vintage-paper transition-colors duration-500">
      
      {/* MOBILE ADMIN NAV */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-vintage-ink bg-vintage-paper sticky top-0 z-50">
        <h1 className="font-blackletter text-2xl tracking-tight leading-none">Studio Admin</h1>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
       fixed md:sticky md:top-0 w-full md:w-72 border-r-0 md:border-r border-vintage-ink bg-vintage-paper flex flex-col transition-all duration-300 z-40
        ${isMenuOpen ? 'top-16.25 h-[calc(100vh-(--spacing(16)))] border-b border-vintage-ink' : '-top-full md:top-0 h-0 md:h-screen overflow-hidden md:overflow-visible'}
      `}>
        <div className="p-10 border-b border-vintage-ink hidden md:block">
          <h1 className="font-blackletter text-5xl tracking-tight leading-none">Studio Admin</h1>
        </div>
        
        <nav className="grow p-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => handleTabChange(item.id)} 
                className={`w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold tracking-wider transition-all text-left group border ${
                  isActive ? 'bg-vintage-ink text-vintage-paper border-vintage-ink' : 'bg-transparent border-transparent hover:bg-vintage-ink/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'} />
                <span className="grow">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-vintage-paper text-vintage-ink' : 'bg-vintage-ink text-vintage-paper'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-vintage-ink">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold tracking-wider text-left hover:bg-red-900/10 text-red-900/60 transition-all group"
          >
            <LogOut size={16} className="opacity-30 group-hover:opacity-100" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="grow p-8 md:p-16 w-full max-h-screen overflow-y-auto bg-vintage-paper">
        {activeTab === 'stats' && <Statistics />}
        {activeTab === 'inbox' && <AdminMessages />}
        {activeTab === 'products' && <ProductManager />}
        {activeTab === 'promotions' && <PromotionsManager />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'content' && <ContentManager />}
      </main>
    </div>
  );
};

export default AdminDashboard;