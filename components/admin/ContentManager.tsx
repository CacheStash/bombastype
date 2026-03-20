import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit3, Save, X, ChevronUp, ChevronDown, FileText } from 'lucide-react';

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

  // Fungsi untuk mengotomatisasi Section ID berdasarkan kategori
  const generateSectionId = (category: string, index: number) => {
    const displayIndex = index + 1;
    if (category === 'faq') return `Q${displayIndex}`;
    return displayIndex < 10 ? `0${displayIndex}` : `${displayIndex}`;
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Diperlukan agar drop bisa berfungsi
  };

  const handleDrop = async (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems.splice(draggedItemIndex, 1)[0];
    newItems.splice(index, 0, draggedItem);

    // Update sort_order dan section_id secara otomatis berdasarkan urutan baru
    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx,
      section_id: generateSectionId(currentCategory, idx),
      updated_at: new Date().toISOString()
    }));

    setItems(updatedItems);
    setDraggedItemIndex(null);

    // Batch update ke Supabase
    try {
      const { error } = await supabase.from('site_content').upsert(updatedItems);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to sync sequence:", err);
      alert("SEQUENCE SYNC FAILED. PLEASE REFRESH.");
    }
  };
  const [currentCategory, setCurrentCategory] = useState('faq');
  const [formData, setFormData] = useState<ContentItem>({
    title: '',
    content: '',
    page_path: '/faq',
    section_id: '',
    category: 'faq',
    type: 'page',
    sort_order: 0
  });

  const categories = ['faq', 'license', 'policy', 'about', 'insights'];

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
    if (window.confirm('DELETE THIS CONTENT PERMANENTLY?')) {
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-black pb-6">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">Content_Vault</h2>
          <p className="text-xs font-bold opacity-50 uppercase">Manage static pages & documentation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCurrentCategory(cat)}
              className={`px-4 py-2 border border-black font-black text-[10px] uppercase tracking-widest transition-all ${currentCategory === cat ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FORM SECTION */}
      <form onSubmit={handleSubmit} className="border-2 border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <h3 className="font-black uppercase text-sm underline decoration-orange-500 decoration-2">
          {isEditing ? 'EDIT_ENTRY' : 'CREATE_NEW_ENTRY'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" placeholder="TITLE (e.g. Can I use for business?)" 
            className="p-3 border border-black font-bold uppercase text-xs outline-none focus:bg-orange-50"
            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <select 
              className="p-3 border border-black font-bold uppercase text-[10px] outline-none bg-white cursor-pointer"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="page">STANDARD_CARD</option>
              <option value="table">BRUTAL_TABLE</option>
              <option value="special_footer">CLOSING_STATEMENT</option>
              <option value="insight_summary">INSIGHT_SUMMARY</option>
            </select>
            <input 
              type="text" placeholder="SECTION_ID" 
              className="p-3 border border-black font-bold uppercase text-[10px] outline-none"
              value={formData.section_id} onChange={e => setFormData({...formData, section_id: e.target.value})}
              required
            />
            <input 
              type="number" placeholder="ORDER" 
              className="p-3 border border-black font-bold uppercase text-[10px] outline-none"
              value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})}
            />
          </div>
        </div>
        <textarea 
          placeholder="CONTENT (HTML ALLOWED: <b>, <br>, <ul>, etc)" 
          className="w-full h-32 p-4 border border-black font-mono text-xs outline-none focus:bg-orange-50"
          value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
          required
        />
        {formData.type === 'table' && (
          <div className="p-4 bg-gray-100 border border-black text-[10px] font-mono leading-tight">
            <p className="font-black mb-2 uppercase">Table JSON Format:</p>
            <p className="text-gray-500">
              {`{ "headers": ["COL1", "COL2"], "rows": [["DATA1", "DATA2"], ["DATA3", "DATA4"]] }`}
            </p>
          </div>
        )}
        {formData.type === 'special_footer' && (
          <div className="p-4 bg-gray-100 border border-black text-[10px] font-mono leading-tight">
            <p className="font-black mb-2 uppercase">Footer JSON Format:</p>
            <p className="text-gray-500">
              {`{ "italic_text": "Born in silence...", "location_info": "Sleman, Yogyakarta — 2026" }`}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" className="flex items-center gap-2 bg-black text-white px-6 py-3 font-black text-xs uppercase hover:bg-orange-600 transition-all">
            <Save size={16} /> {isEditing ? 'UPDATE_CONTENT' : 'PUBLISH_CONTENT'}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm} className="flex items-center gap-2 border border-black px-6 py-3 font-black text-xs uppercase hover:bg-gray-100">
              <X size={16} /> CANCEL
            </button>
          )}
        </div>
      </form>

      {/* LIST SECTION */}
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="font-black animate-pulse">SYNCING_DATA...</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              className={`border border-black p-4 bg-white flex justify-between items-center group cursor-move transition-all ${
                draggedItemIndex === index ? 'opacity-30 border-dashed bg-gray-50' : 'hover:border-orange-500'
              }`}
            >
              <div className="flex items-center gap-6">
                <span className="font-black text-2xl opacity-10 italic">#{item.sort_order}</span>
                <div>
                  <h4 className="font-black uppercase text-sm leading-none">{item.title}</h4>
                  <p className="text-[10px] font-bold opacity-40 mt-1 uppercase">ID: {item.section_id} • PATH: {item.page_path}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setFormData(item); setIsEditing(true); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 border border-black hover:bg-black hover:text-white">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(item.id!)} className="p-2 border border-black hover:bg-red-600 hover:text-white">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContentManager;