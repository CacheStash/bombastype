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
        <p className="text-xs font-bold tracking-widest text-vintage-accent uppercase mt-2 font-sans">
          Management of Account Credentials & Accession Keys
        </p>
      </div>

      {/* ACCESSION KEYS CARD */}
      <div className="vintage-card bg-vintage-paper border-2 border-vintage-ink shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-vintage-ink/20 pb-4">
          <Key size={18} className="text-vintage-accent" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
            Archival Accession Keys
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative grow">
            <select 
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full bg-vintage-paper border-2 border-vintage-ink p-3.5 outline-none appearance-none cursor-pointer font-mono font-bold text-base focus:border-vintage-accent transition-all text-vintage-ink shadow-sm"
            >
              {checkoutCodes.length > 0 ? (
                checkoutCodes.map((code: string, idx: number) => (
                  <option key={idx} value={code} className="bg-vintage-paper font-mono">{code}</option>
                ))
              ) : (
                <option disabled value="">No Order Key Registered</option>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-vintage-ink/70">
              <RefreshCcw size={16} />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleCopy}
            className="vintage-btn px-6 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-vintage-ink"
          >
            <Copy size={16} /> COPY KEY
          </button>
        </div>

        <div className="p-4 bg-white border border-vintage-ink text-xs sm:text-sm text-vintage-ink font-sans leading-relaxed space-y-1">
          <p className="font-semibold text-vintage-ink">• All accession keys listed are valid as master account identifier tokens.</p>
          <p className="text-vintage-ink/90">• Should you lose your password, use any order transaction identifier to restore access to your account.</p>
        </div>
      </div>

      {/* CHANGE PASSWORD FORM */}
      <div className="vintage-card bg-vintage-paper border-2 border-vintage-ink shadow-sm">
        <form onSubmit={handleUpdatePassword} className="space-y-8">
          <div className="flex items-center gap-3 border-b border-vintage-ink/20 pb-4">
            <ShieldCheck size={18} className="text-vintage-accent" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
              Update Password
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full border-2 border-vintage-ink p-3 bg-white outline-none font-sans text-base focus:border-vintage-accent transition-colors placeholder:text-vintage-ink/50"
                placeholder="Enter new password..."
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full border-2 border-vintage-ink p-3 bg-white outline-none font-sans text-base focus:border-vintage-accent transition-colors placeholder:text-vintage-ink/50"
                placeholder="Verify new password..."
                required 
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="vintage-btn btn-reverse w-full py-4 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-3 font-sans"
          >
            {loading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <>
                <ShieldCheck size={16} /> SAVE NEW PASSWORD
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSettings;