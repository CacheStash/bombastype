import React, { useState, useEffect } from 'react';
import { Library, Settings, LogOut, ArrowLeft, Menu, X, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MyFontsHistory from './MyFontsHistory';
import AccountSettings from './AccountSettings'; 
import UserMessages from './UserMessages'; // Komponen pesan baru

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch data profil & unread messages (Filtered by Registration Date)
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userJoinedAt = user.created_at;
        setUserEmail(user.email || '');
        const { data } = await supabase
          .from('fontbuyer')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.full_name) setFullName(data.full_name);

        // Fetch Unread Messages (Direct + Broadcast Filtered)
        const [{ data: readData }, { data: hiddenData }, { data: messages }] = await Promise.all([
          supabase.from('font_message_reads').select('message_id').eq('user_id', user.id),
          supabase.from('font_message_hides').select('message_id').eq('user_id', user.id),
          supabase.from('font_messages')
            .select('id, recipient_id, is_read, created_at')
            .or(`recipient_id.eq.${user.id},and(recipient_id.is.null,created_at.gte.${userJoinedAt})`)
        ]);

        const rIds = readData?.map(r => r.message_id) || [];
        const hIds = hiddenData?.map(h => h.message_id) || [];
        const count = messages?.filter(m => 
          !hIds.includes(m.id) && 
          (m.recipient_id === null ? !rIds.includes(m.id) : !m.is_read)
        ).length || 0;

        setUnreadCount(count);
      }
    };
    fetchInitialData();
  }, []);

  // Sinkronisasi Sidebar & Content
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Failed to logout: " + error.message);
    } else {
      window.location.href = '/'; 
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-black font-sans uppercase">
      
      {/* MOBILE HEADER - STICKY */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-black bg-white sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[8px] font-black opacity-40 leading-none tracking-widest">USER_PANEL</span>
          <span className="text-xs font-black italic">{activeTab.replace('_', ' ')}</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-black text-white p-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed md:sticky md:top-0 w-full md:w-64 border-r-0 md:border-r border-black bg-white flex flex-col transition-all duration-300 z-40
        ${isMenuOpen ? 'top-[61px] h-[calc(100vh-61px)] border-b border-black shadow-[0px_10px_30px_rgba(0,0,0,0.1)]' : 'top-[-100%] md:top-0 h-0 md:h-screen overflow-hidden md:overflow-visible'}
      `}>
        <div className="p-8 border-b border-black flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-1 text-[10px] font-black opacity-30 hover:opacity-100 transition-opacity">
            <ArrowLeft size={10} /> BACK TO STORE
          </Link>
          <h1 className="font-normal tracking-tighter text-lg md:text-xl italic break-all uppercase">
            Hello,<br />
            {fullName ? fullName.split(' ')[0] : (userEmail ? userEmail.split('@')[0] : 'FELLAS!')}
          </h1>
        </div>
        
        <nav className="flex-grow p-4 space-y-2">
          <button 
            onClick={() => handleTabChange('library')} 
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold text-xs transition-all ${activeTab === 'library' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          >
            <Library size={18} /> My Library
          </button>
          
          <button 
            onClick={() => handleTabChange('inbox')} 
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold text-xs transition-all relative ${activeTab === 'inbox' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          >
            <div className="relative">
              <Mail size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -left-2.5 bg-red-600 text-white text-[7px] font-black px-1 py-0 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            Inbox & Support
          </button>

          <button 
            onClick={() => handleTabChange('settings')} 
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold text-xs transition-all ${activeTab === 'settings' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div className="p-4 border-t border-black">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 font-bold text-xs hover:bg-red-50 text-red-600 transition-all cursor-pointer">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow p-6 md:p-10 overflow-y-auto w-full">
        {activeTab === 'library' && <MyFontsHistory />}
        {activeTab === 'inbox' && <UserMessages />}
        {activeTab === 'settings' && <AccountSettings />}
      </main>
    </div>
  );
};

export default UserDashboard;