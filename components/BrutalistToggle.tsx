import React from 'react';
import { ToggleProps } from '../types';

export const BrutalistToggle: React.FC<ToggleProps> = ({
  label,
  isActive,
  onToggle,
}) => {
  return (
    <div 
      onClick={onToggle}
      className="flex items-center justify-between w-full group cursor-pointer select-none"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">
        {label}
      </span>
      <div className={`relative w-10 h-5 border border-black transition-colors ${isActive ? 'bg-black' : 'bg-white'}`}>
        <div 
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-black transition-all duration-200 transform ${
            isActive ? 'translate-x-5 bg-white' : 'translate-x-0 bg-black'
          }`} 
        />
      </div>
    </div>
  );
};