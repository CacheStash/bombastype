import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { openFontopsyWithAuth } from '../lib/fontopsySession';

export default function Footer() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAffiliateVisible, setIsAffiliateVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isTrainer = session.user.email?.toLowerCase() === 'gotrainer19@gmail.com';
        const { data } = await supabase.from('fontadmin').select('id').eq('id', session.user.id).maybeSingle();
        const admin = !!data;
        setIsAdmin(admin);
        setIsAffiliateVisible(admin || isTrainer);
      }
    });
  }, []);

  const footerLinks = [
    { name: "FONTS", href: "/fonts" },
    { name: "LICENSE", href: "/license" },
    { name: "AFFILIATE", href: "/affiliate" },
    { name: "CONTACT", href: "/contact" },
    { name: "POLICY", href: "/policy" },
    { name: "FAQ", href: "/faq" },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      // Silently discard automated spam bot submission
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }
    setStatus('loading');

    try {
      const { validateLegitEmail } = await import('../lib/emailValidator');
      const validation = await validateLegitEmail(email);
      if (!validation.isValid) {
        throw new Error(validation.message || "INVALID_EMAIL");
      }

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
        : err.message || "Subscription failed. Please check your connection and try again.");
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <footer className="-mx-6 md:-mx-12 lg:-mx-20 -mb-6 md:-mb-12 lg:-mb-20 bg-vintage-ink text-vintage-paper mt-16 md:mt-24 border-t border-vintage-ink selection:bg-vintage-paper selection:text-vintage-ink relative z-10 mt-auto">
      
      {/* BARIS ATAS: Subscribe Form (Full Width between container edges, padding matches navbar) */}
      <div className="w-full py-8 md:py-10 px-4 md:px-8 lg:px-12 border-b border-vintage-paper/10">
        <form onSubmit={handleSubscribe} className="flex border border-vintage-paper/20 rounded-none overflow-hidden bg-vintage-paper/5 w-full relative">
          {/* Honeypot field for bot spam prevention */}
          <input 
            type="text" 
            name="b_nickname" 
            value={honeypot} 
            onChange={(e) => setHoneypot(e.target.value)} 
            tabIndex={-1} 
            autoComplete="off" 
            aria-hidden="true"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, zIndex: -1 }} 
          />
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={status === 'success' ? "THANK YOU FOR SUBSCRIBING!" : "ENTER YOUR EMAIL TO RECEIVE ARCHIVAL RELEASES & EXCLUSIVE UPDATES"}
            className="flex-1 bg-transparent px-4 md:px-6 py-4 text-xs md:text-sm tracking-wider outline-none placeholder:text-vintage-paper/30 placeholder:uppercase font-mono disabled:opacity-50"
            disabled={status === 'loading' || status === 'success'}
            required
          />
          <button 
            type="submit"
            disabled={status === 'loading'}
            className="btn-reverse-footer px-8 md:px-12 py-4 text-xs md:text-sm uppercase tracking-[0.2em] font-bold whitespace-nowrap disabled:opacity-50 transition-all cursor-pointer border-l border-vintage-paper/20"
          >
            {status === 'loading' ? 'Joining...' : status === 'success' ? 'Joined!' : 'Subscribe'}
          </button>
        </form>
      </div>

      {/* BARIS KEDUA: 4 TEXT-ONLY COLUMNS (Matching Subqi Layout with Bombastype Heritage Styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 px-4 md:px-8 lg:px-12 py-10 md:py-14 text-xs font-mono">
        
        {/* KOLOM 1: DIRECTORY */}
        <div className="flex flex-col gap-3">
          <span className="opacity-40 tracking-[0.2em] mb-1 italic font-serif uppercase text-[11px]">DIRECTORY</span>
          <div className="flex gap-12 sm:gap-16">
            <div className="flex flex-col gap-2.5">
              {footerLinks.slice(0, 3).map((link) => (
                <Link key={link.name} to={link.href} className="hover:underline hover:text-white transition-colors tracking-widest w-fit">
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {footerLinks.slice(3).map((link) => (
                <Link key={link.name} to={link.href} className="hover:underline hover:text-white transition-colors tracking-widest w-fit">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* KOLOM 2: TOOLS & LAB (No dropdown, direct clean text links) */}
        <div className="flex flex-col gap-2.5">
          <span className="opacity-40 tracking-[0.2em] mb-1 italic font-serif uppercase text-[11px]">TOOLS & LAB</span>
          <a 
            href="https://canvas.bombastype.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:underline hover:text-white transition-colors tracking-widest w-fit flex items-center gap-1.5"
          >
            <span>FONTCANVAS STUDIO</span>
            <span className="bg-vintage-paper text-vintage-ink text-[7px] px-1 py-0 h-3 leading-none flex items-center font-bold tracking-wider rounded-[2px] self-start -mt-0.5">BETA</span>
          </a>
          <a 
            href="https://fontshift.bombastype.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:underline hover:text-white transition-colors tracking-widest w-fit flex items-center gap-1.5"
          >
            <span>FONTSHIFT CONVERTER</span>
            <span className="bg-vintage-accent text-vintage-paper text-[7px] px-1 py-0 h-3 leading-none flex items-center font-bold tracking-wider rounded-[2px] self-start -mt-0.5">FREE</span>
          </a>
          <a 
            href="https://fontopsy.bombastype.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={async (e) => {
              e.preventDefault();
              await openFontopsyWithAuth('https://fontopsy.bombastype.com');
            }}
            className="hover:underline hover:text-white transition-colors tracking-widest w-fit flex items-center gap-1.5"
          >
            <span>FONTOPSY</span>
            <span className="bg-vintage-accent text-vintage-paper text-[7px] px-1 py-0 h-3 leading-none flex items-center font-bold tracking-wider rounded-[2px] self-start -mt-0.5">FREE</span>
          </a>
        </div>

        {/* KOLOM 3: SOCIAL CHANNELS (Text-only, no icons) */}
        <div className="flex flex-col gap-2.5">
          <span className="opacity-40 tracking-[0.2em] mb-1 italic font-serif uppercase text-[11px]">SOCIAL CHANNELS</span>
          <a href="https://www.behance.net/Bombastype" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white transition-colors tracking-widest w-fit">
            BEHANCE
          </a>
          <a href="https://www.instagram.com/bombastypedotcom/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white transition-colors tracking-widest w-fit">
            INSTAGRAM
          </a>
          <a href="https://www.facebook.com/bombastype/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white transition-colors tracking-widest w-fit">
            FACEBOOK
          </a>
          <a href="mailto:bombastype@gmail.com" className="hover:underline hover:text-white transition-colors tracking-widest w-fit">
            EMAIL INQUIRY
          </a>
        </div>

        {/* KOLOM 4: LEGAL & ARCHIVE */}
        <div className="flex flex-col gap-1 lg:text-right">
          <span className="opacity-40 tracking-[0.2em] mb-1 italic font-serif uppercase text-[11px]">LEGAL & ARCHIVE</span>
          <span className="tracking-widest text-sm font-serif italic text-vintage-paper font-normal">
            © BOMBASTYPE 2026
          </span>
          <span className="opacity-75 tracking-widest uppercase text-[11px]">
            SLEMAN, YOGYAKARTA
          </span>
          <span className="opacity-75 tracking-widest uppercase text-[11px]">
            INDONESIA
          </span>
          <div className="mt-4 flex lg:justify-end gap-2 opacity-30 text-[9px] tracking-wider">
            <span className="border border-vintage-paper/40 px-1 py-0.5">VISA</span>
            <span className="border border-vintage-paper/40 px-1 py-0.5">MC</span>
            <span className="border border-vintage-paper/40 px-1 py-0.5">PAYPAL</span>
          </div>
        </div>

      </div>
    </footer>
  );
}