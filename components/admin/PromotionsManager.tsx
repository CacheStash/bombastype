import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PromotionsManager = () => {
  const [promos, setPromos] = useState<any[]>([]);
  const [fonts, setFonts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- PARTIAL FIX ---
  const [editingPromo, setEditingPromo] = useState<any>(null);

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
  };
// --- END FIX ---

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

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName || !discount || !endDate) return alert("Lengkapi data promo!");
    
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

      alert(editingPromo ? "Promotion updated!" : "Promotion launched!");
      handleClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus promo ini?")) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromos();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-normal uppercase tracking-tight">Campaigns</h2>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-wider">
            Discount Management
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-black text-white px-6 py-3 font-bold uppercase text-xs flex items-center gap-2 hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
        >
          <Plus size={16} /> Create Promo
        </button>
      </div>

      {/* PROMO LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 p-20 text-center font-bold text-xs uppercase animate-pulse tracking-widest text-gray-400">Loading campaigns...</div>
        ) : promos.length === 0 ? (
          <div className="col-span-2 p-20 border-2 border-dashed border-gray-300 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">No active promotions.</div>
        ) : (
          promos.map(p => (
            <div key={p.id} className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-yellow-300 px-2 py-1 text-[10px] font-bold uppercase border border-black">
                  {p.discount_percent}% OFF
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Ends: {p.end_date}
                </span>
              </div>
              <h3 className="text-xl font-bold uppercase mb-1">{p.name}</h3>
              <p className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-wide">
                {p.type === 'global' ? 'Store-wide Sale' : `${p.font_ids?.length} Fonts Selected`}
              </p>
              <div className="flex gap-4">
               <button 
                 onClick={() => handleEdit(p)} 
                 className="text-xs font-bold border-b-2 border-black uppercase"
               >
                 Edit Campaign
               </button>
               <button onClick={() => handleDelete(p.id)} className="text-red-500 font-bold uppercase text-xs border-b-2 border-red-500">
                 End Campaign
               </button>
             </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL FORM PROMO */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black p-8 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold uppercase">Configure Promo</h3>
              <button onClick={() => setIsAdding(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Campaign Name</label>
                <input type="text" value={promoName} onChange={e => setPromoName(e.target.value)} className="w-full border border-black p-2 font-bold uppercase text-sm outline-none focus:bg-yellow-50" placeholder="E.G. RAMADAN SALE" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Discount (%)</label>
                  <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full border border-black p-2 font-bold text-sm outline-none" placeholder="30" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-black p-2 font-bold uppercase text-xs outline-none focus:bg-yellow-50" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Target Fonts</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer">
                    <input type="radio" checked={targetType === 'all'} onChange={() => setTargetType('all')} /> ALL FONTS
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer">
                    <input type="radio" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} /> SELECT FONTS
                  </label>
                </div>

                {targetType === 'specific' && (
                  <div className="max-h-32 overflow-y-auto border border-black p-2 space-y-1 bg-gray-50">
                    <div className="sticky top-0 bg-gray-50 pb-2 mb-2 border-b border-black/10 z-10">
                      <input 
                        type="text"
                        placeholder="Search font..."
                        className="w-full p-2 text-[10px] font-bold uppercase border border-black outline-none focus:bg-yellow-50"
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                      />
                    </div>
                    {fonts
                      .filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
                      .map(f => (
                      <label key={f.id} className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-white p-1">
                        <input 
                          type="checkbox" 
                          checked={selectedFonts.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedFonts([...selectedFonts, f.id]);
                            else setSelectedFonts(selectedFonts.filter(id => id !== f.id));
                          }}
                        /> {f.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-black text-white p-4 font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex justify-center items-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Launch Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsManager;