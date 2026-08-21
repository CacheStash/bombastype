/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Download, FileText, History, ShieldCheck, Clock } from 'lucide-react';

const MyFontsHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('font_history')
      .select(`
        id,
        transaction_id, 
        download_type,
        download_date,
        fonts (
          name,
          trial_file_url,
          font_files
        )
      `)
      .eq('user_id', user.id)
      .order('download_date', { ascending: false });

    if (!error) setHistory(data);
    setLoading(false);
  };

  const handleSecureDownload = async (fileName: string, orderId: string, downloadType: string) => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Session expired. Please login again.");

    try {
      const res = await fetch(`/api/download-zip?file=${encodeURIComponent(fileName)}&order=${orderId}&type=${downloadType}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!res.ok) throw new Error("Unauthorized or File not found.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = res.headers.get('Content-Disposition');

      let downloadName = `Bombastype_Archive.zip`; 
      if (contentDisposition && contentDisposition.includes('filename=')) {
        downloadName = contentDisposition.split('filename=')[1].split(';')[0].replace(/["']/g, '').trim();
      }

      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert("DOWNLOAD_ERROR: " + err.message);
    }
  };

  if (loading) return <div className="p-10 text-center italic opacity-40 font-serif">Consulting Archival Registry...</div>;

  return (
    <div className="space-y-12 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-8">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Acquisition Library</h2>
        <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic flex items-center gap-2">
          <History size={12} /> Registry of Licensed Bombastype Artifacts
        </p>
      </div>

      {history.length === 0 ? (
        <div className="border border-dashed border-vintage-ink/20 p-24 text-center bg-vintage-ink/1">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-30 italic">Your personal archive is currently empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {history.map((item) => (
            <div key={item.id} className="vintage-card p-0 overflow-hidden bg-white/40 flex flex-col md:flex-row group hover:border-vintage-accent transition-all duration-500">
              
              {/* ASSET INFO */}
              <div className="p-8 grow space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-vintage-accent uppercase tracking-widest flex items-center gap-2">
                    <Clock size={10} /> Registered on {new Date(item.download_date).toLocaleDateString()}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-display text-vintage-ink leading-none">{item.fonts.name}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold bg-vintage-ink text-vintage-paper px-2 py-0.5 tracking-tighter uppercase font-mono">
                      #{item.transaction_id.slice(0, 12)}
                    </span>
                  </div>
                  <div className={`px-3 py-0.5 text-[9px] font-bold border tracking-[0.2em] uppercase ${
                    item.download_type === 'trial' 
                    ? 'border-vintage-accent text-vintage-accent bg-vintage-accent/5' 
                    : 'border-vintage-ink bg-vintage-ink text-vintage-paper'
                  }`}>
                    {item.download_type === 'trial' ? 'Demo Archive' : 'Full Commercial'}
                  </div>
                </div>
              </div>
              
              {/* ACTIONS */}
              <div className="bg-vintage-ink/3 border-t md:border-t-0 md:border-l border-vintage-ink/10 p-6 md:w-80 flex flex-col justify-center gap-3">
                <button 
                  onClick={() => handleSecureDownload(
                    item.download_type === 'trial' ? item.fonts.trial_file_url : item.fonts.font_files[0],
                    item.transaction_id,
                    item.download_type
                  )}
                  className="vintage-btn btn-reverse w-full py-4 text-[10px] flex items-center justify-center gap-3 group/btn"
                >
                  <Download size={16} className="group-hover/btn:translate-y-0.5 transition-transform" />
                  ACQUIRE FILES
                </button>

                <Link 
                  to={`/user/receipt/${item.transaction_id}`}
                  className="vintage-btn w-full py-4 text-[10px] border-vintage-ink/20 flex items-center justify-center gap-3 hover:bg-vintage-paper transition-all"
                >
                  <ShieldCheck size={16} />
                  LICENSE RECORD
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="pt-10 flex items-start gap-4 p-6 bg-vintage-ink/3 border border-vintage-ink/10">
        <FileText size={20} className="text-vintage-accent flex-none mt-1" />
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink">Registry Provision</p>
          <p className="text-[11px] font-serif italic text-vintage-ink/60 leading-relaxed">
            All downloaded assets are bound by the terms of the acquisition license. 
            The Demo version is for personal testing only, while the Full version provides commercial authority as per your certificate.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyFontsHistory;