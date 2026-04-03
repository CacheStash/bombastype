/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, DollarSign } from 'lucide-react';
import { CartItem as CartItemType } from '../../context/CartContext';

interface Props {
  item: CartItemType;
  onRemove: (id: string) => void;
}

const CartItem: React.FC<Props> = ({ item, onRemove }) => {
  return (
<div className="border-b border-vintage-ink/10 py-8 flex justify-between items-start gap-6 group transition-all duration-500">      <div className="flex-1">
        {/* Nama Font: Title Case (Sync with Checkout) */}
        <h4 className="text-2xl md:text-3xl font-display tracking-tighter text-vintage-ink capitalize">
          {item.name.toLowerCase()}
        </h4>
        
        {/* Detail Lisensi: Small Bold Caps with Wide Tracking */}
        <div className="text-[9px] md:text-[10px] font-bold tracking-[0.3em] text-vintage-ink/50 mt-2 uppercase flex flex-wrap gap-x-4 gap-y-1">
          <span>{item.usages.join(', ')}</span>
          {item.webTierLabel && (
            <>
              <span>—</span>
              <span className="italic">{item.webTierLabel} VIEWS</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-4">
        {/* Harga: Floating Dollar Sign Icon (Sync with Checkout) */}
        <div className="flex items-start text-vintage-ink">
          <DollarSign 
            size={18} 
            className="mt-1 md:mt-2 text-vintage-accent" 
            strokeWidth={3} 
          />
          <span className="text-3xl md:text-4xl font-display tracking-tighter leading-none">
            {item.price}
          </span>
        </div>
        
        {/* Remove Button: Always Visible & Aligned */}
        <button 
          onClick={() => onRemove(item.cartId)} 
          className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-vintage-ink/30 hover:text-red-700 transition-colors duration-300 uppercase group/btn"
          aria-label="Remove item"
        >
          <span className="border-b border-vintage-ink/10 group-hover/btn:border-red-700/30 pb-0.5">
            Remove
          </span>
          <X size={12} className="transition-transform duration-300 group-hover/btn:rotate-90" />
        </button>
      </div>
    </div>
  );
};

export default CartItem;