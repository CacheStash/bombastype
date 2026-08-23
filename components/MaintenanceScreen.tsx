import React, { useState, useEffect } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const MaintenanceScreen: React.FC = () => {
  const [typedText, setTypedText] = useState('');
  const fullText = "SYSTEM UPGRADE & INFRASTRUCTURE MAINTENANCE IN PROGRESS...";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index));
      index = (index + 1) % (fullText.length + 5);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-vintage-paper text-vintage-ink flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden font-serif selection:bg-vintage-ink selection:text-vintage-paper">
      
      {/* Background Vintage Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Header */}
      <div className="relative z-10 flex justify-between items-center border-b border-vintage-ink/20 pb-4">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest font-bold">System Status: Maintenance Mode</span>
        </div>
        <Link 
          to="/admin" 
          className="text-xs font-mono uppercase tracking-widest text-vintage-ink/40 hover:text-vintage-ink hover:underline transition-all"
        >
          Staff Portal →
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto my-auto py-10 text-center flex flex-col items-center">
        
        {/* Animated Brand Logo */}
        <div className="mb-6 relative group">
          <img 
            src="/LogoBombastype.png" 
            alt="Bombastype Logo" 
            className="h-16 sm:h-20 w-auto object-contain transition-transform duration-500 hover:scale-105"
          />
          <Sparkles className="w-5 h-5 absolute -top-3 -right-3 text-amber-700 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* Animated Gear Indicator */}
        <div className="flex items-center gap-2 mb-6 text-vintage-ink/60 font-mono text-xs uppercase tracking-wider">
          <Settings className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Routine Engine Maintenance</span>
        </div>

        {/* Brutalist Typo Terminal Subtitle */}
        <div className="border border-vintage-ink px-4 py-2 bg-vintage-ink text-vintage-paper font-mono text-xs sm:text-sm tracking-widest uppercase mb-6 shadow-sm">
          {typedText}
          <span className="animate-pulse">_</span>
        </div>

        {/* System Message */}
        <p className="max-w-lg text-sm sm:text-base text-vintage-ink/80 leading-relaxed mb-8">
          We are currently performing some necessary system maintenance, server optimizations, and backend upgrades. Everything will be back up and running smoothly in just a short while.
        </p>

        {/* Live Status Card */}
        <div className="w-full max-w-md border border-vintage-ink/30 bg-vintage-ink/5 p-4 rounded-none text-left font-mono text-xs space-y-2">
          <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
            <span className="text-vintage-ink/60">Estimated Uptime</span>
            <span className="font-bold">Moments Away</span>
          </div>
          <div className="flex justify-between border-b border-vintage-ink/10 pb-1">
            <span className="text-vintage-ink/60">Direct Inquiries</span>
            <a href="mailto:support@bombastype.com" className="underline hover:text-amber-800">support@bombastype.com</a>
          </div>
          <div className="flex justify-between">
            <span className="text-vintage-ink/60">Core Server</span>
            <span className="text-emerald-700 font-bold">Optimizing...</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center border-t border-vintage-ink/20 pt-4 font-mono text-[10px] sm:text-xs text-vintage-ink/50 uppercase tracking-widest">
        © {new Date().getFullYear()} Bombastype. All Rights Reserved.
      </div>
    </div>
  );
};

export default MaintenanceScreen;