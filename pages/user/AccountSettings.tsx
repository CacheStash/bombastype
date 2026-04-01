/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Key, Copy, RefreshCcw } from 'lucide-react';

const AccountSettings = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkoutCodes, setCheckoutCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');

  useEffect(() => {
    const getAllCheckoutCodes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('font_history')
        .select('transaction_id')
        .eq('user_id', user.id)
        .order('download_date', { ascending: false });

      if (data && data.length > 0) {
        const codes = data.map((item: any) => item.transaction_id);
        setCheckoutCodes(codes);
        setSelectedCode(codes[0]);
      }
    };
    getAllCheckoutCodes();
  }, []);

  const handleCopy = () => {
    if (!selectedCode) return;
    navigator.clipboard.writeText(selectedCode);
    alert("KEY COPIED TO ARCHIVE: " + selectedCode);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("Security keys do not match!");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else {
      alert("Security credentials updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-12 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-8">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Security & Access</h2>
        <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic">
          Management of Administrative Credentials & Accession Keys
        </p>
      </div>

      {/* ACCESSION KEYS CARD */}
      <div className="vintage-card bg-white/40 space-y-6">
        <div className="flex items-center gap-3 border-b border-vintage-ink/10 pb-4">
          <Key size={16} className="text-vintage-accent" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-vintage-ink">
            Archival Accession Keys
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative grow">
            <select 
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full bg-vintage-paper/30 border border-vintage-ink/20 p-4 outline-none appearance-none cursor-pointer font-display text-xl focus:border-vintage-ink transition-all text-vintage-ink"
            >
              {checkoutCodes.length > 0 ? (
                checkoutCodes.map((code: string, idx: number) => (
                  <option key={idx} value={code} className="bg-vintage-paper">{code}</option>
                ))
              ) : (
                <option disabled value="">Consulting Ledger...</option>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <RefreshCcw size={14} />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleCopy}
            className="vintage-btn px-8 py-4 text-[10px] flex items-center justify-center gap-2"
          >
            <Copy size={14} /> COPY KEY
          </button>
        </div>

        <div className="p-4 bg-vintage-ink/3 border-l-2 border-vintage-accent text-[10px] font-serif italic text-vintage-ink/60 leading-relaxed">
          <p>* All accession keys listed are valid as master resetter identifiers.</p>
          <p>* Should you lose your primary access key, use any transaction identifier to regain entry via the portal.</p>
        </div>
      </div>

      {/* CHANGE PASSWORD FORM */}
      <div className="vintage-card bg-white/40">
        <form onSubmit={handleUpdatePassword} className="space-y-8">
          <div className="flex items-center gap-3 border-b border-vintage-ink/10 pb-4">
            <ShieldCheck size={16} className="text-vintage-accent" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-vintage-ink">
              Refine Access Credentials
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">New Access Key</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/60"
                placeholder="Enter new key..."
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Confirm Key</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/60"
                placeholder="Verify new key..."
                required 
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="vintage-btn btn-reverse w-full py-5 text-[11px] flex items-center justify-center gap-4"
          >
            {loading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <>
                <ShieldCheck size={16} /> COMMIT NEW CREDENTIALS
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSettings;