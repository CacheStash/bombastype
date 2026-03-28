import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Instagram, Facebook, Twitter, Globe } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");

  const footerLinks = [
    { name: "FONTS", href: "#" },
    { name: "LICENSE", href: "#" },
    { name: "ABOUT", href: "#" },
    { name: "CONTACT", href: "#" },
    { name: "POLICY", href: "#" },
    { name: "FAQ", href: "#" },
    { name: "INSIGHTS", href: "#" },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Subscribed with email:", email);
    setEmail(""); 
  };

  return (
    <footer className="bg-vintage-ink text-vintage-paper p-8 md:p-12 -mx-6 md:-mx-12 lg:-mx-20 -mb-6 md:-mb-12 lg:-mb-20 mt-16 md:mt-20 selection:bg-vintage-paper selection:text-vintage-ink">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* BARIS ATAS: Subscribe Form (Full Width) */}
        <div className="mb-16">
          <form onSubmit={handleSubscribe} className="flex border border-vintage-paper/20 rounded-sm overflow-hidden bg-vintage-paper/5 w-full">
          <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Stay updated with new historic font releases and insights."
              className="flex-1 bg-transparent px-5 py-4 text-xs tracking-wider outline-none placeholder:text-vintage-paper/40 placeholder:uppercase"
              required
            />
            <button 
              type="submit"
              className="bg-vintage-paper text-vintage-ink px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-white transition-colors border-l border-vintage-ink"
            >
              Join
            </button>
          </form>
        </div>

        {/* BARIS BAWAH: Info & Directory */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          
          {/* Kolom Kiri: Logo & Sosial */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-blackletter mb-4">Type & Heritage</h2>
            <div className="flex gap-4 justify-center md:justify-start opacity-60">
              <Instagram size={18} className="cursor-pointer hover:text-white transition-colors" />
              <Facebook size={18} className="cursor-pointer hover:text-white transition-colors" />
              <Twitter size={18} className="cursor-pointer hover:text-white transition-colors" />
              <Globe size={18} className="cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>

          {/* Kolom Tengah: Menu dengan Struktur 2-2-2-1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-8 text-[10px] uppercase tracking-widest font-bold opacity-70">
            <div className="flex flex-col gap-3">
              {footerLinks.slice(0, 2).map((link) => (
                <a key={link.name} href={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {footerLinks.slice(2, 4).map((link) => (
                <a key={link.name} href={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {footerLinks.slice(4, 6).map((link) => (
                <a key={link.name} href={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {footerLinks.slice(6, 7).map((link) => (
                <a key={link.name} href={link.href} className="hover:text-white transition-colors w-fit">
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Copyright */}
          <div className="text-[10px] uppercase tracking-widest opacity-40 text-center md:text-right">
            Copyright © 2026 Type & Heritage.<br />All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}