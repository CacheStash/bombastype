/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Tombol muncul setelah scroll 400px
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={scrollToTop}
          // Style: Menggunakan palet Vintage Paper & Ink
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-999 
                     bg-vintage-paper/80 backdrop-blur-sm text-vintage-ink 
                     p-3 border border-vintage-ink/20
                     hover:bg-vintage-ink hover:text-vintage-paper 
                     transition-all duration-500 group shadow-sm"
          aria-label="Back to top"
        >
          {/* Icon: Animasi sedikit melompat saat hover */}
          <ArrowUp 
            size={20} 
            className="group-hover:-translate-y-1 transition-transform duration-300 ease-in-out" 
          />
          
          {/* Opsional: Garis aksen kecil di bawah icon */}
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-px bg-vintage-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;