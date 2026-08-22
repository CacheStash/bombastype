import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Star } from 'lucide-react';
import FontUploadForm from './FontUploadForm';
import { supabase } from '../../lib/supabase';
import { Sparkles } from 'lucide-react';

const ProductManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingFont, setEditingFont] = useState<any>(null);
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- LOGIC: DATA FETCHING ---
  useEffect(() => {
    fetchFonts();
  }, []);

  const fetchFonts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fonts')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (data) setFonts(data);
    setLoading(false);
  };

  // --- LOGIC: DRAG & DROP REORDERING ---
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

  // --- LOGIC: ACTIONS ---
  const handleEdit = (font: any) => {
    setEditingFont(font);
    setShowForm(true);
  };

  const handleDuplicate = async (font: any) => {
    const { id, created_at, ...rest } = font;
    const duplicateData = {
      ...rest,
      name: `${font.name} (Copy)`,
    };

    try {
      const { error } = await supabase
        .from('fonts')
        .insert([duplicateData])
        .select();

      if (error) throw error;
      alert(`Asset "${duplicateData.name}" duplicated successfully.`);
      fetchFonts();
    } catch (err: any) {
      alert("Duplication Error: " + err.message);
    }
  };

  const handleToggleFeatured = async (font: any) => {
    const isFeatured = font.metadata?.is_featured || false;
    const currentFeaturedCount = fonts.filter(f => f.metadata?.is_featured).length;

    if (!isFeatured && currentFeaturedCount >= 3) {
      return alert("Archive Quota Full: Only 3 fonts can be featured simultaneously.");
    }

    try {
      const newMetadata = { ...(font.metadata || {}), is_featured: !isFeatured };
      const { error } = await supabase
        .from('fonts')
        .update({ metadata: newMetadata })
        .eq('id', font.id);

      if (error) throw error;
      
      setFonts(fonts.map(f => f.id === font.id ? { ...f, metadata: newMetadata } : f));
    } catch (err: any) {
      alert("Registry Error: " + err.message);
    }
  };

  const handleToggleHandpicked = async (font: any) => {
    const isHandpicked = font.metadata?.is_handpicked || false;
    const isFeatured = font.metadata?.is_featured || false;
    const currentHandpickedCount = fonts.filter(f => f.metadata?.is_handpicked).length;

    if (!isHandpicked && isFeatured) {
      return alert("Invalid Selection: Font yang sudah berstatus Featured tidak dapat dijadikan Handpicked.");
    }

    if (!isHandpicked && currentHandpickedCount >= 4) {
      return alert("Archive Quota Full: Maksimal 4 font yang dapat dijadikan Handpicked.");
    }

    try {
      const newMetadata = { ...(font.metadata || {}), is_handpicked: !isHandpicked };
      const { error } = await supabase
        .from('fonts')
        .update({ metadata: newMetadata })
        .eq('id', font.id);

      if (error) throw error;
      
      setFonts(fonts.map(f => f.id === font.id ? { ...f, metadata: newMetadata } : f));
    } catch (err: any) {
      alert("Registry Error: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus font ini selamanya?")) return;
    try {
      const targetFont = fonts.find(f => f.id === id);
      
      if (targetFont) {
        const filesToDelete: string[] = [
          ...(Array.isArray(targetFont.font_files) ? targetFont.font_files : []),
          ...(Array.isArray(targetFont.preview_images) ? targetFont.preview_images : []),
          ...(targetFont.trial_file_url ? [targetFont.trial_file_url] : [])
        ].filter(f => f && !/^[a-zA-Z0-9_-]{25,}$/.test(f)); // Hanya file R2

        if (filesToDelete.length > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await fetch('/api/admin/delete-batch', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ fileNames: filesToDelete })
            });
          }
        }
      }

      const { error } = await supabase.from('fonts').delete().eq('id', id);
      if (error) throw error;
      setFonts(fonts.filter(f => f.id !== id));
      alert("Font berhasil dihapus beserta asetnya.");
    } catch (err: any) { 
      alert("Error: " + err.message); 
    }
  };

  // --- LOGIC: SEARCH & PAGINATION ---
  const filteredFonts = fonts.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredFonts.length / itemsPerPage);
  const paginatedFonts = filteredFonts.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  // --- RENDER: FORM VIEW ---
  if (showForm) {
    return (
      <div className="space-y-12">
        <div className="flex items-center justify-between border-b border-vintage-ink pb-8 mb-8">
          <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">
            {editingFont ? 'Refine Archive' : 'New Entry'}
          </h2>
          <button 
            onClick={() => setShowForm(false)} 
            className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-vintage-accent transition-colors"
          >
            ← Back
          </button>
        </div>
        <FontUploadForm 
          initialData={editingFont} 
          onSuccess={() => { setShowForm(false); fetchFonts(); }} 
        />
      </div>
    );
  }

  // --- RENDER: TABLE VIEW ---
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
          <button 
            onClick={() => { setEditingFont(null); setShowForm(true); }} 
            className="vintage-btn btn-reverse px-10 py-4 text-[11px]"
          >
            <Plus size={16} className="inline mr-2" /> New Entry
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left border-collapse">
         
          <thead>
            <tr className="border-b border-vintage-ink">
              <th className="p-4 w-20"></th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-[0.3em] text-vintage-ink/60">Designation</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-[0.3em] text-right text-vintage-ink/60">Management</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="p-20 text-center italic opacity-40 font-serif">Consulting Archive Ledger...</td>
              </tr>
            ) : paginatedFonts.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-20 text-center italic opacity-40 font-serif">No artifacts found in this section.</td>
              </tr>
            ) : (
              paginatedFonts.map((f, i) => {
                const globalIdx = (currentPage - 1) * itemsPerPage + i;
                return (
                  <tr 
                    key={f.id} 
                    draggable
                    onDragStart={() => handleDragStart(globalIdx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(globalIdx)}
                    className={`border-b border-vintage-ink hover:bg-vintage-ink/5 transition-colors group cursor-grab active:cursor-grabbing ${draggedIdx === globalIdx ? 'opacity-30 border-dashed' : ''}`}
                  >
                    {/* STATUS TOGGLES (FEATURED & HANDPICKED) */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleFeatured(f); }}
                          className={`transition-all duration-500 cursor-pointer ${f.metadata?.is_featured ? 'text-vintage-accent' : 'text-vintage-ink/10 hover:text-vintage-accent/40'}`}
                          title={f.metadata?.is_featured ? "Remove from Featured" : "Set as Featured"}
                        >
                          <Star size={16} fill={f.metadata?.is_featured ? "currentColor" : "none"} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleHandpicked(f); }}
                          className={`transition-all duration-500 cursor-pointer ${f.metadata?.is_handpicked ? 'text-vintage-accent' : 'text-vintage-ink/10 hover:text-vintage-accent/40'}`}
                          title={f.metadata?.is_handpicked ? "Remove from Handpicked" : "Set as Handpicked (Max 4)"}
                        >
                          <Sparkles size={16} fill={f.metadata?.is_handpicked ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </td>
                    
                    
                    {/* FONT NAME */}
                    <td className="p-4">
                      <span className="font-display text-2xl tracking-wider select-none">{f.name}</span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-6">
                        <button 
                          type="button"
                          onClick={() => handleEdit(f)} 
                          className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDuplicate(f)} 
                          className="text-[10px] font-bold uppercase tracking-widest text-vintage-ink/60 hover:text-vintage-accent transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={12} /> Duplicate
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 pt-4 border-t border-vintage-ink/10">
          <button 
            type="button"
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
            className="border border-vintage-ink/30 px-4 py-2 font-bold uppercase text-[10px] tracking-widest disabled:opacity-20 hover:bg-vintage-ink hover:text-vintage-paper transition-all cursor-pointer"
          >
            Prev
          </button>
          <span className="font-serif italic text-sm tracking-widest text-vintage-ink/60">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            type="button"
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
            className="border border-vintage-ink/30 px-4 py-2 font-bold uppercase text-[10px] tracking-widest disabled:opacity-20 hover:bg-vintage-ink hover:text-vintage-paper transition-all cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductManager;