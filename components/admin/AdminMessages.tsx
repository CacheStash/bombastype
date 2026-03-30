/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Send, Mail, User, Megaphone, Trash2, ArrowLeft, 
  Calendar, AtSign, History, Inbox, CheckCircle2, AlertCircle 
} from 'lucide-react';

const PAGE_SIZE = 10;

const AdminMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inbox' | 'sent' | 'broadcast'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // Pagination & Stats
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Form States
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState(false);

  useEffect(() => { fetchMessages(); }, [tab, currentPage]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // 1. Get Unread Support Count
      const { count: unread } = await supabase
        .from('font_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      setUnreadCount(unread || 0);

      // 2. Build Query using admin_messages_view
      let query = supabase.from('admin_messages_view').select('*', { count: 'exact' });

      if (tab === 'inbox') {
        query = query.or(`message_type.eq.support,recipient_id.eq.${user.id}`);
      } else if (tab === 'sent') {
        query = query.eq('sender_id', user.id).eq('message_type', 'reply');
      } else if (tab === 'broadcast') {
        query = query.eq('message_type', 'broadcast');
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      if (data) {
        setMessages(data);
        setTotalCount(count || 0);
      }
    } catch (err: any) {
      console.error("ADMIN_FETCH_ERROR:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (message: any) => {
    if (tab === 'inbox' && !message.is_read) {
      const { error } = await supabase
        .from('font_messages')
        .update({ is_read: true })
        .eq('id', message.id);
      
      if (!error) {
        setMessages(messages.map(m => m.id === message.id ? { ...m, is_read: true } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
    setSelectedMessage(message);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Discard this correspondence permanently?")) return;
    
    const { error } = await supabase.from('font_messages').delete().eq('id', id);
    if (!error) {
      setMessages(messages.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      fetchMessages();
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('font_messages').insert([{
        sender_id: user?.id,
        recipient_id: null,
        subject,
        content,
        message_type: 'broadcast'
      }]);

      if (error) throw error;
      alert("Broadcast Dispatched Successfully");
      setSubject(''); setContent(''); fetchMessages();
    } catch (err: any) {
      alert("Broadcast Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage?.sender_id) return;
    setReplying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('font_messages').insert([{
        sender_id: user?.id,
        recipient_id: selectedMessage.sender_id,
        subject: `RE: ${selectedMessage.subject}`,
        content: replyContent,
        message_type: 'reply'
      }]);

      if (error) throw error;
      alert("Reply Sent Successfully");
      setReplyContent(''); setSelectedMessage(null); fetchMessages();
    } catch (err: any) {
      alert("Reply Error: " + err.message);
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* HEADER & NAVIGATION */}
      <div className="border-b border-vintage-ink pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        {!selectedMessage && (
          <>
            <div>
              <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Dispatch Hub</h2>
              <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic flex items-center gap-2">
                <Mail size={12} /> Archival Communications & Support
              </p>
            </div>
            
            <div className="flex bg-vintage-paper/50 border border-vintage-ink p-1">
              <button 
                onClick={() => {setTab('inbox'); setCurrentPage(0);}} 
                className={`px-6 py-2 text-[10px] font-bold tracking-widest flex items-center gap-3 transition-all relative ${tab === 'inbox' ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}
              >
                <Inbox size={14}/> INBOX
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-1 bg-vintage-accent text-vintage-paper text-[8px] font-black px-1.5 py-0.5 border border-vintage-ink animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => {setTab('sent'); setCurrentPage(0);}} 
                className={`px-6 py-2 text-[10px] font-bold tracking-widest flex items-center gap-3 border-l border-vintage-ink transition-all ${tab === 'sent' ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}
              >
                <History size={14}/> SENT
              </button>
              <button 
                onClick={() => {setTab('broadcast'); setCurrentPage(0);}} 
                className={`px-6 py-2 text-[10px] font-bold tracking-widest flex items-center gap-3 border-l border-vintage-ink transition-all ${tab === 'broadcast' ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}
              >
                <Megaphone size={14}/> HUB
              </button>
            </div>
          </>
        )}
      </div>

      {selectedMessage ? (
        /* DETAIL VIEW: ARCHIVAL PAPER STYLE */
        <div className="vintage-card bg-white p-0 overflow-hidden max-w-4xl mx-auto border-double border-4 border-vintage-ink">
          <div className="p-4 border-b border-vintage-ink bg-vintage-ink/5 flex justify-between items-center text-[10px] font-bold tracking-widest">
            <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-2 hover:text-vintage-accent transition-colors">
              <ArrowLeft size={14} /> BACK TO DISPATCH
            </button>
            <button onClick={() => handleDelete(selectedMessage.id)} className="text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-2 uppercase">
              <Trash2 size={14} /> Discard Letter
            </button>
          </div>
          
          <div className="p-10 md:p-16 space-y-10">
            <div className="space-y-4 border-b border-vintage-ink pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-bold tracking-[0.2em] text-vintage-ink/50 uppercase">
                <div className="flex items-center gap-3"><User size={14} className="text-vintage-accent"/> FROM: <span className="text-vintage-ink">{selectedMessage.sender_name || 'STUDIO SYSTEM'}</span></div>
                <div className="flex items-center gap-3"><AtSign size={14} className="text-vintage-accent"/> MAIL: <span className="text-vintage-ink">{selectedMessage.sender_email || 'OFFICIAL'}</span></div>
                <div className="flex items-center gap-3"><Calendar size={14} className="text-vintage-accent"/> DATE: <span className="text-vintage-ink">{new Date(selectedMessage.created_at).toLocaleString()}</span></div>
              </div>
              <h3 className="text-4xl md:text-5xl font-display leading-tight text-vintage-ink pt-4">{selectedMessage.subject}</h3>
            </div>
            
            <div className="font-serif text-lg leading-relaxed text-vintage-ink/80 whitespace-pre-wrap italic">
              {selectedMessage.content}
            </div>
            
            {/* REPLY AREA */}
            {tab === 'inbox' && selectedMessage.message_type === 'support' && (
              <form onSubmit={handleReply} className="mt-12 pt-12 border-t border-vintage-ink space-y-6">
                <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest text-vintage-accent uppercase">
                  <Send size={14} /> Draft a Response to {selectedMessage.sender_name?.split(' ')[0] || 'Buyer'}
                </div>
                <textarea 
                  rows={6} 
                  placeholder="Your archival response..." 
                  value={replyContent} 
                  onChange={e => setReplyContent(e.target.value)} 
                  className="w-full border border-vintage-ink/20 p-6 bg-vintage-paper/20 outline-none focus:border-vintage-ink font-serif text-lg transition-all italic" 
                  required 
                />
                <button disabled={replying} className="vintage-btn btn-reverse px-12 py-4">
                  {replying ? 'SENDING...' : 'DISPATCH REPLY'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : tab === 'broadcast' && messages.length === 0 && !loading ? (
        /* BROADCAST FORM (EMPTY HISTORY) */
        <div className="max-w-2xl mx-auto vintage-card p-12">
           <form onSubmit={handleBroadcast} className="space-y-8 text-center">
              <div className="space-y-2">
                <h3 className="text-3xl font-display uppercase tracking-widest">Dispatch Newsletter</h3>
                <p className="text-[10px] font-bold tracking-[0.2em] text-vintage-accent italic uppercase">Global Broadcast to All Subscribers</p>
              </div>
              <input 
                type="text" 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                className="w-full border-b border-vintage-ink py-4 bg-transparent outline-none font-display text-2xl focus:border-vintage-accent transition-all text-center placeholder:opacity-20" 
                placeholder="SUBJECT OF DISPATCH" 
                required 
              />
              <textarea 
                rows={8} 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                className="w-full border border-vintage-ink/20 p-6 bg-vintage-paper/20 outline-none focus:border-vintage-ink font-serif text-lg italic transition-all" 
                placeholder="COMMUNICATION CONTENT..." 
                required 
              />
              <button disabled={sending} className="vintage-btn btn-reverse w-full py-5 text-xs">
                {sending ? 'DISPATCHING...' : <span className="flex items-center justify-center gap-4"><Send size={16} /> BROADCAST NOW</span>}
              </button>
           </form>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-6">
          {tab === 'broadcast' && (
             <div className="vintage-card bg-vintage-accent/5 border-dashed border-vintage-ink/30 mb-10">
                <form onSubmit={handleBroadcast} className="flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 space-y-4 w-full">
                    <input type="text" placeholder="Quick Subject..." value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-transparent border-b border-vintage-ink py-2 text-xs font-bold outline-none" required />
                    <textarea placeholder="Write broadcast message..." value={content} onChange={e => setContent(e.target.value)} className="w-full bg-transparent border-b border-vintage-ink/20 text-xs font-serif italic outline-none resize-none h-10" required />
                  </div>
                  <button disabled={sending} className="vintage-btn px-10 py-3 text-[9px] h-fit">
                    {sending ? 'SENDING' : 'DISPATCH'}
                  </button>
                </form>
             </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="p-20 text-center animate-pulse italic opacity-40 font-serif">Scanning Archive...</div>
            ) : messages.length === 0 ? (
              <div className="p-20 border border-dashed border-vintage-ink/30 text-center opacity-40 font-serif italic uppercase tracking-widest text-[10px]">No correspondences found in this folio</div>
            ) : (
              messages.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => markAsRead(m)} 
                  className={`vintage-card p-6 flex items-center justify-between group cursor-pointer transition-all hover:border-vintage-accent ${!m.is_read && tab === 'inbox' ? 'bg-vintage-paper border-l-4 border-l-vintage-accent' : 'bg-white/40'}`}
                >
                  <div className="flex flex-col gap-2 overflow-hidden flex-1">
                    <div className="flex items-center gap-4">
                      <span className="text-[8px] font-black bg-vintage-ink text-vintage-paper px-2 py-0.5 tracking-widest uppercase">
                        {tab === 'sent' ? `TO: ${m.recipient_id ? 'CLIENT' : 'GLOBAL'}` : (m.sender_name || 'BUYER')}
                      </span>
                      <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter italic">{new Date(m.created_at).toLocaleDateString()}</span>
                      {!m.is_read && tab === 'inbox' && <span className="flex items-center gap-1 text-vintage-accent text-[8px] font-bold animate-pulse uppercase"><AlertCircle size={10}/> Unread Letter</span>}
                    </div>
                    <h4 className={`text-xl font-display leading-tight truncate ${!m.is_read && tab === 'inbox' ? 'text-vintage-ink' : 'text-vintage-ink/70'}`}>{m.subject}</h4>
                    <p className="text-[11px] font-serif italic opacity-50 truncate">{m.content.substring(0, 120)}...</p>
                  </div>
                  <button onClick={(e) => handleDelete(m.id, e)} className="p-3 opacity-0 group-hover:opacity-100 text-red-900/40 hover:text-red-600 transition-all"><Trash2 size={18} /></button>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          {totalCount > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-6 pt-10">
              <button 
                disabled={currentPage === 0} 
                onClick={() => setCurrentPage(p => p - 1)} 
                className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-20"
              >
                <ArrowLeft size={18}/>
              </button>
              <span className="text-[10px] font-bold tracking-[0.3em] text-vintage-ink/60 uppercase">Folio {currentPage + 1} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
              <button 
                disabled={(currentPage + 1) * PAGE_SIZE >= totalCount} 
                onClick={() => setCurrentPage(p => p + 1)} 
                className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-20"
              >
                <ArrowLeft size={18} className="rotate-180"/>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMessages;