/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, CountryOption, findCountryByName } from '../utils/affiliateGeo';
import { ChevronDown, Search, Check, Globe, X } from 'lucide-react';

interface CountryComboboxProps {
  value: string;
  onChange: (countryName: string, dialCode?: string) => void;
  placeholder?: string;
  required?: boolean;
  theme?: 'vintage' | 'brutalist';
  className?: string;
}

export const CountryCombobox: React.FC<CountryComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Type to search country (e.g. United States, United Kingdom, Canada)...',
  required = false,
  theme = 'vintage',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query with external value prop
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Handle click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const priorityCodes = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ID', 'SG', 'JP', 'NL', 'IT', 'ES', 'BR', 'IN', 'CH', 'SE', 'AE', 'NZ', 'MY', 'KR'];
      const priorityList = COUNTRIES.filter(c => priorityCodes.includes(c.code));
      const remainingList = COUNTRIES.filter(c => !priorityCodes.includes(c.code));
      return [...priorityList, ...remainingList];
    }
    return COUNTRIES.filter((c) => 
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dial.includes(q)
    );
  }, [query]);

  const handleSelectCountry = (country: CountryOption) => {
    setQuery(country.name);
    setIsOpen(false);
    onChange(country.name, country.dial);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setIsOpen(true);
    
    // Check if what was typed exactly matches a known country
    const exactMatch = findCountryByName(text);
    if (exactMatch) {
      onChange(exactMatch.name, exactMatch.dial);
    } else {
      onChange(text);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const isVintage = theme === 'vintage';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div 
        className={`flex items-center w-full border ${ isVintage ? 'border-vintage-ink bg-white text-vintage-ink' : 'border-2 border-black bg-white text-black' } transition-all`}
      >
        <span className="pl-3 pr-2 text-current opacity-50 shrink-0">
          <Globe size={15} />
        </span>

        <input
          ref={inputRef}
          type="text"
          required={required}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full py-2.5 pr-2 bg-transparent font-mono text-xs font-bold outline-none text-current"
          autoComplete="off"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 opacity-40 hover:opacity-100 transition-opacity text-current"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="pr-3 pl-1 text-current opacity-60 hover:opacity-100 transition-opacity shrink-0"
        >
          <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* AUTO-SUGGESTION FLOATING POPOVER */}
      {isOpen && (
        <div 
          className={`absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto border shadow-xl ${ isVintage ? 'border-vintage-ink bg-vintage-paper text-vintage-ink' : 'border-2 border-black bg-white text-black' }`}
        >
          {filtered.length === 0 ? (
            <div className="p-3 text-xs italic font-serif opacity-70 text-center">
              No matching country found. (You can type your custom country name)
            </div>
          ) : (
            <ul className="divide-y divide-current/10 font-mono text-xs">
              {filtered.map((country) => {
                const cleanVal = (value || '').trim().toLowerCase();
                const isSelected = cleanVal ? country.name.toLowerCase() === cleanVal : false;
                return (
                  <li key={`${country.code}-${country.name}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectCountry(country)}
                      className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${ isSelected ? (isVintage ? 'bg-vintage-ink text-vintage-paper font-bold' : 'bg-black text-white font-bold') : 'hover:bg-black/5' }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold opacity-60 shrink-0 text-[10px] w-6">
                          {country.code}
                        </span>
                        <span className="truncate">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[11px] font-bold opacity-75">
                          {country.dial}
                        </span>
                        {isSelected && <Check size={14} />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
