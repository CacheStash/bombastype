/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegister) {
        // 1. Sign Up User Baru
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          // 2. Masukkan ke tabel fontadmin
          const { error: adminError } = await supabase
            .from('fontadmin')
            .insert([{ id: data.user.id, email: email }]);
          
          if (adminError) throw new Error("User created but admin registry failed.");
          alert("Administrative record created. Please enter the dashboard.");
          setIsRegister(false);
        }
      } else {
        // Login Biasa
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) navigate('/admin');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vintage-background flex items-center justify-center p-6 selection:bg-vintage-ink selection:text-vintage-paper font-serif">
      <div className="vintage-card bg-white p-0 overflow-hidden max-w-md w-full border-double border-4 border-vintage-ink animate-in fade-in zoom-in-95 duration-500">
        
        {/* TOP DECORATIVE HEADER */}
        <div className="p-4 border-b border-vintage-ink bg-vintage-ink/5 flex justify-center items-center gap-3">
          <ShieldCheck size={16} className="text-vintage-accent" />
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-vintage-ink">
            Secure Studio Access
          </span>
        </div>

        <div className="p-10 md:p-14 space-y-10">
          {/* BRANDING */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-display leading-none text-vintage-ink">
              {isRegister ? 'Register Registry' : 'Admin Entry'}
            </h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-vintage-accent uppercase italic">
              Archival Management System
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
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors placeholder:opacity-20 italic" 
                  placeholder="admin@studio.archive"
                  required 
                />
              </div>

              {/* PASSWORD INPUT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-vintage-ink/50">
                  <Lock size={12} /> Access Key
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors" 
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
                  {isRegister ? 'COMMISSION ADMIN' : 'ENTER ARCHIVE'}
                </>
              )}
            </button>
          </form>

          {/* TOGGLE MODE */}
          <div className="pt-4 text-center border-t border-vintage-ink/10">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-[9px] font-bold uppercase tracking-[0.2em] text-vintage-accent hover:text-vintage-ink transition-colors italic"
            >
              {isRegister ? 'Already have access? Enter here' : 'Request new administrative credentials'}
            </button>
          </div>
        </div>

        {/* FOOTER BORDER DECOR */}
        <div className="h-2 bg-vintage-ink/5 border-t border-vintage-ink/10 flex justify-center gap-2 items-center">
          <div className="w-1 h-1 rounded-full bg-vintage-ink/20"></div>
          <div className="w-1 h-1 rounded-full bg-vintage-ink/20"></div>
          <div className="w-1 h-1 rounded-full bg-vintage-ink/20"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;