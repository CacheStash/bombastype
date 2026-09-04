import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Type, ShoppingCart, LogOut, 
  Tag, Menu, X, Mail, FileText, Power, Loader2, CreditCard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Globe } from 'lucide-react';
import WebAnalytics from './WebAnalytics';
// Content Components
import ProductManager from './ProductManager';
import ContentManager from './ContentManager';
import PromotionsManager from './PromotionsManager'; 
import Orders from './Orders';
import Statistics from './Statistics';
import AdminMessages from './AdminMessages';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Settings states
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [updatingSandbox, setUpdatingSandbox] = useState(false);

  // --- LOGIC ---

  useEffect(() => {
    fetchUnreadCount();
    fetchSiteSettings();
  }, []);

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value');
      
      if (data) {
        data.forEach((setting: any) => {
          if (setting.key === 'maintenance_mode') {
            setIsMaintenance(setting.value === true || setting.value === 'true');
          }
          if (setting.key === 'paypal_sandbox_mode') {
            setIsSandbox(setting.value === true || setting.value === 'true');
          }
        });
      }
    } catch (e) {
      console.error('Failed to fetch site settings:', e);
    }
  };

  const handleToggleMaintenance = async () => {
    const nextState = !isMaintenance;
    const confirmMsg = nextState 
      ? 'Aktifkan MODE MAINTENANCE? Pengunjung umum tidak akan bisa membuka situs (hanya admin).'
      : 'Matikan MODE MAINTENANCE? Situs akan kembali dapat diakses oleh publik.';
    
    if (!window.confirm(confirmMsg)) return;

    setUpdatingMaintenance(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'maintenance_mode',
          value: nextState,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setIsMaintenance(nextState);
    } catch (err: any) {
      alert('Gagal mengubah mode maintenance: ' + err.message);
    } finally {
      setUpdatingMaintenance(false);
    }
  };

  const handleToggleSandbox = async () => {
    const nextState = !isSandbox;
    const confirmMsg = nextState 
      ? 'Aktifkan PAYPAL SANDBOX MODE untuk testing transaksi?'
      : 'Beralih ke PAYPAL LIVE MODE untuk menerima transaksi nyata?';
    
    if (!window.confirm(confirmMsg)) return;

    setUpdatingSandbox(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'paypal_sandbox_mode',
          value: nextState,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setIsSandbox(nextState);
    } catch (err: any) {
      alert('Gagal mengubah mode PayPal: ' + err.message);
    } finally {
      setUpdatingSandbox(false);
    }
  };

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
    { id: 'analytics', label: 'Web Analytics', icon: Globe },
  ];

  
  // --- RENDER HELPERS ---

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'stats': return <Statistics />;
      case 'inbox': return <AdminMessages />;
      case 'products': return <ProductManager />;
      case 'promotions': return <PromotionsManager />;
      case 'orders': return <Orders />;
      case 'content': return <ContentManager />;
      case 'analytics': return <WebAnalytics />;
      default: return <ProductManager />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-vintage-paper text-vintage-ink font-serif selection:bg-vintage-ink selection:text-vintage-paper transition-colors duration-500">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-vintage-ink bg-vintage-paper sticky top-12.25 z-50">
        <h1 className="font-blackletter text-2xl tracking-tight leading-none">Studio Admin</h1>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
          className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* NAVIGATION SIDEBAR */}
      <aside className={`
        fixed md:sticky md:top-12.25 w-full md:w-72 border-r-0 md:border-r border-vintage-ink bg-vintage-paper flex flex-col transition-all duration-300 z-40
        ${isMenuOpen 
          ? 'top-27.25 h-[calc(100vh-109px)] border-b border-vintage-ink'
          : '-top-full md:top-0 h-0 md:h-screen overflow-hidden md:overflow-visible'}
      `}>
        {/* Desktop Branding */}
        <div className="p-10 border-b border-vintage-ink hidden md:block">
          <h1 className="font-blackletter text-5xl tracking-tight leading-none">Studio Admin</h1>
        </div>
        
        {/* Nav Links */}
        <nav className="grow p-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => handleTabChange(item.id)} 
                className={`w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold tracking-wider transition-all text-left group ${
                  isActive ? 'bg-vintage-ink text-vintage-paper border border-vintage-ink' : 'bg-transparent hover:bg-vintage-ink/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'} />
                <span className="grow">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`
                    text-[8px] px-1.5 py-0.5 rounded-full font-black 
                    ${isActive ? 'bg-vintage-paper text-vintage-ink' : 'bg-vintage-ink text-vintage-paper'}
                  `}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout & Control Toggles */}
        <div className="p-6 border-t border-vintage-ink space-y-2">
          {/* Maintenance Toggle */}
          <button
            onClick={handleToggleMaintenance}
            disabled={updatingMaintenance}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold tracking-wider transition-all border ${
              isMaintenance 
                ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700' 
                : 'bg-vintage-ink/5 text-vintage-ink border-vintage-ink/20 hover:bg-vintage-ink/10'
            }`}
            title="Ubah status maintenance situs"
          >
            <div className="flex items-center gap-2">
              {updatingMaintenance ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Power size={14} className={isMaintenance ? 'text-white animate-pulse' : 'opacity-40'} />
              )}
              <span>MAINTENANCE</span>
            </div>
            <span className={`px-1.5 py-0.5 text-[9px] font-black tracking-widest ${
              isMaintenance ? 'bg-white text-amber-900' : 'bg-vintage-ink text-vintage-paper'
            }`}>
              {isMaintenance ? 'ACTIVE' : 'OFF'}
            </span>
          </button>

          {/* PayPal Sandbox Toggle */}
          <button
            onClick={handleToggleSandbox}
            disabled={updatingSandbox}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold tracking-wider transition-all border ${
              isSandbox 
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' 
                : 'bg-vintage-ink/5 text-vintage-ink border-vintage-ink/20 hover:bg-vintage-ink/10'
            }`}
            title="Ubah mode Sandbox / Live PayPal"
          >
            <div className="flex items-center gap-2">
              {updatingSandbox ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CreditCard size={14} className={isSandbox ? 'text-white' : 'opacity-40'} />
              )}
              <span>PAYPAL MODE</span>
            </div>
            <span className={`px-1.5 py-0.5 text-[9px] font-black tracking-widest ${
              isSandbox ? 'bg-white text-blue-900' : 'bg-vintage-ink text-vintage-paper'
            }`}>
              {isSandbox ? 'SANDBOX' : 'LIVE'}
            </span>
          </button>

          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold tracking-wider text-left hover:bg-red-900/10 text-red-900/60 transition-all group"
          >
            <LogOut size={16} className="opacity-30 group-hover:opacity-100" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="grow p-8 md:p-16 w-full min-w-0 bg-vintage-paper min-h-screen overflow-x-hidden">
        {renderActiveContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;