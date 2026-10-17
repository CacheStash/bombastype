/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Edit3, ExternalLink, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InContextAdminBar: React.FC = () => {
  const { isAdmin, isLiveEditMode, toggleLiveEditMode } = useAdmin();

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-18 md:bottom-8 md:right-24 z-[850] flex items-center gap-3 bg-vintage-ink text-vintage-paper border border-vintage-accent/40 px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-serif animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-2 pr-3 border-r border-vintage-paper/20">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-bold uppercase tracking-wider text-[10px] text-vintage-accent font-sans">
          Admin Active
        </span>
      </div>

      <button
        onClick={toggleLiveEditMode}
        className={`flex items-center gap-1.5 px-3 py-1 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
          isLiveEditMode
            ? 'bg-vintage-accent text-white shadow-sm ring-2 ring-vintage-accent/50'
            : 'bg-vintage-paper/10 text-vintage-paper hover:bg-vintage-paper/20'
        }`}
      >
        <Edit3 size={12} />
        {isLiveEditMode ? 'Live Editor: ON' : 'Edit Page Content'}
      </button>

      <Link
        to="/backstage"
        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-vintage-paper/70 hover:text-white transition-colors pl-2"
        title="Open Backstage Admin Panel"
      >
        Backstage <ExternalLink size={11} />
      </Link>
    </div>
  );
};
