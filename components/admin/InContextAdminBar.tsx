/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Edit3, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InContextAdminBar: React.FC = () => {
  const { isAdmin, isLiveEditMode, toggleLiveEditMode } = useAdmin();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bombastype_admin_bar_collapsed') === 'true';
  });

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem('bombastype_admin_bar_collapsed', String(collapsed));
  };

  if (!isAdmin) return null;

  // Collapsed Minimalist State (icon > button matching BackToTop height)
  if (isCollapsed) {
    return (
      <button
        onClick={() => handleToggleCollapse(false)}
        className="fixed bottom-4 left-4 md:bottom-8 md:left-8 z-[850] h-12 w-12 flex items-center justify-center bg-vintage-ink text-vintage-paper border border-vintage-paper/20 hover:bg-vintage-accent hover:text-white transition-all cursor-pointer shadow-lg group animate-in fade-in zoom-in-90 duration-200"
        title="Expand Admin Controls"
        aria-label="Expand Admin Controls"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-vintage-accent group-hover:bg-white absolute top-2 right-2 animate-pulse" />
        <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  // Expanded In-Context Admin Bar
  return (
    <div className="fixed bottom-4 left-4 md:bottom-8 md:left-8 z-[850] h-12 flex items-center gap-3 bg-vintage-ink text-vintage-paper border border-vintage-paper/20 px-4 text-xs font-serif animate-in fade-in slide-in-from-left-3 duration-300 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 pr-3 border-r border-vintage-paper/20 h-5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-bold uppercase tracking-wider text-[10px] text-vintage-accent font-sans">
          Admin Active
        </span>
      </div>

      <button
        onClick={toggleLiveEditMode}
        className={`flex items-center gap-1.5 px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
          isLiveEditMode
            ? 'bg-vintage-accent text-white shadow-sm ring-1 ring-vintage-accent/50'
            : 'bg-vintage-paper/10 text-vintage-paper hover:bg-vintage-paper/20'
        }`}
      >
        <Edit3 size={12} />
        {isLiveEditMode ? 'Live Editor: ON' : 'Edit Page Content'}
      </button>

      <Link
        to="/backstage"
        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-vintage-paper/70 hover:text-white transition-colors pl-1"
        title="Open Backstage Admin Panel"
      >
        Backstage <ExternalLink size={11} />
      </Link>

      {/* Collapse < button */}
      <button
        onClick={() => handleToggleCollapse(true)}
        className="ml-2 pl-2 border-l border-vintage-paper/20 h-5 flex items-center text-vintage-paper/50 hover:text-vintage-accent transition-colors cursor-pointer"
        title="Minimize Admin Bar to Left"
        aria-label="Minimize Admin Bar to Left"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
};
