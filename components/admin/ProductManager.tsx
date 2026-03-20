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
  useEffect(() => {
    document.body.style.overflow = showForm ? 'hidden' : 'unset';
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

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-normal uppercase tracking-tight">Inventory</h2>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-wider">Manage Typefaces</p>
        </div>
        <div className="flex items-center gap-4">
          {/* SEARCH BAR */}
          <input 
            type="text"
            placeholder="Search fonts..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="bg-white border-2 border-black px-4 py-2 text-xs font-bold uppercase outline-none focus:bg-yellow-50 w-48 md:w-64"
          />
          <button 
            onClick={() => { setEditingFont(null); setShowForm(true); }}
            className="bg-black text-white px-6 py-3 font-bold uppercase text-xs flex items-center gap-2 hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
          >
            <Plus size={16} /> Add New Font
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="border-2 border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="p-4 text-xs uppercase font-bold tracking-widest text-gray-500">Name</th>
              <th className="p-4 text-xs uppercase font-bold tracking-widest text-right text-gray-500">Actions</th>
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
                  className={`border-b border-black hover:bg-yellow-50 transition-colors cursor-move ${draggedIdx === globalIdx ? 'opacity-20' : ''}`}
                >
                  <td className="p-4 font-bold uppercase">{f.name}</td>
                  <td className="p-4 text-right space-x-4">
                    <button onClick={() => handleEdit(f)} className="text-blue-600 font-bold uppercase text-xs hover:underline inline-flex items-center gap-1"><Edit2 size={12} /> Edit</button>
                    <button onClick={() => handleDuplicate(f)} className="text-green-600 font-bold uppercase text-xs hover:underline inline-flex items-center gap-1"><Copy size={12} /> Duplicate</button>
                    <button onClick={() => handleDelete(f.id)} className="text-red-500 font-bold uppercase text-xs hover:underline inline-flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="border-2 border-black px-4 py-2 font-bold uppercase text-[10px] disabled:opacity-30 hover:bg-black hover:text-white transition-colors">Prev</button>
          <span className="font-bold text-xs uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="border-2 border-black px-4 py-2 font-bold uppercase text-[10px] disabled:opacity-30 hover:bg-black hover:text-white transition-all">Next</button>
        </div>
      )}

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-normal uppercase tracking-tight">{editingFont ? 'Edit Typeface' : 'Upload New Typeface'}</h3>
              <button onClick={() => setShowForm(false)} className="text-xs font-bold hover:underline uppercase tracking-widest">Close [X]</button>
            </div>
            <FontUploadForm initialData={editingFont} onSuccess={() => { setShowForm(false); fetchFonts(); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;