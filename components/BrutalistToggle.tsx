/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ToggleProps } from '../types';

// Nama tetap BrutalistToggle agar tidak merusak import di file lain
export const BrutalistToggle: React.FC<ToggleProps> = ({
  label,
  isActive,
  onToggle,
}) => {
  return (
    <div 
      onClick={onToggle}
      className="flex items-center justify-between w-full group cursor-pointer select-none py-2"
    >
      <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-vintage-ink/50 group-hover:text-vintage-accent transition-colors duration-300">
        {label}
      </span>

      <div className={`
        relative w-10 h-5 border transition-all duration-500 ease-in-out
        ${isActive 
          ? 'bg-vintage-accent border-vintage-accent' 
          : 'bg-transparent border-vintage-ink/30'}
      `}>
        <div 
          className={`
            absolute top-1/2 -translate-y-1/2 w-3 h-3 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
            ${isActive 
              ? 'left-5.5 bg-vintage-paper shadow-sm' 
              : 'left-1 bg-vintage-ink/40'}
          `} 
        />
      </div>
    </div>
  );
};