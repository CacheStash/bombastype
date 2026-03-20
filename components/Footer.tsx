import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const menuItems = ['Fonts', 'License', 'About', 'Contact', 'Policy', 'FAQ', 'Insights'];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const { error } = await supabase
        .from('fontsubscribers')
        .insert([{ 
          email: email.toLowerCase(), 
          source: 'footer_subscription',
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
        ? "YOU ARE ALREADY IN OUR SYSTEM!" 
        : "SUBSCRIPTION_FAILED. PLEASE TRY AGAIN.");
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <footer className="w-full bg-[#FF5C00] border-t border-black font-mono uppercase text-black mt-[-1px]">
      {/* BARIS SATU: NEWSLETTER (COMPACT & FULLWIDTH) */}
      <div className="w-full py-10 px-3 md:px-8 border-b border-black">
        <div className="w-full">
          <form 
            onSubmit={handleSubscribe} 
            className="w-full flex border border-black bg-white overflow-hidden"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ENTER YOUR VALID EMAIL TO GET NOTIFIED ON NEW RELEASES & EXCLUSIVE DEALS"
              className="w-full p-5 bg-transparent outline-none font-normal text-[10px] md:text-sm placeholder:text-black/40"
              required
              disabled={status === 'loading'}
            />
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="bg-black text-white px-8 md:px-12 font-black text-xs md:text-sm hover:bg-[#FF5C00] hover:text-black transition-all border-l border-black uppercase disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'loading' ? 'WAITING...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* BARIS KEDUA: 4 KOLOM */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 p-8 md:p-12 text-[11px] font-normal leading-relaxed">
        
        {/* KOLOM 1: DIRECTORY (SYCHRONIZED COLUMNS) */}
        <div className="flex flex-col gap-3">
          <span className="opacity-40 tracking-[0.2em] mb-2 italic">DIRECTORY</span>
          <div className="flex gap-16 md:gap-24">
            {/* Sub-Column Left */}
            <div className="flex flex-col gap-3">
              {menuItems.slice(0, 4).map((item) => (
                <Link key={item} to={`/${item.toLowerCase()}`} className="hover:underline tracking-widest w-fit">
                  {item}
                </Link>
              ))}
            </div>
            {/* Sub-Column Right: Sejajar dengan baris pertama kolom kiri */}
            <div className="flex flex-col gap-3">
              {menuItems.slice(4).map((item) => (
                <Link key={item} to={`/${item.toLowerCase()}`} className="hover:underline tracking-widest w-fit">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* KOLOM 2: GAP */}
        <div className="hidden md:block"></div>

        {/* KOLOM 3: SOCIAL CHANNELS */}
        <div className="flex flex-col gap-3">
          <span className="opacity-40 tracking-[0.2em] mb-2 italic">SOCIAL_CHANNELS</span>
          <a href="https://behance.net" target="_blank" rel="noopener noreferrer" className="hover:underline tracking-widest w-fit">BEHANCE</a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:underline tracking-widest w-fit">INSTAGRAM</a>
          <a href="mailto:hello@subqi.com" className="hover:underline tracking-widest w-fit">EMAIL_INQUIRY</a>
        </div>

        {/* KOLOM 4: LEGAL & HQ */}
        <div className="flex flex-col gap-1 md:text-right">
          <span className="opacity-40 tracking-[0.2em] mb-2 italic">LEGAL_AND_HQ</span>
          <span className="tracking-widest text-sm md:text-base italic font-normal">© SUBQI STUDIO 2026</span>
          <span className="opacity-80 tracking-widest">SLEMAN, YOGYAKARTA</span>
          <span className="opacity-80 tracking-widest uppercase">Indonesia</span>
          <div className="mt-6 flex md:justify-end gap-3 opacity-20 grayscale scale-90 origin-right">
             <span className="border border-black px-1">VISA</span> 
             <span className="border border-black px-1">MC</span> 
             <span className="border border-black px-1">PAYPAL</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;