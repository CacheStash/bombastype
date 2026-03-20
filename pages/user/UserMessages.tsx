import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Megaphone, ShieldCheck, Trash2, ArrowLeft, Calendar, History, Inbox, CheckCheck } from 'lucide-react';

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

      // 1. Ambil ID Pesan yang SUDAH DIBACA (untuk Broadcast)
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

      // 3. Hitung Unread Count (Direct + Broadcast Filtered by Date)
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

      // 4. Main Query Data dengan filter tanggal untuk Broadcast
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
      
      // FIX TS18047: Pengecekan null guard untuk admin
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
      alert("MESSAGE_SENT");
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
    if (!confirm("Hapus dari inbox?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('font_message_hides').insert([{ user_id: user.id, message_id: id }]);
    setMessages(messages.filter(m => m.id !== id));
    if (selectedMessage?.id === id) setSelectedMessage(null);
    fetchMessages();
  };

  return (
    <div className="space-y-8 font-mono uppercase text-black">
      <div className="border-b-2 border-black pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {!selectedMessage && (
          <>
            <div>
              <h2 className="text-4xl font-black italic">MAILBOX</h2>
              <p className="text-[10px] opacity-40">COMMUNICATION_CENTER</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {/* TAB INBOX DENGAN FLOATING BADGE */}
                <button 
                  onClick={() => {setTab('inbox'); setCurrentPage(0);}} 
                  className={`px-6 py-2 text-[10px] font-black flex items-center gap-2 relative transition-all ${tab === 'inbox' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                >
                  <Inbox size={14}/> INBOX
                  {unreadCount > 0 && (
                    <span className="absolute -top-3 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button onClick={() => {setTab('sent'); setCurrentPage(0);}} className={`px-6 py-2 text-[10px] font-black border-l-2 border-black flex items-center gap-2 transition-all ${tab === 'sent' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
                  <History size={14}/> SENT
                </button>
              </div>
              <button onClick={() => setShowForm(!showForm)} className="bg-black text-white px-6 py-2 text-[10px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ml-auto">
                {showForm ? 'CLOSE' : 'NEW_TICKET'}
              </button>
            </div>
          </>
        )}
      </div>

      {selectedMessage ? (
        /* DETAIL VIEW */
        <div className="border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-2">
          <div className="p-4 border-b-2 border-black flex justify-between items-center bg-gray-50">
            <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-2 font-black text-[10px] hover:underline cursor-pointer">
              <ArrowLeft size={14} /> BACK_TO_LIST
            </button>
            {tab === 'inbox' && <button onClick={() => handleDelete(selectedMessage.id)} className="text-red-500 p-2 hover:bg-red-50 transition-all"><Trash2 size={18} /></button>}
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black opacity-40 flex items-center gap-2 italic"><Calendar size={12}/> {new Date(selectedMessage.created_at).toLocaleString()}</span>
              <h3 className="text-2xl font-black italic break-words">{selectedMessage.subject}</h3>
            </div>
            <p className="text-sm font-bold leading-relaxed pt-6 border-t border-black/10 whitespace-pre-wrap">{selectedMessage.content}</p>
            {tab === 'inbox' && selectedMessage.recipient_id && (
              <form onSubmit={(e) => handleSend(e, true)} className="mt-8 pt-8 border-t-2 border-black space-y-4">
                <p className="text-[10px] font-black italic text-blue-600 flex items-center gap-2"><Send size={12}/> QUICK_REPLY_TO_OFFICIAL</p>
                <textarea placeholder="TYPE RESPONSE..." rows={4} value={replyContent} onChange={e => setReplyContent(e.target.value)} className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-blue-50 resize-none" required />
                <button disabled={sending} className="bg-black text-white px-8 py-3 font-black text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                  {sending ? 'SENDING...' : 'SEND_REPLY'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : showForm ? (
        /* CREATE FORM */
        <form onSubmit={(e) => handleSend(e)} className="border-2 border-black p-6 bg-white space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <input type="text" placeholder="SUBJECT" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-yellow-50" required />
          <textarea placeholder="MESSAGE..." rows={5} value={content} onChange={e => setContent(e.target.value)} className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-yellow-50 resize-none" required />
          <button disabled={sending} className="w-full bg-black text-white p-4 font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-[2px] transition-all">
            {sending ? 'DISPATCHING...' : 'DISPATCH_TICKET'}
          </button>
        </form>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          <div className="space-y-2">
            {loading ? <div className="animate-pulse font-black text-xs italic">SYNCING_STREAMS...</div> : 
             messages.length === 0 ? <div className="p-20 border-2 border-dashed border-black text-center opacity-20 font-bold italic">NO_MESSAGES_FOUND</div> : (
              messages.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => markAsRead(m)}
                  className={`border-2 border-black p-5 flex items-center justify-between group cursor-pointer transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-1 
                    ${!m.is_actually_read && tab === 'inbox' ? 'bg-blue-50 ring-2 ring-black' : 'bg-white hover:bg-black hover:text-white'}
                    ${m.message_type === 'broadcast' ? 'bg-yellow-400 text-black hover:bg-yellow-500' : ''}`}
                >
                  <div className="overflow-hidden space-y-1">
                    <span className="text-[9px] font-black uppercase flex items-center gap-1">
                      {m.message_type === 'broadcast' ? <Megaphone size={10}/> : <ShieldCheck size={10}/>} {m.message_type}
                      {!m.is_actually_read && tab === 'inbox' && <span className="bg-red-600 text-white px-1 ml-2 animate-pulse">NEW</span>}
                      {m.is_actually_read && tab === 'inbox' && <CheckCheck size={12} className="text-green-600 ml-1"/>}
                    </span>
                    <h4 className={`text-sm font-black truncate ${!m.is_actually_read && tab === 'inbox' ? 'underline' : ''}`}>{m.subject}</h4>
                    <p className="text-[10px] font-bold opacity-50 truncate group-hover:text-white/60">{m.content.substring(0, 80)}...</p>
                  </div>
                  {tab === 'inbox' && <button onClick={(e) => handleDelete(m.id, e)} className="p-2 opacity-0 group-hover:opacity-100 text-red-500 transition-all hover:scale-110"><Trash2 size={16} /></button>}
                </div>
              ))
            )}
          </div>
          {totalCount > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-4 pt-4 font-black text-[10px]">
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="border-2 border-black p-2 disabled:opacity-30 active:bg-black active:text-white transition-all">PREV</button>
              <span>{currentPage + 1} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
              <button disabled={(currentPage + 1) * PAGE_SIZE >= totalCount} onClick={() => setCurrentPage(p => p + 1)} className="border-2 border-black p-2 disabled:opacity-30 active:bg-black active:text-white transition-all">NEXT</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserMessages;