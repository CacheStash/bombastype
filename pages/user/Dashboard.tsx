/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Library, Settings, LogOut, ArrowLeft, Menu, X, Mail, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MyFontsHistory from './MyFontsHistory';
import AccountSettings from './AccountSettings'; 
import UserMessages from './UserMessages';
import AffiliatePortal from './AffiliatePortal';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAffiliateAllowed, setIsAffiliateAllowed] = useState(false);

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

        const isTrainer = user.email?.toLowerCase() === 'gotrainer19@gmail.com';

        // Check Admin Status (Stealth Gate for Affiliate Tab)
        const [{ data: adminCheck }, { data: affCheck }] = await Promise.all([
          supabase.from('fontadmin').select('id').eq('id', user.id).maybeSingle(),
          supabase.from('affiliates').select('id').eq('user_id', user.id).maybeSingle()
        ]);
        const admin = !!adminCheck;
        setIsAdmin(admin);
        setIsAffiliateAllowed(admin || isTrainer || !!affCheck);

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
    <div className="flex flex-col md:flex-row min-h-screen bg-vintage-background text-vintage-ink font-serif selection:bg-vintage-ink selection:text-vintage-paper">
      
      {/* MOBILE HEADER - STICKY VINTAGE STYLE */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-vintage-ink bg-vintage-background sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-vintage-accent leading-none tracking-[0.3em] uppercase">Private Folio</span>
          <span className="text-sm font-display italic capitalize">{activeTab.replace('_', ' ')}</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-vintage-ink p-2 border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper transition-all"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION - HERITAGE STYLE */}
      <aside className={`
        fixed md:sticky md:top-0 w-full md:w-72 border-r-0 md:border-r border-vintage-ink bg-vintage-background flex flex-col transition-all duration-300 z-40
        ${isMenuOpen ? 'top-15.25 h-[calc(100vh-61px)] border-b border-vintage-ink' : '-top-full md:top-0 h-0 md:h-screen overflow-hidden md:overflow-visible'}
      `}>
        <div className="p-8 sm:p-10 border-b border-vintage-ink flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2 text-xs font-bold text-vintage-accent hover:text-vintage-ink transition-colors tracking-wider uppercase font-sans">
            <ArrowLeft size={14} /> Back to Catalog
          </Link>
          <div className="pt-2">
            <p className="text-3xl font-script text-vintage-ink capitalize">
              Hello, {fullName ? fullName.split(' ')[0] : (userEmail ? userEmail.split('@')[0] : 'Fellas')}
            </p>
            <p className="text-xs font-bold tracking-widest text-vintage-accent uppercase mt-1.5 font-sans">Authorized Member</p>
          </div>
        </div>
        
        <nav className="grow p-6 space-y-2">
          {[
            { id: 'library', label: 'Purchase History', icon: Library },
            { id: 'settings', label: 'Security & Access', icon: Settings },
            ...(isAffiliateAllowed ? [{ id: 'affiliate', label: 'Affiliate Portal', icon: Share2 }] : [])
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => handleTabChange(item.id)} 
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-xs font-bold tracking-wider uppercase transition-all relative group font-sans ${
                  isActive ? 'bg-vintage-ink text-vintage-paper shadow-sm' : 'text-vintage-ink hover:bg-vintage-ink/5'
                }`}
              >
                <Icon size={18} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
                <span className="grow text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 font-bold border ${
                    isActive ? 'bg-vintage-paper text-vintage-ink border-vintage-paper' : 'bg-vintage-accent text-vintage-paper border-vintage-accent'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON - TERMINATE SESSION */}
        <div className="p-6 border-t border-vintage-ink">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3.5 px-4 py-3.5 text-xs font-bold tracking-wider text-left hover:bg-red-900/10 text-red-900 transition-all group uppercase font-sans border border-transparent hover:border-red-900/30"
          >
            <LogOut size={18} className="opacity-80 group-hover:opacity-100" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-vintage-ink/20 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA - THE FOLIO */}
      <main className="grow p-8 md:p-16 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto animate-in fade-in duration-700">
          {activeTab === 'library' && <MyFontsHistory />}
          {activeTab === 'settings' && <AccountSettings />}
          {activeTab === 'affiliate' && <AffiliatePortal />}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;