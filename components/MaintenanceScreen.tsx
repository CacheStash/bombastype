import React, { useState, useEffect } from 'react';
import { Hammer, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MaintenanceScreen: React.FC = () => {
  const [typedText, setTypedText] = useState('');
  const fullText = "CRAFTING NEW GLYPHS & REFINING FOUNDRY...";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index));
      index = (index + 1) % (fullText.length + 5);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-vintage-paper text-vintage-ink flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden font-serif selection:bg-vintage-ink selection:text-vintage-paper">
      
      {/* Background Vintage Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] bg-size-[24px_24px]" />

      {/* Top Header */}
      <div className="relative z-10 flex justify-between items-center border-b border-vintage-ink/20 pb-4">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest font-bold">Status: Under Construction</span>
        </div>
        <Link 
          to="/admin" 
          className="text-xs font-mono uppercase tracking-widest text-vintage-ink/40 hover:text-vintage-ink hover:underline transition-all"
        >
          Staff Portal →
        </Link>
      </div>

      {/* Main Content & Interactive Typography */}
      <div className="relative z-10 max-w-4xl mx-auto my-auto py-12 text-center flex flex-col items-center">
        
        {/* Animated Icon Badge */}
        <div className="mb-8 relative">
          <div className="w-20 h-20 border-2 border-vintage-ink flex items-center justify-center bg-vintage-background rotate-3 hover:rotate-0 transition-transform duration-300 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <Hammer className="w-9 h-9 animate-bounce text-vintage-ink" />
          </div>
          <Sparkles className="w-5 h-5 absolute -top-2 -right-2 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        {/* Big Title */}
        <h1 className="font-blackletter text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-none mb-6">
          Bombastype
        </h1>

        {/* Brutalist Subtitle */}
        <div className="border border-vintage-ink px-4 py-2 bg-vintage-ink text-vintage-paper font-mono text-xs sm:text-sm tracking-widest uppercase mb-8 shadow-sm">
          {typedText}
          <span className="animate-pulse">_</span>
        </div>

        <p className="max-w-xl text-sm sm:text-base text-vintage-ink/80 leading-relaxed mb-10">
          We are currently upgrading the foundry engine, perfecting our kerning pairs, and expanding our typographic collection. We will be back online shortly.
        </p>

        {/* Live Status Card */}
        <div className="w-full max-w-md border border-vintage-ink/30 bg-vintage-ink/5 p-4 rounded-none text-left font-mono text-xs space-y-2">
          <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
            <span className="text-vintage-ink/60">Estimated Uptime</span>
            <span className="font-bold">Moments Away</span>
          </div>
          <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
            <span className="text-vintage-ink/60">Inquiries</span>
            <a href="mailto:support@bombastype.com" className="underline hover:text-amber-800">support@bombastype.com</a>
          </div>
          <div className="flex justify-between">
            <span className="text-vintage-ink/60">Type Engine</span>
            <span className="text-emerald-700 font-bold">Optimizing...</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center border-t border-vintage-ink/20 pt-4 font-mono text-[10px] sm:text-xs text-vintage-ink/50 uppercase tracking-widest">
        © {new Date().getFullYear()} Bombastype Digital Foundry. All Rights Reserved.
      </div>
    </div>
  );
};

export default MaintenanceScreen;