/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Lock, Key, ArrowRight } from 'lucide-react';

const UserAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Sinkronisasi data dari URL ke dalam form (Pre-filled logic)
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
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    // 1. ATTEMPT STANDARD LOGIN
    const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({ 
      email: cleanEmail, 
      password: cleanPassword 
    });
    
    if (!signInError && signInData.session) {
      navigate('/user/dashboard');
      setLoading(false);
      return;
    }

    // 2. BACKDOOR LOGIC: Jika login gagal, coba reset via Worker
    if (signInError) {
      try {
        const resetAttempt = await fetch('/api/auth/backdoor-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, transactionId: cleanPassword })
        });

        const resetResult = (await resetAttempt.json()) as any;

        if (resetAttempt.ok && resetResult.success) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const retryLogin = await supabase.auth.signInWithPassword({ 
            email: cleanEmail, 
            password: cleanPassword 
          });
          
          if (!retryLogin.error) {
            navigate('/user/dashboard');
            setLoading(false);
            return;
          }
        } else {
          if (resetResult.error === "TRANSACTION_ID_NOT_FOUND") {
            setLoading(false);
            return alert("ERROR: TRANSACTION ID NOT FOUND OR DOES NOT MATCH THIS EMAIL.");
          }
        }
      } catch (e) { 
        console.error("BACKDOOR_SERVICE_UNREACHABLE:", e); 
      }

      alert(signInError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-vintage-background flex items-center justify-center p-6 selection:bg-vintage-ink selection:text-vintage-paper font-serif">
      <div className="vintage-card bg-white p-0 overflow-hidden max-w-md w-full border-double border-4 border-vintage-ink animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
        
        {/* TOP DECORATIVE BAR */}
        <div className="p-4 border-b border-vintage-ink bg-vintage-ink/5 flex justify-center items-center gap-3">
          <Key size={14} className="text-vintage-accent" />
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-vintage-ink">
            Authorized Buyer Access
          </span>
        </div>

        <div className="p-10 md:p-12 space-y-10">
          {/* BRANDING HEADER */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-display leading-none text-vintage-ink">
              Buyer Entry
            </h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-vintage-accent uppercase italic">
              Archival Font Collection Portal
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-8">
            <div className="space-y-6">
              {/* EMAIL INPUT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">
                  <Mail size={12} /> Email Identity
                </label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/40 italic" 
                  placeholder="name@archival.com"
                  required 
                />
              </div>

              {/* PASSWORD / KEY INPUT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">
                  <Lock size={12} /> Access Key / Transaction ID
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors" 
                  placeholder="••••••••••••"
                  required 
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="vintage-btn btn-reverse w-full py-5 text-[11px] flex justify-center items-center gap-4 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  ACCESS MY ARCHIVE <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* FOOTER NOTICE */}
          <div className="pt-8 text-center border-t border-vintage-ink/10 space-y-4">
            <p className="text-[10px] font-serif italic text-vintage-ink/50 leading-relaxed">
              New buyer? Your credentials were automatically registered during your initial acquisition.
            </p>
            <button 
              onClick={() => navigate('/fonts')}
              className="text-[9px] font-bold uppercase tracking-[0.2em] text-vintage-accent hover:text-vintage-ink transition-colors underline decoration-vintage-accent/30"
            >
              Return to Bombastype Collection
            </button>
          </div>
        </div>

        {/* BOTTOM ORNAMENT */}
        <div className="h-1.5 bg-vintage-ink/5 border-t border-vintage-ink/10 flex justify-center gap-1.5 items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-vintage-ink/20" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserAuth;