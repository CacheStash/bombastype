/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Send, Megaphone, ShieldCheck, Trash2, ArrowLeft, 
  Calendar, History, Inbox, CheckCircle2, MessageSquare, 
  Plus, AlertCircle, Clock
} from 'lucide-react';

const PAGE_SIZE = 10;

const UserMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  
  // Stats & Pagination
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Form States
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchMessages(); }, [tab, currentPage]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const userJoinedAt = user.created_at;

      // 1. Ambil ID Pesan yang SUDAH DIBACA
      const { data: readData } = await supabase
        .from('font_message_reads')
        .select('message_id')
        .eq('user_id', user.id);
      const readIds = readData?.map(r => r.message_id) || [];

      // 2. Ambil ID Pesan yang DISEMBUNYIKAN
      const { data: hiddenData } = await supabase
        .from('font_message_hides')
        .select('message_id')
        .eq('user_id', user.id);
      const hiddenIds = hiddenData?.map(h => h.message_id) || [];

      // 3. Hitung Unread Count
      const { data: unreadData } = await supabase
        .from('font_messages')
        .select('id, recipient_id, is_read, created_at')
        .or(`recipient_id.eq.${user.id},and(recipient_id.is.null,created_at.gte.${userJoinedAt})`);

      const actualUnread = unreadData?.filter(m => {
        if (hiddenIds.includes(m.id)) return false;
        if (m.recipient_id === null) {
          return !readIds.includes(m.id);
        } else {
          return !m.is_read;
        }
      }).length || 0;
      
      setUnreadCount(actualUnread);

      // 4. Main Query Data
      let query = supabase.from('font_messages').select('*', { count: 'exact' });
      if (tab === 'inbox') {
        query = query.or(`recipient_id.eq.${user.id},and(recipient_id.is.null,created_at.gte.${userJoinedAt})`);
      } else {
        query = query.eq('sender_id', user.id);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const processed = data.map(m => ({
          ...m,
          is_actually_read: m.recipient_id === null ? readIds.includes(m.id) : m.is_read
        }));
        
        const filtered = tab === 'inbox' ? processed.filter(m => !hiddenIds.includes(m.id)) : processed;
        setMessages(filtered);
        setTotalCount(count || 0);
      }
    } catch (err: any) {
      console.error("FETCH_ERROR:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (message: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (tab === 'inbox' && !message.is_actually_read) {
      if (message.recipient_id === null) {
        await supabase.from('font_message_reads').insert([{ user_id: user.id, message_id: message.id }]);
      } else {
        await supabase.from('font_messages').update({ is_read: true }).eq('id', message.id);
      }
      fetchMessages();
    }
    setSelectedMessage(message);
  };

  const handleSend = async (e: React.FormEvent, isReply = false) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("AUTH_SESSION_MISSING");

      const { data: admin } = await supabase.from('fontadmin').select('id').limit(1).single();
      if (!admin) throw new Error("ADMIN_NOT_FOUND");

      const payload = isReply ? {
        sender_id: user.id,
        recipient_id: admin.id,
        subject: `RE: ${selectedMessage.subject}`,
        content: replyContent,
        message_type: 'reply'
      } : {
        sender_id: user.id,
        recipient_id: admin.id,
        subject,
        content,
        message_type: 'support'
      };

      const { error } = await supabase.from('font_messages').insert([payload]);
      if (error) throw error;
      alert("Communication Dispatched Successfully");
      setSubject(''); setContent(''); setReplyContent(''); 
      setShowForm(false); setSelectedMessage(null); fetchMessages();
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Discard this correspondence from your folio?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('font_message_hides').insert([{ user_id: user.id, message_id: id }]);
    setMessages(messages.filter(m => m.id !== id));
    if (selectedMessage?.id === id) setSelectedMessage(null);
    fetchMessages();
  };

  return (
    <div className="space-y-10 pb-20 selection:bg-vintage-ink selection:text-vintage-paper">
      {/* HEADER & TABS */}
      <div className="border-b border-vintage-ink pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        {!selectedMessage && (
          <>
            <div>
              <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Communication Folio</h2>
              <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic flex items-center gap-2">
                <MessageSquare size={12} /> Archival Dispatch & Studio Support
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
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
              </div>

              <button 
                onClick={() => setShowForm(!showForm)} 
                className="vintage-btn btn-reverse px-8 py-3 text-[10px]"
              >
                {showForm ? 'CLOSE FORM' : <span className="flex items-center gap-2"><Plus size={14} /> NEW DISPATCH</span>}
              </button>
            </div>
          </>
        )}
      </div>

      {selectedMessage ? (
        /* DETAIL VIEW: ARCHIVAL PAPER STYLE */
        <div className="vintage-card bg-white p-0 overflow-hidden max-w-4xl mx-auto border-double border-4 border-vintage-ink animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 border-b border-vintage-ink bg-vintage-ink/5 flex justify-between items-center text-[10px] font-bold tracking-widest uppercase">
            <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-2 hover:text-vintage-accent transition-colors">
              <ArrowLeft size={14} /> Back to Folio
            </button>
            {tab === 'inbox' && (
              <button onClick={() => handleDelete(selectedMessage.id)} className="text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-2">
                <Trash2 size={16} /> Discard Letter
              </button>
            )}
          </div>
          
          <div className="p-10 md:p-16 space-y-10">
            <div className="space-y-4 border-b border-vintage-ink/10 pb-8">
              <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] text-vintage-accent uppercase italic">
                <Clock size={12}/> Received: {new Date(selectedMessage.created_at).toLocaleString()}
              </div>
              <h3 className="text-4xl md:text-5xl font-display leading-tight text-vintage-ink">{selectedMessage.subject}</h3>
            </div>
            
            <div className="font-serif text-lg leading-relaxed text-vintage-ink/80 whitespace-pre-wrap italic">
              {selectedMessage.content}
            </div>
            
            {/* REPLY AREA */}
            {tab === 'inbox' && selectedMessage.recipient_id && (
              <form onSubmit={(e) => handleSend(e, true)} className="mt-12 pt-12 border-t border-vintage-ink space-y-6">
                <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest text-vintage-accent uppercase">
                  <Send size={14} /> Draft a Response to Official
                </div>
                <textarea 
                  rows={6} 
                  placeholder="Your response to the studio..." 
                  value={replyContent} 
                  onChange={e => setReplyContent(e.target.value)} 
                  className="w-full border border-vintage-ink/20 p-6 bg-vintage-paper/20 outline-none focus:border-vintage-ink font-serif text-lg italic transition-all placeholder:text-vintage-ink/60" 
                  required 
                />
                <button disabled={sending} className="vintage-btn btn-reverse px-12 py-4">
                  {sending ? 'DISPATCHING...' : 'SEND RESPONSE'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : showForm ? (
        /* CREATE FORM: REGISTER NEW TICKET */
        <div className="max-w-2xl mx-auto vintage-card p-12 bg-white/40 animate-in fade-in zoom-in-95 duration-200">
          <form onSubmit={(e) => handleSend(e)} className="space-y-8">
            <div className="text-center space-y-2 mb-4">
              <h3 className="text-3xl font-display uppercase tracking-widest">New Dispatch</h3>
              <p className="text-[10px] font-bold tracking-[0.2em] text-vintage-accent italic uppercase">Studio Support Inquiry</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Communication Subject</label>
              <input 
                type="text" 
                placeholder="e.g. License clarification..." 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-display text-xl focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/60 uppercase" 
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Detailed Narrative</label>
              <textarea 
                placeholder="Compose your inquiry..." 
                rows={6} 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                className="w-full border border-vintage-ink/10 p-6 bg-vintage-paper/20 outline-none focus:border-vintage-ink font-serif text-lg italic transition-all placeholder:text-vintage-ink/60" 
                required 
              />
            </div>

            <button disabled={sending} className="vintage-btn btn-reverse w-full py-5 text-xs">
              {sending ? 'COMMITTING TO LEDGER...' : <span className="flex items-center justify-center gap-4"><Send size={16} /> DISPATCH TICKET</span>}
            </button>
          </form>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-6">
          <div className="space-y-3">
            {loading ? (
              <div className="p-20 text-center animate-pulse italic opacity-40 font-serif">Syncing communication streams...</div>
            ) : messages.length === 0 ? (
              <div className="p-20 border border-dashed border-vintage-ink/30 text-center opacity-40 font-serif italic uppercase tracking-widest text-[10px]">No correspondences found in this folio</div>
            ) : (
              messages.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => markAsRead(m)}
                  className={`vintage-card p-6 flex items-center justify-between group cursor-pointer transition-all hover:border-vintage-accent ${
                    !m.is_actually_read && tab === 'inbox' ? 'bg-vintage-paper border-l-4 border-l-vintage-accent shadow-md' : 'bg-white/40'
                  } ${m.message_type === 'broadcast' ? 'border-vintage-accent/30 bg-vintage-accent/3' : ''}`}
                >
                  <div className="overflow-hidden flex-1 space-y-1">
                    <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest">
                      <span className={`flex items-center gap-1.5 ${m.message_type === 'broadcast' ? 'text-vintage-accent' : 'text-vintage-ink/50'}`}>
                        {m.message_type === 'broadcast' ? <Megaphone size={12}/> : <ShieldCheck size={12}/>} 
                        {m.message_type}
                      </span>
                      {!m.is_actually_read && tab === 'inbox' && (
                        <span className="flex items-center gap-1 text-vintage-accent animate-pulse font-black italic">
                          <AlertCircle size={10}/> Unread
                        </span>
                      )}
                      {m.is_actually_read && tab === 'inbox' && <CheckCircle2 size={12} className="text-vintage-accent/40"/>}
                      <span className="text-vintage-ink/30 font-serif lowercase italic tracking-normal">{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <h4 className={`text-xl font-display leading-tight truncate mt-1 ${!m.is_actually_read && tab === 'inbox' ? 'text-vintage-ink' : 'text-vintage-ink/70'}`}>
                      {m.subject}
                    </h4>
                    <p className="text-[11px] font-serif italic opacity-50 truncate">{m.content.substring(0, 100)}...</p>
                  </div>
                  
                  {tab === 'inbox' && (
                    <button 
                      onClick={(e) => handleDelete(m.id, e)} 
                      className="p-3 opacity-0 group-hover:opacity-100 text-red-900/40 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
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
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-vintage-ink/60">Folio {currentPage + 1} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
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

export default UserMessages;