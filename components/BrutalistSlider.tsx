/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BrutalistSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

// Nama tetap BrutalistSlider agar koneksi file aman
const BrutalistSlider: React.FC<BrutalistSliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange 
}) => {
  return (
    <div className="flex flex-col gap-3 w-full group select-none py-2">
      <div className="flex justify-between items-end">
        <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-vintage-ink/50 group-hover:text-vintage-accent transition-colors duration-300">
          {label}
        </label>
        <span className="text-[10px] md:text-xs font-bold text-vintage-ink tracking-widest">
          {value}
        </span>
      </div>

      <div className="relative flex items-center h-4">
        <div className="absolute w-full h-[1px] bg-vintage-ink/20" />
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="
            absolute w-full appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-vintage-ink
            [&::-webkit-slider-thumb]:hover:bg-vintage-accent
            [&::-webkit-slider-thumb]:transition-colors
            [&::-webkit-slider-thumb]:duration-300
            
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:bg-vintage-ink
            [&::-moz-range-thumb]:hover:bg-vintage-accent
          "
        />
      </div>
    </div>
  );
};

export default BrutalistSlider;