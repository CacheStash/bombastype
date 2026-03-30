import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import FontUploadForm from './FontUploadForm';
import { supabase } from '../../lib/supabase';

const ProductManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingFont, setEditingFont] = useState<any>(null);
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredFonts = fonts.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredFonts.length / itemsPerPage);
  const paginatedFonts = filteredFonts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { fetchFonts(); }, []);

  const fetchFonts = async () => {
    const { data } = await supabase.from('fonts').select('*').order('display_order', { ascending: true });
    if (data) setFonts(data);
    setLoading(false);
  };

  const handleEdit = (font: any) => {
    setEditingFont(font);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus font ini selamanya?")) return;
    try {
      const { error } = await supabase.from('fonts').delete().eq('id', id);
      if (error) throw error;
      setFonts(fonts.filter(f => f.id !== id));
      alert("Font berhasil dihapus.");
    } catch (err: any) { alert("Error: " + err.message); }
  };

  if (showForm) {
    return (
      <div className="space-y-12">
        <div className="flex items-center justify-between border-b border-vintage-ink pb-8 mb-8">
          <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">Refine Archive</h2>
          <button onClick={() => setShowForm(false)} className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-vintage-accent transition-colors">← Back</button>
        </div>
        <FontUploadForm initialData={editingFont} onSuccess={() => { setShowForm(false); fetchFonts(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-vintage-ink pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-script capitalize">Inventory</h2>
        </div>
        <div className="flex items-center gap-8">
          <input 
            type="text"
            placeholder="Search Archive..."
            value={searchTerm}
            onChange={(e) => { 
              const val = e.target.value;
              const titleCase = val.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
              setSearchTerm(titleCase); 
              setCurrentPage(1); 
            }}
            className="bg-transparent border-b border-vintage-ink px-0 py-2 text-[10px] font-bold text-vintage-ink outline-none focus:border-vintage-accent w-48 md:w-64 tracking-widest transition-colors placeholder:text-vintage-ink/60"
          />
          <button onClick={() => { setEditingFont(null); setShowForm(true); }} className="vintage-btn btn-reverse px-10 py-4 text-[11px]">
            <Plus size={16} className="inline mr-2" /> New Entry
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-vintage-ink">
              <th className="p-4 text-[10px] uppercase font-bold tracking-[0.3em] text-vintage-ink/60">Designation</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-[0.3em] text-right text-vintage-ink/60">Management</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFonts.map((f) => (
              <tr key={f.id} className="border-b border-vintage-ink hover:bg-vintage-ink/2 transition-colors">
                <td className="p-4">
                  <span className="font-display text-2xl tracking-wider">{f.name}</span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-6">
                    <button onClick={() => handleEdit(f)} className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-1"><Edit2 size={12} /> Edit</button>
                    <button onClick={() => handleDelete(f.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManager;