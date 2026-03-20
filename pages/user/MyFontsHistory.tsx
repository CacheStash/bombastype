import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Download, Info } from 'lucide-react';


const MyFontsHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Join tabel font_history dengan fonts untuk ambil nama dan link
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
      // FIXED: Masukkan &type=${downloadType} ke URL agar Worker langsung tau status filenya
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

      let downloadName = `DEBUG_FALLBACK_NAME.zip`; // Ubah fallback agar ketahuan jika gagal
      
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

  if (loading) return <div className="text-[10px] font-bold animate-pulse">LOADING_DATABASE...</div>;

  return (
    <div className="space-y-8 font-mono">
      <div className="border-b-2 border-black pb-4">
        <h2 className="text-4xl font-black italic">MY_LIBRARY</h2>
        <p className="text-[10px] opacity-40">All your fonts / Trial & Full version</p>
      </div>

      {history.length === 0 ? (
        <div className="border-2 border-dashed border-black p-20 text-center">
          <p className="opacity-30 font-bold">YOUR LIBRARY IS EMPTY.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((item) => (
            <div key={item.id} className="border border-black p-6 bg-white flex flex-col md:flex-row md:justify-between md:items-center gap-6 group hover:bg-black hover:text-white transition-all">
              <div className="flex flex-col gap-2">
                {/* 1. Font Name (Top) */}
                <h3 className="text-2xl font-black italic">{item.fonts.name}</h3>
                
                {/* 2. Info Labels (Below Name) */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black bg-black text-white px-2 py-1 border border-black group-hover:bg-white group-hover:text-black transition-all">
                    {item.transaction_id}
                  </span>
                  <div className={`px-3 py-1 text-[10px] font-black border border-black ${item.download_type === 'trial' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'}`}>
                    {item.download_type === 'trial' ? 'DEMO' : 'FULL'}
                  </div>
                  <span className="text-[10px] font-black opacity-40 group-hover:text-white/50">
                    {new Date(item.download_date).toLocaleDateString()} — {item.download_type}
                  </span>
                </div>
              </div>
              
              {/* 3. Action Buttons (Bottom on Mobile) */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <button 
                  onClick={() => handleSecureDownload(
                    item.download_type === 'trial' ? item.fonts.trial_file_url : item.fonts.font_files[0],
                    item.transaction_id,
                    item.download_type
                  )}
                  className="bg-black text-white py-2 px-4 border border-white group-hover:bg-white group-hover:text-black transition-all flex items-center gap-2"
                >
                  <Download size={18} />
                  <span className="text-[10px] font-black uppercase">Download</span>
                </button>

                <Link 
                  to={`/user/receipt/${item.transaction_id}`}
                  className="bg-white text-black py-2 px-4 border border-black hover:bg-yellow-400 transition-all flex items-center gap-2"
                  title="View Official License"
                >
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase">License Details</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFontsHistory;