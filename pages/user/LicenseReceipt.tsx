/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Printer, ArrowLeft, ShieldCheck, Award, MapPin, Calendar } from 'lucide-react';

const LicenseReceipt = () => {
  const { orderId } = useParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [buyerInfo, setBuyerInfo] = useState<{name: string, address: string}>({ name: 'N/A', address: 'N/A' });

  useEffect(() => {
    const fetchReceipt = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      const { data, error } = await supabase
        .from('font_history')
        .select(`
          *, 
          fonts(name),
          fontbuyer(full_name, address)
        `)
        .eq('transaction_id', orderId);
      
      if (!error && data && data.length > 0) {
        setData(data);
        const buyer = data[0].fontbuyer;
        if (buyer) {
          setBuyerInfo({
            name: buyer.full_name || 'N/A',
            address: buyer.address || 'N/A'
          });
        }
      }
      setLoading(false);
    };
    fetchReceipt();
  }, [orderId]);

  if (loading) return <div className="p-20 text-center italic opacity-40 font-serif">Consulting Archival Registry...</div>;

  const LICENSE_DB: any = {
    trial: {
      title: 'PERSONAL USE (DEMO)',
      grant: 'Permitted exclusively for personal, non-commercial use (e.g. educational assignments, portfolio pieces, or non-profit testing).',
      charSet: 'The Demo version is a trial asset and contains a limited glyph set.',
      restrictions: 'Commercial utilization, business promotion, or revenue-generating activities are strictly prohibited.'
    },
    desktop: 'DESKTOP / PRINT: Install on workstations to create static visual content (PNG, JPG, PDF) for digital and print media.',
    logo_branding: 'LOGO & BRANDING: Utilize the font as a core element of a visual identity system (Logos, Wordmarks).',
    social_web: 'DIGITAL MEDIA (SOCIAL/WEB): Specifically for digital platforms, including website embedding and social media advertising.',
    app: 'APP / GAME / EBOOK: Embed font software into mobile applications, software, games, or electronic publications.',
    broadcast: 'BROADCAST: For motion graphics, television, cinema, streaming, and video advertisements.',
    server: 'SERVER: Install on a server to facilitate automated end-user customization (Web-to-Print).',
    corporate: 'CORPORATE ALL-IN-ONE: A comprehensive license covering all categories for an entire organization with no limits on seats or impressions.'
  };

  const MASTER_TIER_LABELS: any = {
    desktop: { solo: '1 USER ONLY', team: 'UP TO 30 USER', studio: 'UP TO 100 USER', enterprise: 'UNLIMITED USER' },
    social_web: { small_50k: '50K VIEWS', medium_500k: '500K VIEWS', large_5m: '2M VIEWS', enterprise_unlimited: 'UNLIMITED VIEWS' },
    logo_branding: { personal: 'PERSONAL BRANDING', solo: '1-10 EMPLOYEES', team: '11-50 EMPLOYEES', studio: '51-250 EMPLOYEES', enterprise: '251+ EMPLOYEES' },
    app: { solo: '1 TITLE', team: 'UP TO 10 TITLES', studio: 'UP TO 50 TITLES', enterprise: 'UNLIMITED TITLES' },
    server: { solo: 'SINGLE', studio: 'UP TO 50 SERVERS', enterprise: 'UNLIMITED' },
    broadcast: { solo: 'REGIONAL', studio: 'NATIONAL', enterprise: 'WORLDWIDE' }
  };

  return (
    <div className="min-h-screen bg-vintage-background py-12 px-4 font-serif text-vintage-ink selection:bg-vintage-ink selection:text-vintage-paper">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, footer, .print-hidden { display: none !important; }
          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; padding: 0 !important; }
          .certificate-container { border: 2px solid #2c241a !important; shadow: none !important; margin: 0 !important; }
        }
      `}} />

      {/* TOOLBAR */}
      <div className="max-w-3xl mx-auto mb-10 flex justify-between items-center print-hidden">
        <Link to="/user/dashboard" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-vintage-accent hover:text-vintage-ink transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <button 
          onClick={() => window.print()}
          className="vintage-btn btn-reverse px-6 py-2 text-[10px] flex items-center gap-2"
        >
          <Printer size={14} /> PRINT LICENSE PDF
        </button>
      </div>

      {/* CERTIFICATE CONTAINER */}
      <div className="certificate-container max-w-3xl mx-auto bg-vintage-paper border-double border-4 border-vintage-ink p-8 md:p-20 relative overflow-hidden shadow-2xl">
        
        {/* WATERMARK DECOR */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <Award size={500} />
        </div>

        {/* HEADER */}
        <header className="text-center border-b border-vintage-ink/20 pb-10 mb-12 relative z-10">
          <h1 className="text-5xl md:text-6xl font-display italic leading-none mb-2">Bombastype</h1>
          <p className="text-[10px] font-bold tracking-[0.5em] uppercase text-vintage-accent">Official License Certificate</p>
        </header>

        {/* METADATA GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-16 text-[11px] uppercase tracking-wider relative z-10">
          <div className="space-y-4">
            <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
              <span className="font-bold text-vintage-accent">Registry ID</span>
              <span className="font-mono text-[10px]">{orderId?.slice(0,18)}...</span>
            </div>
            <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
              <span className="font-bold text-vintage-accent">License Holder</span>
              <span className="lowercase">{userEmail || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
              <span className="font-bold text-vintage-accent">Issue Date</span>
              <span>{new Date(data[0]?.download_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="font-bold text-vintage-accent block">Licensee Designation</span>
              <span className="font-display text-xl normal-case italic border-b border-vintage-ink/10 block pb-1">{buyerInfo.name}</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-vintage-accent block">Postal Provenance</span>
              <span className="text-[10px] leading-relaxed italic opacity-70 block">{buyerInfo.address}</span>
            </div>
          </div>
        </div>

        {/* LICENSED ASSETS */}
        <div className="space-y-16 relative z-10">
          {data.map((item: any) => {
            const isTrial = item.download_type === 'trial';
            const usages = isTrial ? ['trial'] : (item.usages || ['desktop']);
            const currentTier = isTrial ? 'SOLO' : (item.tier || 'SOLO');

            return (
              <div key={item.id} className="space-y-10">
                <div className="flex justify-between items-end border-b border-vintage-ink pb-4">
                  <h2 className="text-4xl md:text-5xl font-display leading-none">{item.fonts.name}</h2>
                  <span className={`text-[9px] font-bold tracking-[0.2em] border border-vintage-ink px-4 py-1 uppercase ${isTrial ? 'bg-vintage-accent text-vintage-paper' : 'bg-vintage-ink text-vintage-paper'}`}>
                    {isTrial ? 'Trial / Demo' : 'Commercial Release'}
                  </span>
                </div>
                
                <div className="space-y-8">
                  <p className="text-[10px] font-bold text-vintage-accent uppercase tracking-[0.3em] flex items-center gap-2">
                    <ShieldCheck size={14} /> Licensed Grant & Provisions
                  </p>
                  
                  {usages.map((u: string, idx: number) => {
                    const specificLabel = isTrial ? 'PERSONAL USE ONLY' : (MASTER_TIER_LABELS[u]?.[currentTier.toLowerCase()] || currentTier.toUpperCase());
                    
                    return (
                      <div key={idx} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-vintage-ink/2 p-6 border-l-2 border-vintage-accent">
                          <h3 className="font-display text-lg italic mb-3">
                            {isTrial ? LICENSE_DB.trial.title : `${u.replace('_', ' & ').toUpperCase()} LICENSE`}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-vintage-accent ml-3 not-italic">
                              — {specificLabel}
                            </span>
                          </h3>
                          <div className="text-[13px] leading-relaxed italic opacity-80 space-y-3">
                            {isTrial ? (
                              <>
                                <p>{LICENSE_DB.trial.grant}</p>
                                <p><span className="font-bold underline uppercase text-[10px] not-italic mr-2">Character Set:</span> {LICENSE_DB.trial.charSet}</p>
                                <p><span className="font-bold underline uppercase text-[10px] not-italic mr-2">Restrictions:</span> {LICENSE_DB.trial.restrictions}</p>
                              </>
                            ) : (
                              <p>{LICENSE_DB[u] || LICENSE_DB.desktop}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* GENERAL TERMS */}
        <div className="mt-20 pt-10 border-t border-vintage-ink/20 relative z-10">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-6 text-center text-vintage-accent">General Terms of Use</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-[10px] leading-relaxed italic opacity-60 text-center px-4">
            <p>1. Unauthorized distribution, reselling, or sub-licensing of font software to third parties is strictly prohibited.</p>
            <p>2. Modification, adaptation, or decompilation of the original font software is forbidden under copyright law.</p>
            <p>3. Intellectual property and font software remain the exclusive property of Bombastype at all times.</p>
          </div>
        </div>

        {/* FOOTER SIGNATURE */}
        <footer className="mt-20 text-center relative z-10">
          <div className="inline-block border-t border-vintage-ink px-12 pt-4">
            <p className="font-script text-3xl mb-1">Bombastype</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.5em] opacity-40">Archival Registry Division</p>
          </div>
        </footer>

        {/* CORNER DECORATIONS */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-vintage-ink/20 m-4"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-vintage-ink/20 m-4"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-vintage-ink/20 m-4"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-vintage-ink/20 m-4"></div>
      </div>
    </div>
  );
};

export default LicenseReceipt;