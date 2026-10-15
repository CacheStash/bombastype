import React, { useState } from 'react';
import { Mail, Copy, Check, MessageSquare, ShieldCheck, FileText, Sparkles, ExternalLink, LifeBuoy } from 'lucide-react';

const Support: React.FC = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const supportEmail = 'bombastype@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-8">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Customer & Creator Support</h2>
        <p className="text-xs font-bold tracking-widest text-vintage-accent uppercase mt-2 flex items-center gap-2 font-sans">
          <LifeBuoy size={14} /> Direct Assistance & Inquiries
        </p>
      </div>

      {/* MAIN SUPPORT HERO CARD */}
      <div className="border border-vintage-ink/20 p-8 sm:p-12 text-center bg-white space-y-6 shadow-xs">
        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-vintage-accent block font-sans">
            Independent Studio Desk
          </span>
          <h3 className="text-2xl sm:text-4xl font-display text-vintage-ink uppercase">
            We're Here to Help You
          </h3>
          <p className="text-xs sm:text-sm text-vintage-ink/80 font-sans max-w-xl mx-auto leading-relaxed">
            Have questions about font downloads, commercial license rights, invoice copies, or your affiliate partner earnings? Reach out to us directly anytime.
          </p>
        </div>

        {/* EMAIL ACTION BOX */}
        <div className="max-w-md mx-auto p-4 border border-vintage-ink/25 bg-vintage-background/60 space-y-3">
          <div className="flex items-center justify-between gap-2 border border-vintage-ink/30 bg-white p-2">
            <div className="flex items-center gap-2 px-2 overflow-hidden">
              <Mail size={16} className="text-vintage-accent shrink-0" />
              <span className="font-mono text-xs sm:text-sm font-bold text-vintage-ink truncate">
                {supportEmail}
              </span>
            </div>
            <button
              onClick={handleCopyEmail}
              className="vintage-btn py-1.5 px-3.5 text-[10px] tracking-wider uppercase flex items-center gap-1.5 shrink-0 font-bold"
            >
              {copiedEmail ? <Check size={13} className="text-green-800" /> : <Copy size={13} />}
              {copiedEmail ? 'COPIED' : 'COPY'}
            </button>
          </div>

          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent('[Bombastype Support Request]')}`}
            className="vintage-btn btn-reverse w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 font-sans"
          >
            <MessageSquare size={14} /> Send an Email
          </a>
        </div>

        {/* HONEST, CASUAL INDEPENDENT FOUNDRY DISCLAIMER */}
        <div className="max-w-xl mx-auto p-4 border border-vintage-ink/15 bg-vintage-paper text-left text-xs font-sans text-vintage-ink/80 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-vintage-accent tracking-wider">
            <Sparkles size={13} /> Personal Note
          </div>
          <p>
            Because Bombastype is an independent, artist-run foundry, we personally read and reply to every single email rather than sending canned bot replies. Our response time may take a little while (typically within 24 to 48 hours), but you will always get a real, human answer from the team behind the typefaces. Thank you for your patience and for supporting independent typography!
          </p>
        </div>
      </div>

      {/* QUICK ASSISTANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        <div className="p-6 border border-vintage-ink/20 bg-vintage-paper space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-vintage-ink">
            <ShieldCheck size={16} className="text-vintage-accent" />
            <span>Commercial Licensing</span>
          </div>
          <p className="text-xs text-vintage-ink/75 leading-relaxed">
            Need an extended enterprise tier, broadcast license, or app embedding package? We can draft custom terms tailored to your agency or corporate scope.
          </p>
        </div>

        <div className="p-6 border border-vintage-ink/20 bg-vintage-paper space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-vintage-ink">
            <FileText size={16} className="text-vintage-accent" />
            <span>Orders & Downloads</span>
          </div>
          <p className="text-xs text-vintage-ink/75 leading-relaxed">
            Need fresh font files (OTF, TTF, WOFF2) or an updated legal license certificate? Check your <strong>Purchase History</strong> tab or email us for direct file resending.
          </p>
        </div>

        <div className="p-6 border border-vintage-ink/20 bg-vintage-paper space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-vintage-ink">
            <ExternalLink size={16} className="text-vintage-accent" />
            <span>Partner & Affiliate Hub</span>
          </div>
          <p className="text-xs text-vintage-ink/75 leading-relaxed">
            Questions regarding referral commissions, PayPal withdrawal schedules, or custom discount tokens? We can audit attribution logs and assist your creator campaigns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Support;
