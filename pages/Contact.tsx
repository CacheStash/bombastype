import React, { useState } from 'react';
import { Plus, Send, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shared Bullet Style
const PlusBullet = () => (
  <Plus size={14} className="shrink-0 mt-[0.4em] text-black" strokeWidth={3} />
);

// Shared Box Style
const BrutalBox: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`border border-black p-8 md:p-10 bg-white ${className}`}>
    {children}
  </div>
);

const ContactCard: React.FC<{ 
  number: string, 
  title: string, 
  category: string, 
  children: React.ReactNode 
}> = ({ number, title, category, children }) => (
  <div className="mb-12 w-full border border-black bg-white relative z-10">
    {/* Title Section */}
    <div className="border-b border-black p-6 md:p-10 bg-white">
      <span className="text-[10px] font-black tracking-[0.3em] text-orange-600 block mb-4 uppercase">
        {category}
      </span>
      <h3 className="text-3xl md:text-6xl font-normal tracking-tighter uppercase leading-none">
        <span className="opacity-20 mr-4 md:mr-8">{number}</span>
        {title}
      </h3>
    </div>

    {/* Content Section */}
    <div className="p-6 md:p-14 space-y-10 normal-case text-gray-800 leading-relaxed">
      {children}
    </div>
  </div>
);

const Contact: React.FC = () => {
  const [subject, setSubject] = useState("");

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Format Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email) || !subject || !message.trim()) {
      alert("ATTENTION: ALL FIELDS ARE MANDATORY. PLEASE PROVIDE A VALID EMAIL, SELECT A SUBJECT, AND WRITE YOUR MESSAGE.");
      return;
    }

    const mailtoUrl = `mailto:amirsubqisetiaji@gmail.com?subject=${encodeURIComponent(`[SUBQI STUDIO INQUIRY] ${subject}`)}&body=${encodeURIComponent(`FROM: ${email}\n\nMESSAGE:\n${message}`)}`;
    
    window.location.href = mailtoUrl;
  };

 

  return (
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden uppercase">
      
      {/* VIBRANT BACKGROUND ORBS - Fixed Back-Layering & Pointer-Events */}
      <div className="grain-orb-base orb-top-right !-z-10 pointer-events-none" />
      <div className="grain-orb-base orb-bottom-left !-z-10 pointer-events-none" />
      <div className="grain-orb-base orb-top-right !top-auto !bottom-0 !-right-[10%] !bg-red-600/20 !-z-10 pointer-events-none" />

      <div className="max-w-full mx-auto relative z-10">
        {/* HEADER SECTION - Konsisten dengan License/Policy/FAQ */}
        <header className="px-6 py-16 md:px-8 border-b border-black mb-12 bg-transparent text-left">
          <h2 className="text-5xl md:text-8xl font-normal uppercase tracking-tighter leading-[0.85] mb-6">
            Let’s Keep <br className="hidden md:block" /> It Human
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-widest">
              No bots. No corporate jargon. Just us.
            </p>
            <p className="text-[10px] md:text-xs font-semibold text-black/40 uppercase tracking-widest">
              — LAST UPDATED: FEBRUARY 21, 2026
            </p>
          </div>
        </header>

        {/* CONTENT MAIN */}
        <main className="px-3 md:px-8 max-w-full mx-auto text-left">
          
          {/* SECTION 01: PERSONAL CONNECTION */}
          <ContactCard 
            number="01" 
            category="Communication Philosophy" 
            title="Personal Connection"
          >
            <div className="flex gap-6 items-start">
              <PlusBullet />
              <div className="space-y-6">
                <p className="text-xl md:text-2xl italic font-normal text-black">
                  Since Subqi Studio is a one-man operation, you won't get a templated response from a support department.
                </p>
                <p className="text-lg md:text-xl text-gray-600 normal-case">
                  When you reach out, you’re talking directly to me. Whether you have a technical glitch, a licensing question, or just want to share what you’re building, I’m listening.
                </p>
              </div>
            </div>
          </ContactCard>

          {/* SECTION 02: THE FORM */}
          <ContactCard 
            number="02" 
            category="Inquiry Portal" 
            title="How Can I Help?"
          >
            <form className="space-y-12" onSubmit={handleSendMessage}>
              {/* Input Email */}
              <div className="border-b border-black/10 pb-6">
                <label className="block text-[10px] font-black tracking-[0.2em] mb-4 text-black/40 uppercase">Your Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="NAME@YOURDOMAIN.COM"
                  className="w-full bg-transparent border-none outline-none text-2xl md:text-4xl font-normal tracking-tighter p-0 placeholder:text-gray-200 uppercase"
                />
              </div>

              {/* Dropdown Subject */}
              <div className="border-b border-black/10 pb-6">
                <label className="block text-[10px] font-black tracking-[0.2em] mb-4 text-black/40 uppercase">Subject of Inquiry</label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xl md:text-3xl font-normal tracking-tighter p-0 appearance-none cursor-pointer uppercase"
                >
                  <option value="" disabled>Select an option...</option>
                  <option value="support">Font Support: Technical issues or glyph help.</option>
                  <option value="upgrade">License Upgrades: Expanding your scale.</option>
                  <option value="custom">Custom Projects: Unique brand collaborations.</option>
                  <option value="hello">Say Hello: Friendly greeting.</option>
                </select>
                <div className="mt-4 min-h-[1.5em]">
                   <p className="text-xs normal-case italic text-orange-600 font-bold">
                    {subject === "support" && "Having trouble with installation? Let’s fix it together."}
                    {subject === "upgrade" && "Need more seats or views for your team? I’ve got you covered."}
                    {subject === "custom" && "Want a unique voice for your brand? Let’s discuss a collaboration."}
                    {subject === "hello" && "Honestly, a friendly 'Hi' is often the best part of my day."}
                   </p>
                </div>
              </div>

              {/* Message Area */}
              <div className="pb-6">
                <label className="block text-[10px] font-black tracking-[0.2em] mb-4 text-black/40 uppercase">Your Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="TELL ME EVERYTHING..."
                  className="w-full min-h-[200px] bg-transparent border-none outline-none text-lg md:text-xl font-normal tracking-tight p-0 placeholder:text-gray-200 resize-none normal-case leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                className="group w-full md:w-fit px-12 py-8 bg-black text-white hover:bg-orange-600 transition-colors duration-500 flex items-center justify-center gap-8 border border-black"
              >
                <span className="text-2xl md:text-4xl font-normal tracking-tighter uppercase">Send Message</span>
                <Send size={32} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" strokeWidth={1.5} />
              </button>
            </form>
          </ContactCard>

          {/* SECTION 03: QUICK RESOURCES */}
          <ContactCard 
            number="03" 
            category="Fast Support" 
            title="Quick Resources"
          >
            <div className="space-y-8">
              <p className="text-lg md:text-xl text-gray-600 normal-case">
                Before sending a message, you might find an instant answer in our dedicated documentation pages.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/faq" className="group/btn p-8 border border-black flex items-center justify-between hover:bg-black hover:text-white transition-all">
                  <span className="text-xl font-bold tracking-tighter">LICENSE FAQ</span>
                  <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
                </Link>
                <BrutalBox className="bg-[#f9f9f9] border-black/10 p-8 flex items-center">
                  <p className="text-xs normal-case italic opacity-60">
                    Typical response time: Within 24-48 hours.
                  </p>
                </BrutalBox>
              </div>
            </div>
          </ContactCard>

        </main>

        {/* Footer Spacer */}
        <div className="h-40 md:h-60 bg-transparent" />
      </div>
    </div>
  );
};

export default Contact;