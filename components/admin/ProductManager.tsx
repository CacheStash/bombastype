import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import FontUploadForm from './FontUploadForm';
import { supabase } from '../../lib/supabase';

const ProductManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingFont, setEditingFont] = useState<any>(null);
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  // LOGIK SEARCH & PAGINATION
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter data berdasarkan input search
  const filteredFonts = fonts.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Potong data untuk pagination
  const totalPages = Math.ceil(filteredFonts.length / itemsPerPage);
  const paginatedFonts = filteredFonts.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  useEffect(() => { fetchFonts(); }, []);

  // Scroll Lock saat Modal Aktif
  // Scroll Lock dihapus karena form sudah inline (bukan modal)
  useEffect(() => {
    document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showForm]);

  const fetchFonts = async () => {
    // Ambil data berdasarkan display_order (Stacking)
    const { data } = await supabase.from('fonts').select('*').order('display_order', { ascending: true });
    if (data) setFonts(data);
    setLoading(false);
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const newFonts = [...fonts];
    const draggedItem = newFonts[draggedIdx];
    newFonts.splice(draggedIdx, 1);
    newFonts.splice(idx, 0, draggedItem);
    
    const updatedFonts = newFonts.map((f, i) => ({ ...f, display_order: i }));
    setFonts(updatedFonts);
    setDraggedIdx(null);

    const updates = updatedFonts.map(f => 
      supabase.from('fonts').update({ display_order: f.display_order }).eq('id', f.id)
    );
    await Promise.all(updates);
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

  const handleDuplicate = async (font: any) => {
    if (!confirm(`Duplicate "${font.name}"?`)) return;
    try {
      const { id, created_at, ...duplicateData } = font;
      const { error } = await supabase
        .from('fonts')
        .insert([{ ...duplicateData, name: `${font.name} COPY`, created_at: new Date().toISOString() }]);
      if (error) throw error;
      fetchFonts();
      alert("Berhasil diduplikasi.");
    } catch (err: any) { alert("Error: " + err.message); }
  };

  if (showForm) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b border-vintage-ink/10 pb-8 mb-8">
          <div>
            <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">
              {editingFont ? 'Refine Archive' : 'Register Heritage'}
            </h2>
            <p className="text-sm italic opacity-60 font-serif mt-2">Meticulously documenting typographic history and provenance.</p>
          </div>
          <button 
            onClick={() => setShowForm(false)}
            className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-vintage-accent transition-colors flex items-center gap-2"
          >
            ← Back to Inventory
          </button>
        </div>
        <FontUploadForm initialData={editingFont} onSuccess={() => { setShowForm(false); fetchFonts(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end border-b border-vintage-ink/10 pb-8">
        <div>
          <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">Inventory</h2>
          <p className="text-sm italic opacity-60 font-serif mt-2 tracking-wide">Managing the collection of historic typefaces.</p>
        </div>
        <div className="flex items-center gap-8">
          {/* SEARCH BAR */}
          <input 
            type="text"
            placeholder="SEARCH ARCHIVE..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-b border-vintage-ink/20 px-0 py-2 text-[10px] font-bold uppercase outline-none focus:border-vintage-ink w-48 md:w-64 tracking-widest transition-colors placeholder:opacity-30"
          />
          <button 
            onClick={() => { setEditingFont(null); setShowForm(true); }}
            className="vintage-btn btn-reverse px-10 py-4 text-[11px]"
          >
            <Plus size={16} className="inline mr-2" /> New Entry
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-vintage-ink/10">
              <th className="p-4 text-[10px] uppercase font-bold tracking-[0.3em] text-vintage-ink/40">Designation</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-[0.3em] text-right text-vintage-ink/40">Management</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFonts.map((f, i) => {
              const globalIdx = (currentPage - 1) * itemsPerPage + i;
              return (
                <tr 
                  key={f.id} 
                  draggable
                  onDragStart={() => handleDragStart(globalIdx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(globalIdx)}
                  className={`border-b border-vintage-ink/5 hover:bg-vintage-ink/2 transition-colors cursor-move ${draggedIdx === globalIdx ? 'opacity-20' : ''}`}
                >
                  <td className="p-4">
                    <span className="font-display text-2xl uppercase tracking-wider">{f.name}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-6">
                      <button onClick={() => handleEdit(f)} className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-1"><Edit2 size={12} /> Edit</button>
                      <button onClick={() => handleDuplicate(f)} className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-1"><Copy size={12} /> Clone</button>
                      <button onClick={() => handleDelete(f.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-900/40 hover:text-red-600 transition-colors flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-8 mt-12 border-t border-vintage-ink/10 pt-8">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 hover:text-vintage-accent transition-colors">Previous</button>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">{currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 hover:text-vintage-accent transition-colors">Next</button>
        </div>
      )}
    </div>
  );
};

export default ProductManager;