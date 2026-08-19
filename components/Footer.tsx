import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Instagram, Facebook, Globe } from "lucide-react";

// Icon Behance Custom SVG
const BehanceIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 9h5a2.5 2.5 0 0 1 0 5H3z" />
    <path d="M3 14h5.5a2.5 2.5 0 0 1 0 5H3z" />
    <path d="M3 4v16" />
    <path d="M14 13h7a3.5 3.5 0 0 0-7 0v2a3.5 3.5 0 0 0 7 0" />
    <path d="M15 7h5" />
  </svg>
);

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const footerLinks = [
    { name: "FONTS", href: "/fonts" },
    { name: "LICENSE", href: "/license" },
    { name: "ABOUT", href: "/about" },
    { name: "CONTACT", href: "/contact" },
    { name: "POLICY", href: "/policy" },
    { name: "FAQ", href: "/faq" },
    { name: "INSIGHTS", href: "/insights" },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const { error } = await supabase
        .from('fontsubscribers')
        .insert([{ 
          email: email.toLowerCase().trim(), 
          source: 'bombastype_footer',
          status: 'active' 
        }]);

      if (error) {
        if (error.code === '23505') throw new Error("EMAIL_ALREADY_SUBSCRIBED");
        throw error;
      }

      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      alert(err.message === "EMAIL_ALREADY_SUBSCRIBED" 
        ? "You are already subscribed to our archival updates!" 
        : "Subscription failed. Please check your connection and try again.");
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <footer className="bg-vintage-ink text-vintage-paper p-8 md:p-12 -mx-6 md:-mx-12 lg:-mx-20 -mb-6 md:-mb-12 lg:-mb-20 mt-16 md:mt-20 selection:bg-vintage-paper selection:text-vintage-ink border-t border-vintage-paper/10">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* BARIS ATAS: Subscribe Form (Full Width) */}
        <div className="mb-16">
          <form onSubmit={handleSubscribe} className="flex border border-vintage-paper/10 rounded-sm overflow-hidden bg-vintage-paper/5 w-full">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={status === 'success' ? "THANK YOU FOR SUBSCRIBING!" : "Stay updated with new historic font releases and insights."}
              className="flex-1 bg-transparent px-5 py-4 text-xs tracking-wider outline-none placeholder:text-vintage-paper/30 placeholder:uppercase disabled:opacity-50"
              disabled={status === 'loading' || status === 'success'}
              required
            />
            <button 
              type="submit"
              disabled={status === 'loading'}
              className="btn-reverse-footer px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-bold whitespace-nowrap disabled:opacity-50 transition-all cursor-pointer"
            >
              {status === 'loading' ? 'Joining...' : status === 'success' ? 'Joined!' : 'Join'}
            </button>
          </form>
        </div>

        {/* BARIS BAWAH: Info & Directory */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          
          {/* Kolom Kiri: Logo & Sosial Media */}
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <div className="mb-4">
              <img 
                src="/LOGO2.png" 
                alt="Bombastype" 
                className="h-8 md:h-10 w-auto object-contain" 
              />
            </div>
            
            <div className="flex gap-4 justify-center md:justify-start opacity-70">
              <a 
                href="https://www.instagram.com/bombastypedotcom/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Instagram"
                className="hover:text-white transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="https://www.facebook.com/bombastype/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Facebook"
                className="hover:text-white transition-colors"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="https://www.behance.net/Bombastype" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Behance"
                className="hover:text-white transition-colors"
              >
                <BehanceIcon size={18} />
              </a>
              <a 
                href="https://font.bombastype.workers.dev" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Website"
                className="hover:text-white transition-colors"
              >
                <Globe size={18} />
              </a>
            </div>
          </div>

          {/* Kolom Tengah: Menu Direktori */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-8 text-[10px] uppercase tracking-widest font-bold opacity-70">
            <div className="flex flex-col gap-3">
              {footerLinks.slice(0, 2).map((link) => (
                <Link key={link.name} to={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {footerLinks.slice(2, 4).map((link) => (
                <Link key={link.name} to={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {footerLinks.slice(4, 6).map((link) => (
                <Link key={link.name} to={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {footerLinks.slice(6, 7).map((link) => (
                <Link key={link.name} to={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Copyright */}
          <div className="text-[10px] uppercase tracking-widest opacity-40 text-center md:text-right">
            Copyright © 2026 Bombastype.<br />All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}