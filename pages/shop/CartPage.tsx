/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X, ShoppingBag, DollarSign } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import CartItem from './CartItem'; 

const CartPage: React.FC = () => {
  const { cart, removeFromCart } = useCart();
  const navigate = useNavigate();
  const total = cart.reduce((acc, curr) => acc + curr.price, 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-vintage-ink/60 backdrop-blur-md">
      
      {/* Overlay Hitam Clickable */}
      <div 
        className="absolute inset-0 transition-opacity" 
        onClick={() => navigate(-1)} 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        onClick={(e) => e.stopPropagation()}
       className="w-full max-w-xl bg-vintage-paper border border-vintage-ink/20 relative text-vintage-ink overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
       >
        {/* CLOSE BUTTON */}
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-6 right-6 z-50 p-2 hover:rotate-90 transition-transform duration-500 text-vintage-ink/40 hover:text-vintage-ink"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-12 pt-16 pb-16 overflow-y-auto max-h-[85vh] custom-scrollbar">
          
          {/* HEADER SECTION (Sync with Checkout/Policy) */}
          <div className="text-center mb-16 border-b border-vintage-ink/10 pb-12">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-vintage-accent mb-4"
            >
              Transaction Review
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-display leading-tight tracking-tighter normal-case mb-6"
            >
              Order Summary
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base italic text-vintage-ink/60 max-w-sm mx-auto leading-relaxed normal-case"
            >
              A final review of your selected assets before proceeding to the secure terminal.
            </motion.p>
          </div>

          {/* ITEM LIST SECTION */}
          {cart.length > 0 ? (
            <>
              <div className="space-y-4 mb-12 min-h-25">
                {cart.map(item => (
                  <CartItem key={item.cartId} item={item} onRemove={removeFromCart} />
                ))}
              </div>
              
              {/* TOTAL SECTION (Sync with Checkout) */}
              <div className="border-t border-vintage-ink/20 pt-8 flex justify-between items-start mb-12">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-vintage-accent uppercase">
                    Total Investment
                  </span>
                  <span className="text-[10px] font-bold text-vintage-ink/40 tracking-widest mt-1 uppercase">
                    TAX & FEES INCLUDED
                  </span>
                </div>
                
                <div className="flex items-start text-vintage-ink">
                  <DollarSign size={25} className="mt-5 text-vintage-accent" strokeWidth={2.5} />
                  <span className="text-5xl md:text-7xl font-display tracking-tighter leading-none font-medium">
                    {total}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button 
                onClick={() => navigate('/checkout')}
                className="vintage-btn bg-vintage-ink! text-vintage-background! w-full py-6 flex items-center justify-center gap-4 transition-all duration-500 hover:opacity-90 group"
              >
                <span className="text-[11px] font-bold tracking-[0.4em] uppercase">Proceed to Checkout</span>
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </>
          ) : (
            /* EMPTY STATE */
            <div className="text-center py-24 flex flex-col items-center">
              <ShoppingBag size={48} className="text-vintage-ink/10 mb-6" />
              <p className="text-[10px] font-bold text-vintage-ink/30 uppercase tracking-[0.3em] mb-8">
                Your cart is currently empty
              </p>
              <button 
                onClick={() => navigate('/fonts')}
                className="vintage-btn px-10 py-4 text-[10px] font-bold tracking-[0.3em] hover:bg-vintage-ink hover:text-vintage-paper uppercase"
              >
                Browse Our Archive
              </button>
            </div>
          )}
        </div>

        {/* FOOTER DECORATION */}
        <div className="h-3 w-full bg-vintage-ink/5" />
      </motion.div>
    </div>,
    document.body
  );
};

export default CartPage;