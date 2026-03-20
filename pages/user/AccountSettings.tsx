import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Key } from 'lucide-react';

const AccountSettings = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [initialPassword, setInitialPassword] = useState('LOADING...');
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
        setSelectedCode(codes[0]); // Default ke kode terbaru
      }
    };
    getAllCheckoutCodes();
  }, []);

  const handleCopy = () => {
    if (!selectedCode) return;
    navigator.clipboard.writeText(selectedCode);
    alert("COPIED TO CLIPBOARD: " + selectedCode);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("Passwords do not match!");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else {
      alert("Password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md font-mono uppercase">
      <div className="mb-10 p-6 border-2 border-black bg-yellow-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <label className="block text-[10px] font-black tracking-widest mb-2 opacity-50 flex items-center gap-2">
          <Key size={12} /> YOUR_CHECKOUT_CODES & RESETTER_KEYS
        </label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <select 
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full text-lg font-black tracking-tighter bg-white border border-black p-3 outline-none appearance-none cursor-pointer focus:bg-white"
            >
              {checkoutCodes.length > 0 ? (
                checkoutCodes.map((code: string, idx: number) => (
                  <option key={idx} value={code}>{code}</option>
                ))
              ) : (
                <option disabled value="">LOADING_CODES...</option>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-black text-xs">
              ▼
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleCopy}
            className="bg-black text-white px-4 border-2 border-black font-black text-[10px] hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            COPY
          </button>
        </div>

        <p className="text-[9px] mt-3 font-bold opacity-60 leading-tight">
          * ALL CODES LISTED ABOVE ARE VALID RESETTER KEYS.
          <br />
          * IF YOU FORGET YOUR CUSTOM PASSWORD, USE ANY OF THESE TRANSACTION CODES TO REGAIN ACCESS VIA LOGIN PAGE.
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-6">
        <h3 className="text-2xl font-black italic border-b-2 border-black pb-2">CHANGE_PASSWORD</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-black p-3 outline-none focus:bg-white bg-gray-100 font-bold" required />
          </div>
          <div>
            <label className="block text-[10px] font-black mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border border-black p-3 outline-none focus:bg-white bg-gray-100 font-bold" required />
          </div>
        </div>
        <button disabled={loading} className="w-full bg-black text-white p-4 font-black hover:bg-green-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
          <ShieldCheck size={18} /> {loading ? 'UPDATING...' : 'SAVE_NEW_PASSWORD'}
        </button>
      </form>
    </div>
  );
};
export default AccountSettings;