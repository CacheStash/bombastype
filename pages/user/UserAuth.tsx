import React, { useState, useEffect } from 'react'; // Tambahkan useEffect
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Tambahkan useSearchParams

const UserAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Mengambil parameter dari URL

  // Sinkronisasi data dari URL ke dalam form
  useEffect(() => {
    const preEmail = searchParams.get('email');
    const preKey = searchParams.get('key');
    if (preEmail) setEmail(preEmail);
    if (preKey) setPassword(preKey);
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. ATTEMPT STANDARD LOGIN
    const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!signInError && signInData.session) {
      navigate('/user/dashboard');
      setLoading(false);
      return;
    }

    // 2. BACKDOOR LOGIC: Jika login gagal, coba reset via Worker
    if (signInError) {
      console.log("LOGIN_FAILED: Attempting Backdoor Reset..."); // DEBUG LOG
      try {
        const resetAttempt = await fetch(`${import.meta.env.VITE_WORKER_URL}/api/auth/backdoor-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, transactionId: password })
        });

        // FIXED: Casting tipe 'any' agar TypeScript tidak protes 'unknown'
        const resetResult = (await resetAttempt.json()) as any;

        if (resetAttempt.ok) {
          console.log("BACKDOOR_SUCCESS: Password updated. Retrying login...");
          // --- PARTIAL FIX ---
          // FIXED: Beri sedikit delay (500ms) agar Supabase Auth sempat memproses perubahan password di server
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const retryLogin = await supabase.auth.signInWithPassword({ email, password });
          
          if (!retryLogin.error) {
            alert("ACCESS GRANTED! YOUR PASSWORD HAS BEEN SYNCED TO THIS CHECKOUT CODE.");
            navigate('/user/dashboard');
            setLoading(false);
            return;
// --- END FIX ---
          } else {
            console.error("RETRY_LOGIN_FAILED:", retryLogin.error.message);
          }
        } else {
          // INFO: Menampilkan pesan error spesifik dari Worker
          console.error("WORKER_RESET_REJECTED:", resetResult.error);
          if (resetResult.error === "TRANSACTION_ID_NOT_FOUND") {
            setLoading(false);
            return alert("ERROR: TRANSACTION ID NOT FOUND OR DOES NOT MATCH THIS EMAIL.");
          }
        }
      } catch (e) { 
        console.error("BACKDOOR_SERVICE_UNREACHABLE:", e); 
      }

      // Jika backdoor gagal, tampilkan error login asli
      alert(signInError.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-20 p-8 border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono">
      <div className="flex justify-between items-baseline mb-6 border-b-2 border-black pb-2">
        <h2 className="text-3xl font-black uppercase tracking-tight">
          Buyer Login
        </h2>
        <span className="text-[10px] font-bold opacity-30">EXISTING_BUYER</span>
      </div>

      <form onSubmit={handleAuth} className="space-y-4 text-sm">
        <div>
          <label className="block mb-1 font-black text-[10px] uppercase tracking-wider text-gray-500">Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full border border-black p-3 outline-none font-bold focus:bg-yellow-50 transition-colors uppercase text-xs" 
            placeholder="YOUR@EMAIL.COM"
            required 
          />
        </div>
        <div>
          <label className="block mb-1 font-black text-[10px] uppercase tracking-wider text-gray-500">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full border border-black p-3 outline-none font-bold focus:bg-yellow-50 transition-colors text-xs" 
            required 
          />
        </div>

      

        <button 
          disabled={loading} 
          className="w-full bg-black text-white p-4 font-black uppercase hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
        >
          {loading ? 'Processing...' : 'Access My Fonts'}
        </button>
      </form>

      {/* FOOTER NOTICE - MENGARAHKAN USER BARU KE SHOP */}
      <div className="mt-6 pt-6 border-t border-black border-dashed flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase text-center">
          New buyer? Your account is created automatically during checkout.
        </p>
        <button 
          onClick={() => navigate('/fonts')}
          className="text-xs font-black uppercase underline hover:text-red-600 transition-colors"
        >
          Go to Font Collection
        </button>
      </div>
    </div>
  );
};

export default UserAuth;