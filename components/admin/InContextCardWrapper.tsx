/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAdmin, EditableContentItem } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { Edit3, Copy, Trash2, Plus } from 'lucide-react';

interface InContextCardWrapperProps {
  item: EditableContentItem;
  category: string;
  pagePath: string;
  onRefresh?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const InContextCardWrapper: React.FC<InContextCardWrapperProps> = ({
  item,
  category,
  pagePath,
  onRefresh,
  children,
  className = ''
}) => {
  const { isLiveEditMode, openEditorModal } = useAdmin();
  const [actionLoading, setActionLoading] = useState(false);

  if (!isLiveEditMode) {
    return <div className={className}>{children}</div>;
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditorModal(item, category, pagePath, onRefresh);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const copyPayload = {
        title: `${item.title} (Copy)`,
        content: item.content,
        category,
        page_path: pagePath,
        section_id: `${item.section_id}_CP`,
        sort_order: (item.sort_order || 0) + 1,
        type: item.type || 'page',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('site_content')
        .insert(copyPayload);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to duplicate section:', err);
      alert(`Duplicate failed: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionLoading) return;
    if (!item.id) {
      alert('Cannot delete item without database ID');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('site_content')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to delete section:', err);
      alert(`Delete failed: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`relative group border border-dashed border-vintage-accent/60 p-2 sm:p-4 my-2 transition-all ${className}`}>
      {/* Top Floating Controls Bar */}
      <div className="absolute -top-3.5 right-4 z-40 flex items-center gap-1.5 bg-vintage-ink text-vintage-paper px-2 py-0.5 shadow-md border border-vintage-accent text-[10px] font-sans uppercase font-bold tracking-wider">
        <span className="text-vintage-accent font-mono">
          {item.section_id}
        </span>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1 hover:text-vintage-accent transition-colors px-1 cursor-pointer"
          title="Edit this section"
        >
          <Edit3 size={11} /> Edit
        </button>
        <span className="opacity-30">|</span>
        <button
          onClick={handleDuplicate}
          disabled={actionLoading}
          className="flex items-center gap-1 hover:text-vintage-accent transition-colors px-1 cursor-pointer disabled:opacity-40"
          title="Duplicate this section"
        >
          <Copy size={11} /> Clone
        </button>
        <span className="opacity-30">|</span>
        <button
          onClick={handleDelete}
          disabled={actionLoading}
          className="flex items-center gap-1 hover:text-red-400 transition-colors px-1 cursor-pointer text-red-300 disabled:opacity-40"
          title="Delete this section"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>

      {children}
    </div>
  );
};

export const InContextAddSectionButton: React.FC<{
  category: string;
  pagePath: string;
  onRefresh?: () => void;
}> = ({ category, pagePath, onRefresh }) => {
  const { isLiveEditMode, openEditorModal } = useAdmin();

  if (!isLiveEditMode) return null;

  return (
    <div className="w-full my-8 flex justify-center">
      <button
        onClick={() => openEditorModal(null, category, pagePath, onRefresh)}
        className="w-full max-w-xl border-2 border-dashed border-vintage-accent/60 bg-vintage-accent/5 hover:bg-vintage-accent/10 text-vintage-ink py-4 px-6 flex items-center justify-center gap-2 font-display uppercase tracking-widest text-xs transition-all cursor-pointer shadow-xs hover:border-vintage-accent"
      >
        <Plus size={16} className="text-vintage-accent" />
        Add New Section / Table to /{category}
      </button>
    </div>
  );
};
