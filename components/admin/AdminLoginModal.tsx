/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Mail, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setErrorMessage('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Authentication failed.');
      }

      // Verify that the user is registered in the fontadmin table
      const { data: adminRecord, error: adminErr } = await supabase
        .from('fontadmin')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (adminErr || !adminRecord) {
        await supabase.auth.signOut();
        throw new Error('Access Denied: Administrative credentials required.');
      }

      onClose();
      navigate('/backstage');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md vintage-card bg-vintage-paper p-0 overflow-hidden shadow-2xl border border-vintage-ink/30 z-10 font-serif"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-vintage-ink/20 bg-vintage-ink/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-vintage-accent" />
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-vintage-ink">
                  Admin Access
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-vintage-ink/60 hover:text-vintage-ink transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 sm:p-10 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-3xl font-display text-vintage-ink">
                  Studio Gate
                </h3>
                <p className="text-[9px] font-bold tracking-[0.25em] text-vintage-accent uppercase italic">
                  Restricted Operator Verification
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 border border-red-700/30 bg-red-700/10 text-red-800 text-xs flex items-center gap-2 font-sans">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-vintage-ink/60 font-sans">
                      <Mail size={12} /> Email Identity
                    </label>
                    <input
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@bombastype.com"
                      className="w-full border-b border-vintage-ink/30 py-2 bg-transparent outline-none font-serif text-base focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/20"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-vintage-ink/60 font-sans">
                      <Lock size={12} /> Security Key
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full border-b border-vintage-ink/30 py-2 bg-transparent outline-none font-serif text-base focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/20"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="vintage-btn btn-reverse w-full py-4 text-[11px] font-bold tracking-[0.2em] uppercase flex justify-center items-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Access Backstage</span>
                  )}
                </button>
              </form>
            </div>

            {/* Subtle Footer Accent */}
            <div className="h-1.5 bg-vintage-ink/10 border-t border-vintage-ink/10" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminLoginModal;
