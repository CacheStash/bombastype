import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Mail, User, Megaphone, Trash2, ArrowLeft, Calendar, AtSign, History, Inbox, CheckCheck, Check } from 'lucide-react';

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
        // Tiket Support masuk atau Pesan yang ditujukan ke Admin
        query = query.or(`message_type.eq.support,recipient_id.eq.${user.id}`);
      } else if (tab === 'sent') {
        // Balasan Admin (Reply)
        query = query.eq('sender_id', user.id).eq('message_type', 'reply');
      } else if (tab === 'broadcast') {
        // Riwayat Broadcast
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
    if (!confirm("HAPUS_PERMANEN? Tindakan ini tidak bisa dibatalkan.")) return;
    
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
      alert("BROADCAST_DISPATCHED");
      setSubject(''); setContent(''); fetchMessages();
    } catch (err: any) {
      alert("BROADCAST_ERROR: " + err.message);
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
      alert("REPLY_SENT_SUCCESSFULLY");
      setReplyContent(''); setSelectedMessage(null); fetchMessages();
    } catch (err: any) {
      alert("REPLY_ERROR: " + err.message);
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-8 font-mono uppercase text-black">
      {/* Header & Tabs */}
      <div className="border-b-2 border-black pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {!selectedMessage && (
          <>
            <div className="relative">
              <h2 className="text-4xl font-black italic">MAIL_CENTER</h2>
              <p className="text-[10px] opacity-40">Admin Message & Support Control</p>
            </div>
            <div className="flex border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <button onClick={() => {setTab('inbox'); setCurrentPage(0);}} className={`px-4 py-2 text-[10px] font-black flex items-center gap-2 relative ${tab === 'inbox' ? 'bg-black text-white' : ''}`}>
                <Inbox size={14}/> INBOX
                {unreadCount > 0 && (
                  <span className="absolute -top-3 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => {setTab('sent'); setCurrentPage(0);}} className={`px-4 py-2 text-[10px] font-black flex items-center gap-2 border-l-2 border-black ${tab === 'sent' ? 'bg-black text-white' : ''}`}>
                <History size={14}/> SENT
              </button>
              <button onClick={() => {setTab('broadcast'); setCurrentPage(0);}} className={`px-4 py-2 text-[10px] font-black flex items-center gap-2 border-l-2 border-black ${tab === 'broadcast' ? 'bg-black text-white' : ''}`}>
                <Megaphone size={14}/> HUB
              </button>
            </div>
          </>
        )}
      </div>

      {selectedMessage ? (
        /* DETAIL VIEW */
        <div className="border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b-2 border-black bg-gray-50 flex justify-between items-center text-[10px] font-black">
            <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-2 hover:underline cursor-pointer">
              <ArrowLeft size={14} /> BACK_TO_LIST
            </button>
            <button onClick={() => handleDelete(selectedMessage.id)} className="text-red-600 p-2 flex items-center gap-2 border border-transparent hover:border-red-600 transition-all">
              <Trash2 size={14} /> DELETE_PERMANENTLY
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2 border-b border-black pb-6">
              <div className="flex items-center gap-2 text-[10px] font-black opacity-40">
                <User size={12}/> FROM: {selectedMessage.sender_name || 'SYSTEM'}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black opacity-40">
                <AtSign size={12}/> MAIL: {selectedMessage.sender_email || 'OFFICIAL'}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black opacity-40">
                <Calendar size={12}/> DATE: {new Date(selectedMessage.created_at).toLocaleString()}
              </div>
              <h3 className="text-3xl font-black italic break-words mt-4">{selectedMessage.subject}</h3>
            </div>
            <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap py-4">{selectedMessage.content}</p>
            
            {/* REPLY AREA */}
            {tab === 'inbox' && selectedMessage.message_type === 'support' && (
              <form onSubmit={handleReply} className="mt-8 pt-8 border-t-2 border-black space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black italic text-blue-600">
                  <Send size={12} /> QUICK_REPLY_TO_{selectedMessage.sender_name?.split(' ')[0] || 'BUYER'}
                </div>
                <textarea rows={4} placeholder="RESPONSE..." value={replyContent} onChange={e => setReplyContent(e.target.value)} className="w-full border-2 border-black p-4 outline-none focus:bg-blue-50 font-bold text-xs resize-none" required />
                <button disabled={replying} className="bg-black text-white px-8 py-3 font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-[2px] transition-all">
                  {replying ? 'SENDING...' : 'DISPATCH_REPLY'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : tab === 'broadcast' && messages.length === 0 && !loading ? (
        /* BROADCAST HUB (IF EMPTY HISTORY) - SHOW FORM */
        <div className="max-w-2xl border-2 border-black p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
           <form onSubmit={handleBroadcast} className="space-y-6">
              <h3 className="text-2xl font-black italic flex items-center gap-3 border-b-2 border-black pb-4"><Megaphone /> DISPATCH_NEWSLETTER</h3>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border-2 border-black p-3 outline-none focus:bg-yellow-50 font-bold" placeholder="SUBJECT" required />
              <textarea rows={6} value={content} onChange={e => setContent(e.target.value)} className="w-full border-2 border-black p-3 outline-none focus:bg-yellow-50 font-bold resize-none" placeholder="CONTENT..." required />
              <button disabled={sending} className="w-full bg-black text-white p-4 font-black flex justify-center items-center gap-2 uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                {sending ? 'SENDING...' : <><Send size={18} /> BROADCAST_NOW</>}
              </button>
           </form>
        </div>
      ) : (
        /* LIST VIEW (INBOX / SENT / BROADCAST HISTORY) */
        <div className="space-y-4">
          {tab === 'broadcast' && (
             <div className="border-2 border-black p-6 bg-yellow-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
                <form onSubmit={handleBroadcast} className="flex flex-col md:flex-row gap-4">
                  <input type="text" placeholder="QUICK_BROADCAST_SUBJECT" value={subject} onChange={e => setSubject(e.target.value)} className="flex-1 border-2 border-black p-2 font-black text-xs outline-none" required />
                  <textarea placeholder="CONTENT..." value={content} onChange={e => setContent(e.target.value)} className="flex-1 border-2 border-black p-2 font-black text-xs outline-none resize-none h-10" required />
                  <button disabled={sending} className="bg-black text-white px-6 py-2 text-[10px] font-black border-2 border-black hover:bg-white hover:text-black transition-all">
                    {sending ? 'SENDING...' : 'DISPATCH'}
                  </button>
                </form>
             </div>
          )}

          <div className="space-y-2">
            {loading ? <div className="animate-pulse font-black text-xs italic">SCANNING_DATABASE...</div> : 
             messages.length === 0 ? <div className="p-20 border-2 border-dashed border-black text-center opacity-20 font-bold italic">NO_DATA_FOUND</div> : (
              messages.map(m => (
                <div key={m.id} onClick={() => markAsRead(m)} className={`border-2 border-black p-4 flex items-center justify-between group cursor-pointer transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-1 ${!m.is_read && tab === 'inbox' ? 'bg-blue-50 ring-2 ring-black' : 'bg-white hover:bg-black hover:text-white'}`}>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 group-hover:bg-white group-hover:text-black">
                        {tab === 'sent' ? `TO: ${m.recipient_id ? 'BUYER' : 'ALL'}` : (m.sender_name?.split(' ')[0] || 'BUYER')}
                      </span>
                      <span className="text-[9px] font-bold opacity-40 group-hover:text-white/40">{new Date(m.created_at).toLocaleDateString()}</span>
                      {!m.is_read && tab === 'inbox' && <span className="bg-red-600 text-white text-[8px] px-1 animate-pulse">NEW</span>}
                    </div>
                    <h4 className="text-sm font-black truncate">{m.subject}</h4>
                    <p className="text-[10px] font-bold opacity-40 truncate group-hover:text-white/60">{m.content.substring(0, 80)}...</p>
                  </div>
                  <button onClick={(e) => handleDelete(m.id, e)} className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-all"><Trash2 size={16} /></button>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          {totalCount > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="border-2 border-black p-2 disabled:opacity-30 active:bg-black active:text-white"><ArrowLeft size={16}/></button>
              <span className="text-[10px] font-black">PAGE {currentPage + 1} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
              <button disabled={(currentPage + 1) * PAGE_SIZE >= totalCount} onClick={() => setCurrentPage(p => p + 1)} className="border-2 border-black p-2 disabled:opacity-30 active:bg-black active:text-white rotate-180"><ArrowLeft size={16}/></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMessages;