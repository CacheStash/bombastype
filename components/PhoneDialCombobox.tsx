/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, CountryOption } from '../utils/affiliateGeo';
import { ChevronDown, Search, Check } from 'lucide-react';

interface PhoneDialComboboxProps {
  value: string;
  onChange: (dial: string) => void;
  theme?: 'vintage' | 'brutalist';
  className?: string;
}

export const PhoneDialCombobox: React.FC<PhoneDialComboboxProps> = ({
  value,
  onChange,
  theme = 'vintage',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) {
      const priorityCodes = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ID', 'SG', 'JP', 'NL', 'IT', 'ES', 'BR', 'IN', 'CH', 'SE', 'AE', 'NZ', 'MY', 'KR'];
      const priorityList = COUNTRIES.filter(c => priorityCodes.includes(c.code));
      const remainingList = COUNTRIES.filter(c => !priorityCodes.includes(c.code));
      return [...priorityList, ...remainingList];
    }
    return COUNTRIES.filter(c => 
      c.dial.includes(s) || 
      c.name.toLowerCase().includes(s) || 
      c.code.toLowerCase().includes(s)
    );
  }, [search]);

  const isVintage = theme === 'vintage';

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1 px-3 py-3 font-mono text-xs font-bold outline-none cursor-pointer h-full border-r ${
          isVintage 
            ? 'bg-vintage-ink/5 border-vintage-ink text-vintage-ink hover:bg-vintage-ink/10' 
            : 'bg-gray-100 border-2 border-r-2 border-black text-black hover:bg-gray-200'
        } min-w-[100px]`}
      >
        <span className="truncate">{value || '+Code'}</span>
        <ChevronDown size={13} className={`opacity-60 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute left-0 top-full mt-1 z-50 w-72 max-h-64 overflow-hidden border shadow-xl flex flex-col ${
            isVintage 
              ? 'border-vintage-ink bg-vintage-paper text-vintage-ink' 
              : 'border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          {/* SEARCH BOX IN POPOVER */}
          <div className="p-2 border-b border-current/20 flex items-center gap-1.5 bg-black/5">
            <Search size={13} className="opacity-50 shrink-0" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or country..."
              className="w-full bg-transparent font-mono text-xs outline-none font-bold"
            />
          </div>

          <div className="overflow-y-auto max-h-52">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs italic font-mono opacity-60 text-center">
                No matching country code
              </div>
            ) : (
              <ul className="divide-y divide-current/10 font-mono text-xs">
                {filtered.map(c => {
                  const isSelected = c.dial === value;
                  return (
                    <li key={`${c.code}-${c.dial}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(c.dial);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-black/5 transition-colors cursor-pointer ${
                          isSelected ? (isVintage ? 'bg-vintage-ink text-vintage-paper font-bold' : 'bg-black text-white font-bold') : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold w-12 shrink-0">{c.dial}</span>
                          <span className="truncate opacity-80">{c.name}</span>
                        </div>
                        {isSelected && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
