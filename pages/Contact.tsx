import React, { useState } from 'react';
import { Send, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ContactCard: React.FC<{ 
  number: string, 
  title: string, 
  children: React.ReactNode 
}> = ({ number, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.6 }}
    className="mb-12 md:mb-16 w-full relative z-10"
  >
    <div className="mb-4">
      <h3 className="text-2xl md:text-5xl font-display leading-tight tracking-tight mb-4">
        <span className="opacity-40 mr-3 md:mr-6">{number}</span>
        {title}
      </h3>
    </div>
    <hr className="w-full border-vintage-ink/30 mb-6 md:mb-8" />
    <div className="space-y-6 text-base md:text-lg leading-relaxed text-vintage-ink">
      {children}
    </div>
  </motion.div>
);

const Contact: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email) || !subject || !message.trim()) {
      alert("Please provide a valid email, select a subject, and write your message.");
      return;
    }

const mailtoUrl = `mailto:bombastype@gmail.com?subject=${encodeURIComponent(`[BOMBASTYPE INQUIRY] ${subject}`)}&body=${encodeURIComponent(`FROM: ${email}\n\nMESSAGE:\n${message}`)}`;
    
    window.location.href = mailtoUrl;
  };

  return (
    <div className="pb-12 relative z-10">
      {/* HERO SECTION */}
      <section className="text-center mb-16 md:mb-24 max-w-3xl mx-auto relative z-10 px-4 pt-12">
              <motion.p className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4">
          Get in Touch
        </motion.p>
        <motion.h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight">
          Let's Keep It Human
        </motion.h2>
        <motion.p className="text-base md:text-lg lg:text-xl italic text-vintage-ink/60 leading-relaxed">
          Direct communication for typeface inquiries and collaborations.
        </motion.p>
      </section>

      {/* CONTACT FORM SECTION */}
      <section className="px-4 md:px-8 py-12 md:py-16 relative z-10">
        <ContactCard 
          number="01" 
          title="Send a Message"
        >
          <form className="space-y-12" onSubmit={handleSendMessage}>
            {/* Email Input */}
            <div className="border-b border-vintage-ink/20 pb-6">
              <label className="block text-[9px] md:text-[10px] tracking-[0.15em] uppercase font-semibold mb-4 text-vintage-ink/50">
                Email Address
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourdomain.com"
                className="w-full bg-transparent border-none outline-none text-xl md:text-3xl font-normal tracking-tight p-0 text-vintage-ink placeholder:text-vintage-ink/25"
              />
            </div>

            {/* Subject Selector */}
            <div className="border-b border-vintage-ink/20 pb-6">
              <label className="block text-[9px] md:text-[10px] tracking-[0.15em] uppercase font-semibold mb-4 text-vintage-ink/50">
                Subject
              </label>
              <select 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-lg md:text-2xl font-normal tracking-tight p-0 text-vintage-ink appearance-none cursor-pointer"
              >
                <option value="" disabled>Select an option...</option>
                <option value="support">Font Support: Technical issues or glyph help.</option>
                <option value="upgrade">License Upgrades: Expanding your scale.</option>
                <option value="custom">Custom Projects: Unique brand collaborations.</option>
                <option value="hello">Say Hello: Friendly greeting.</option>
              </select>
              <div className="mt-4 min-h-[1.5em]">
                <p className="text-xs italic text-vintage-accent font-medium">
                  {subject === "support" && "Having trouble with installation? Let's fix it together."}
                  {subject === "upgrade" && "Need more seats or views for your team? I've got you covered."}
                  {subject === "custom" && "Want a unique voice for your brand? Let's discuss a collaboration."}
                  {subject === "hello" && "Honestly, a friendly 'Hi' is often the best part of my day."}
                </p>
              </div>
            </div>

            {/* Message Textarea */}
            <div className="pb-6">
              <label className="block text-[9px] md:text-[10px] tracking-[0.15em] uppercase font-semibold mb-4 text-vintage-ink/50">
                Message
              </label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell me everything..."
                className="w-full min-h-50 bg-transparent border-none outline-none text-base md:text-lg font-normal tracking-tight p-0 text-vintage-ink placeholder:text-vintage-ink/25 resize-none leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="group w-full md:w-fit px-8 md:px-12 py-6 md:py-8 bg-vintage-ink text-vintage-paper hover:bg-vintage-accent transition-colors duration-300 flex items-center justify-center gap-4 md:gap-6 border border-vintage-ink"
            >
              <span className="text-lg md:text-2xl font-display tracking-tight">Send Message</span>
              <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" strokeWidth={1.5} />
            </button>
          </form>
        </ContactCard>
      </section>

      {/* QUICK RESOURCES SECTION */}
      <section className="px-4 md:px-8 py-12 md:py-16 relative z-10">
        <ContactCard
            number="02" 
            title="Quick Resources"
          >
          <div className="space-y-8">
            <p className="text-base md:text-lg leading-relaxed text-vintage-ink/70">
              Before sending a message, you might find an instant answer in these resources.
            </p>
            <Link 
              to="/faq" 
              className="group inline-flex items-center gap-4 text-lg md:text-xl font-display tracking-tight text-vintage-ink hover:text-vintage-accent transition-colors duration-300 pb-2 border-b border-vintage-ink/20 hover:border-vintage-accent"
            >
              License FAQ
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-[9px] md:text-[10px] tracking-[0.15em] uppercase font-semibold text-vintage-ink/50">
              Typical response time: Within 24-48 hours.
            </p>
          </div>
          </ContactCard>
      </section>

      {/* FOOTER */}
      <footer className="px-4 md:px-8 py-12 md:py-16 relative z-10 text-center border-t border-vintage-ink/20">
        <p className="text-[9px] md:text-[10px] tracking-[0.15em] uppercase font-semibold text-vintage-ink/40">
          Last Updated: February 21, 2026
        </p>
      </footer>

    </div>
  );
};

export default Contact;
