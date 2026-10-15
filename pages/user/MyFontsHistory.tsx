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
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Purchase History</h2>
        <p className="text-xs font-bold tracking-widest text-vintage-accent uppercase mt-2 flex items-center gap-2 font-sans">
          <History size={14} /> Licensed Font Orders & Digital Downloads
        </p>
      </div>

      {history.length === 0 ? (
        <div className="border border-dashed border-vintage-ink/30 p-20 text-center bg-vintage-paper/50">
          <p className="text-sm font-semibold tracking-wider uppercase text-vintage-ink/80">Your purchase archive is currently empty.</p>
          <p className="text-xs text-vintage-ink/70 mt-2 font-sans">Fonts you license or test will appear here with perpetual download access.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {history.map((item) => (
            <div key={item.id} className="vintage-card p-0 overflow-hidden bg-vintage-paper border-2 border-vintage-ink flex flex-col md:flex-row group hover:border-vintage-accent transition-all duration-300 shadow-sm">
              
              {/* ASSET INFO */}
              <div className="p-8 grow space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-vintage-accent uppercase tracking-wider flex items-center gap-2">
                    <Clock size={12} /> Registered on {new Date(item.download_date).toLocaleDateString()}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-display text-vintage-ink leading-none">{item.fonts.name}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-vintage-ink text-vintage-paper px-2.5 py-1 tracking-wider uppercase font-mono">
                      #{item.transaction_id.slice(0, 12)}
                    </span>
                  </div>
                  <div className={`px-3 py-1 text-xs font-bold border tracking-wider uppercase ${
                    item.download_type === 'trial' 
                    ? 'border-vintage-accent text-vintage-accent bg-vintage-accent/10' 
                    : 'border-vintage-ink bg-vintage-ink text-vintage-paper'
                  }`}>
                    {item.download_type === 'trial' ? 'Demo Archive' : 'Full Commercial'}
                  </div>
                </div>
              </div>
              
              {/* ACTIONS */}
              <div className="bg-vintage-ink/5 border-t md:border-t-0 md:border-l border-vintage-ink p-6 md:w-80 flex flex-col justify-center gap-3">
                <button 
                  onClick={() => handleSecureDownload(
                    item.download_type === 'trial' ? item.fonts.trial_file_url : item.fonts.font_files[0],
                    item.transaction_id,
                    item.download_type
                  )}
                  className="vintage-btn btn-reverse w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 group/btn"
                >
                  <Download size={16} className="group-hover/btn:translate-y-0.5 transition-transform" />
                  DOWNLOAD FILES
                </button>

                <Link 
                  to={`/user/receipt/${item.transaction_id}`}
                  className="vintage-btn w-full py-3.5 text-xs font-bold uppercase tracking-wider border-vintage-ink flex items-center justify-center gap-3 hover:bg-vintage-paper transition-all"
                >
                  <ShieldCheck size={16} />
                  VIEW LICENSE RECORD
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* FOOTER NOTE - HIGH CONTRAST & READABLE */}
      <div className="mt-8 flex items-start gap-4 p-5 sm:p-6 bg-vintage-paper border-2 border-vintage-ink shadow-sm">
        <FileText size={24} className="text-vintage-accent shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
            License Terms & Commercial Usage Provision
          </p>
          <p className="text-xs sm:text-sm text-vintage-ink font-medium leading-relaxed font-sans">
            All downloaded assets are bound by the terms of your acquisition license. The Demo version is for personal testing only, while the Full version provides commercial authority as per your certificate.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyFontsHistory;