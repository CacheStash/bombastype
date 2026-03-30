/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Tag, Calendar, Target, Trash2, Edit3, Search } from 'lucide-react';
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
    if (!promoName || !discount || !endDate) return alert("Please complete the campaign records!");
    
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

      alert(editingPromo ? "Campaign record updated!" : "New campaign commissioned!");
      handleClose();
      fetchPromos();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Terminate this campaign permanently?")) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromos();
  };

  // --- VIEW: FORM MODE ---
  if (isAdding) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b border-vintage-ink pb-8 mb-8">
          <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">
            {editingPromo ? 'Refine Provision' : 'New Provision'}
          </h2>
          <button onClick={handleClose} className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-vintage-accent transition-colors">← Back to Folio</button>
        </div>

        <div className="max-w-4xl">
          <form onSubmit={handleSavePromo} className="space-y-10">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Campaign Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Summer Solstice Archive..." 
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-display text-3xl focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/60"
                value={promoName} 
                onChange={e => setPromoName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Reduction Percentage (%)</label>
                <input 
                  type="number" 
                  placeholder="30"
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold text-xl outline-none placeholder:text-vintage-ink/60"
                  value={discount} 
                  onChange={e => setDiscount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Commencement Date</label>
                <input 
                  type="date" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none cursor-pointer"
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Expiration Date</label>
                <input 
                  type="date" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none cursor-pointer"
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent block">Targeted Inventory</label>
              <div className="flex gap-8 border-b border-vintage-ink/10 pb-4">
                <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer group">
                  <input type="radio" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="accent-vintage-ink" /> 
                  <span className="group-hover:text-vintage-accent transition-colors">Global Archive</span>
                </label>
                <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer group">
                  <input type="radio" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} className="accent-vintage-ink" /> 
                  <span className="group-hover:text-vintage-accent transition-colors">Select Typefaces</span>
                </label>
              </div>

              {targetType === 'specific' && (
                <div className="border border-vintage-ink/10 p-6 bg-vintage-ink/2 space-y-6 animate-in fade-in duration-300">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search Inventory..."
                      className="w-full bg-transparent border-b border-vintage-ink/20 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-vintage-ink transition-all placeholder:text-vintage-ink/60"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                    />
                    <Search className="absolute right-0 top-2 opacity-20" size={14} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                    {fonts
                      .filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
                      .map(f => (
                      <label key={f.id} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tighter cursor-pointer hover:bg-vintage-ink/5 p-2 transition-colors border border-transparent hover:border-vintage-ink/10">
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

            <div className="pt-8">
              <button 
                type="submit" 
                disabled={isSaving}
                className="vintage-btn btn-reverse px-16 py-5 text-[11px] w-full md:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin mr-2 inline" size={16} />
                ) : (
                  <><Plus size={16} className="mr-2 inline" /> {editingPromo ? "Commit Update" : "Launch Campaign"}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST MODE ---
  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end border-b border-vintage-ink pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Campaign Archive</h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="vintage-btn btn-reverse px-10 py-4 text-[11px]"
        >
          <Plus size={16} className="inline mr-2" /> New Provision
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-vintage-ink/80 mb-6 px-1">Active Ledger Provisions</h3>
        {loading ? (
          <div className="p-20 text-center italic opacity-40 font-serif">Consulting Campaign Registry...</div>
        ) : promos.length === 0 ? (
          <div className="p-20 border border-dashed border-vintage-ink/20 text-center">
             <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-30 italic">No active provisions found in folio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {promos.map(p => (
              <div key={p.id} className="vintage-card bg-white/40 flex flex-col justify-between group hover:border-vintage-accent transition-all duration-500">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-vintage-ink text-vintage-paper px-3 py-1 text-[10px] font-bold tracking-widest border border-vintage-ink uppercase">
                      {p.discount_percent}% Reduction
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-vintage-ink/40 uppercase tracking-tighter">
                      <Calendar size={12} /> {new Date(p.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <h3 className="text-2xl font-display text-vintage-ink leading-tight mb-2 uppercase">{p.name}</h3>
                  <p className="text-[10px] font-bold text-vintage-accent uppercase tracking-[0.2em] italic mb-6">
                    {p.type === 'global' ? 'Studio-wide Provision' : `${p.font_ids?.length} Selected Artifacts`}
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
                    className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Terminate
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

export default PromotionsManager;