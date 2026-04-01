/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit3, Save, X, FileText, Info } from 'lucide-react';

interface ContentItem {
  id?: string;
  title: string;
  content: string;
  page_path: string;
  section_id: string;
  category: string;
  sort_order: number;
  type: string;
}

const ContentManager = () => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = useState('faq');

  const categories = ['faq', 'license', 'policy', 'about', 'insights'];

  const [formData, setFormData] = useState<ContentItem>({
    title: '',
    content: '',
    page_path: '/faq',
    section_id: '',
    category: 'faq',
    type: 'page',
    sort_order: 0
  });

  const generateSectionId = (category: string, index: number) => {
    const displayIndex = index + 1;
    if (category === 'faq') return `Q${displayIndex}`;
    return displayIndex < 10 ? `0${displayIndex}` : `${displayIndex}`;
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems.splice(draggedItemIndex, 1)[0];
    newItems.splice(index, 0, draggedItem);

    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx,
      section_id: generateSectionId(currentCategory, idx),
      updated_at: new Date().toISOString()
    }));

    setItems(updatedItems);
    setDraggedItemIndex(null);

    try {
      const { error } = await supabase.from('site_content').upsert(updatedItems);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to sync sequence:", err);
      alert("SEQUENCE SYNC FAILED. PLEASE REFRESH.");
    }
  };

  useEffect(() => {
    fetchContent();
  }, [currentCategory]);

  const fetchContent = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_content')
      .select('*')
      .eq('category', currentCategory)
      .order('sort_order', { ascending: true });
    
    if (data) setItems(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      await supabase
        .from('site_content')
        .update({ 
          ...formData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', formData.id);
    } else {
      await supabase.from('site_content').insert([formData]);
    }
    resetForm();
    fetchContent();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Discard this content record permanently?')) {
      await supabase.from('site_content').delete().eq('id', id);
      fetchContent();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      page_path: `/${currentCategory}`,
      section_id: '',
      category: currentCategory,
      type: 'page',
      sort_order: items.length
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-6">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink mb-6">Content Ledger</h2>
        <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mb-6 italic">
          Management of Static Documentation & Page Narratives
        </p>
        
        {/* CATEGORIES - Below Title */}
        <div className="flex flex-wrap gap-2 bg-vintage-paper/50 border border-vintage-ink p-1 w-fit">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setCurrentCategory(cat);
                setFormData(prev => ({...prev, category: cat, page_path: `/${cat}`}));
              }}
              className={`px-4 py-2 font-bold text-[10px] uppercase tracking-widest transition-all ${currentCategory === cat ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/5'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ENTRY FORM */}
      <div className="vintage-card bg-white/40">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center gap-3 border-b border-vintage-ink/10 pb-4">
            <div className="p-2 bg-vintage-ink text-vintage-paper">
              <FileText size={16} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-vintage-ink">
              {isEditing ? 'Refine Existing Entry' : 'Register New Content Entry'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Entry Title</label>
              <input 
                type="text" 
                placeholder="e.g. Licensing for Enterprise..." 
              
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-display text-xl focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/60"
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Display Type</label>
                <select 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none cursor-pointer"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="page">Page</option>
                  <option value="table">Table</option>
                  <option value="special_footer">Special Footer</option>
                  <option value="insight_summary">Insight Summary</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Section ID</label>
                <input 
                  type="text" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none"
                  value={formData.section_id} 
                  onChange={e => setFormData({...formData, section_id: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Sort Order</label>
                <input 
                  type="number" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none"
                  value={formData.sort_order} 
                  onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Narrative Content (HTML Permitted)</label>
            <textarea 
              placeholder="Detailed content using standard markers..." 
              className="w-full h-40 border border-vintage-ink/10 p-6 bg-vintage-paper/20 outline-none focus:border-vintage-ink font-serif text-lg italic transition-all placeholder:text-vintage-ink/60"
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})}
              required
            />
          </div>

          {/* Type-specific Helpers */}
          {(formData.type === 'table' || formData.type === 'special_footer') && (
            <div className="p-4 bg-vintage-ink/3 border border-vintage-ink/10 flex gap-4 items-start">
              <Info size={16} className="text-vintage-accent mt-1 flex-none" />
              <div className="text-[10px] font-mono leading-relaxed opacity-60">
                <p className="font-bold uppercase mb-1">JSON Template Required:</p>
                {formData.type === 'table' 
                  ? `{ "headers": ["KEY", "VALUE"], "rows": [["Data A", "Data B"]] }`
                  : `{ "italic_text": "Philosophy...", "location_info": "Studio Name — 2026" }`
                }
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="submit" className="vintage-btn btn-reverse px-10 py-4 text-[10px]">
              <Save size={14} className="mr-2 inline" /> {isEditing ? 'Commit Update' : 'Publish to Archive'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="vintage-btn px-10 py-4 text-[10px] border-vintage-ink/20">
                <X size={14} className="mr-2 inline" /> Discard Changes
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ARCHIVE LIST */}
      <div className="space-y-4">
        {/* Active Ledger Entries dibuat lebih gelap */}
        <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-vintage-ink/80 mb-6 px-1">Active Ledger Entries</h3>
        {loading ? (
          <div className="p-20 text-center italic opacity-40 font-serif">Syncing Ledger...</div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`vintage-card p-6 flex justify-between items-center group cursor-move transition-all hover:border-vintage-accent ${
                  draggedItemIndex === index ? 'opacity-30 border-dashed bg-vintage-paper' : 'bg-white/40'
                }`}
              >
                <div className="flex items-center gap-8">
                  {/* Nomor sort_order dibuat lebih gelap */}
                  <span className="font-display text-4xl text-vintage-ink/40 italic">#{item.sort_order}</span>
                  <div>
                    <h4 className="font-display text-2xl text-vintage-ink leading-none">{item.title}</h4>
                    <p className="text-[9px] font-bold text-vintage-accent mt-2 uppercase tracking-widest">
                      ID: {item.section_id} <span className="mx-2 opacity-30">|</span> PATH: {item.page_path} <span className="mx-2 opacity-30">|</span> TYPE: {item.type}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => { setFormData(item); setIsEditing(true); window.scrollTo({top: 0, behavior: 'smooth'}); }} 
                    className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-2"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id!)} 
                    className="text-[10px] font-bold uppercase tracking-widest text-red-900/40 hover:text-red-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentManager;