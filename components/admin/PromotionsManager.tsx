/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Tag, Calendar, Target, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PromotionsManager = () => {
  const [promos, setPromos] = useState<any[]>([]);
  const [fonts, setFonts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

  // Form State
  const [promoName, setPromoName] = useState('');
  const [discount, setDiscount] = useState('');
  const [fontSearch, setFontSearch] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('specific');
  const [selectedFonts, setSelectedFonts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPromos();
    fetchFonts();
  }, []);

  const fetchPromos = async () => {
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (data) setPromos(data);
    setLoading(false);
  };

  const fetchFonts = async () => {
    const { data } = await supabase.from('fonts').select('id, name');
    if (data) setFonts(data);
  };

  const handleEdit = (p: any) => {
    setEditingPromo(p);
    setPromoName(p.name);
    setDiscount(p.discount_percent.toString());
    setTargetType(p.type === 'global' ? 'all' : 'specific');
    setSelectedFonts(p.font_ids || []);
    setStartDate(p.start_date);
    setEndDate(p.end_date);
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingPromo(null);
    setPromoName('');
    setDiscount('');
    setEndDate('');
    setSelectedFonts([]);
    setFontSearch('');
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName || !discount || !endDate) return alert("Lengkapi data kampanye promo!");
    
    setIsSaving(true);
    try {
      const payload = {
        name: promoName,
        discount_percent: parseFloat(discount),
        start_date: startDate,
        end_date: endDate,
        type: targetType === 'all' ? 'global' : 'bundle',
        font_ids: targetType === 'all' ? fonts.map(f => f.id) : selectedFonts,
        is_active: true
      };

      const { error } = editingPromo 
        ? await supabase.from('promotions').update(payload).eq('id', editingPromo.id)
        : await supabase.from('promotions').insert([payload]);

      if (error) throw error;

      alert(editingPromo ? "Promotion archive updated!" : "New campaign launched!");
      handleClose();
      fetchPromos();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Terminate this promotion campaign?")) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromos();
  };

  return (
    <div className="space-y-12 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-vintage-ink pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Campaign Hub</h2>
          <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mt-2 italic flex items-center gap-2">
            <Tag size={12} /> Strategic Discount & Promotional Management
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="vintage-btn btn-reverse px-8 py-4 text-[10px]"
        >
          <Plus size={16} className="mr-2 inline" /> Create New Promo
        </button>
      </div>

      {/* PROMO CARDS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full p-20 text-center italic opacity-40 font-serif">Consulting Campaign Archive...</div>
        ) : promos.length === 0 ? (
          <div className="col-span-full p-20 border border-dashed border-vintage-ink/30 text-center opacity-40 font-serif italic uppercase tracking-widest text-[10px]">No active campaigns in this folio</div>
        ) : (
          promos.map(p => (
            <div key={p.id} className="vintage-card bg-white/40 flex flex-col justify-between group hover:border-vintage-accent">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-vintage-ink text-vintage-paper px-3 py-1 text-[10px] font-bold tracking-widest border border-vintage-ink uppercase">
                    {p.discount_percent}% Reduction
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-vintage-ink/40 uppercase tracking-tighter">
                    <Calendar size={12} /> Ends: {new Date(p.end_date).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="text-3xl font-display text-vintage-ink leading-tight mb-2">{p.name}</h3>
                <p className="text-[10px] font-bold text-vintage-accent uppercase tracking-[0.2em] italic mb-6">
                  {p.type === 'global' ? 'Studio-wide Provision' : `${p.font_ids?.length} Selected Typefaces`}
                </p>
              </div>

              <div className="flex gap-6 pt-4 border-t border-vintage-ink/10">
                <button 
                  onClick={() => handleEdit(p)} 
                  className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-2"
                >
                  <Edit3 size={14} /> Refine
                </button>
                <button 
                  onClick={() => handleDelete(p.id)} 
                  className="text-[10px] font-bold uppercase tracking-widest text-red-900/40 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} /> Terminate
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL FORM */}
      {isAdding && (
        <div className="fixed inset-0 bg-vintage-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="vintage-card bg-white p-0 overflow-hidden max-w-xl w-full border-double border-4 border-vintage-ink animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-vintage-ink bg-vintage-ink/5 flex justify-between items-center text-[10px] font-bold tracking-widest uppercase">
              <span className="flex items-center gap-2"><Target size={14} className="text-vintage-accent"/> Campaign Configuration</span>
              <button onClick={handleClose} className="hover:text-red-600 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSavePromo} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Campaign Designation</label>
                <input 
                  type="text" 
                  value={promoName} 
                  onChange={e => setPromoName(e.target.value)} 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-display text-2xl focus:border-vintage-ink transition-colors placeholder:opacity-20 uppercase" 
                  placeholder="e.g. SOLSTICE ARCHIVE SALE" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Reduction (%)</label>
                  <input 
                    type="number" 
                    value={discount} 
                    onChange={e => setDiscount(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold text-xl outline-none" 
                    placeholder="30" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Expiration Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Target Selection</label>
                <div className="flex gap-8">
                  <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer group">
                    <input type="radio" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="accent-vintage-ink" /> 
                    <span className="group-hover:text-vintage-accent transition-colors">Global Archive</span>
                  </label>
                  <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer group">
                    <input type="radio" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} className="accent-vintage-ink" /> 
                    <span className="group-hover:text-vintage-accent transition-colors">Specific Typefaces</span>
                  </label>
                </div>

                {targetType === 'specific' && (
                  <div className="border border-vintage-ink/10 p-4 bg-vintage-paper/20 space-y-4">
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Search Inventory..."
                        className="w-full bg-transparent border-b border-vintage-ink/20 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-vintage-ink transition-all"
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {fonts
                        .filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
                        .map(f => (
                        <label key={f.id} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tighter cursor-pointer hover:bg-vintage-ink/5 p-1 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedFonts.includes(f.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedFonts([...selectedFonts, f.id]);
                              else setSelectedFonts(selectedFonts.filter(id => id !== f.id));
                            }}
                            className="accent-vintage-ink"
                          /> {f.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="vintage-btn btn-reverse w-full py-5 text-[11px]"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  editingPromo ? "Commit Campaign Update" : "Launch Archival Campaign"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsManager;