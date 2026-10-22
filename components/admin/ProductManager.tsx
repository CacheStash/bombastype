import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Edit2, Trash2, Copy, Star, Sparkles, Download, 
  DollarSign, CheckSquare, Square, X, Check, RefreshCw, AlertCircle 
} from 'lucide-react';
import FontUploadForm from './FontUploadForm';
import { supabase } from '../../lib/supabase';

const ProductManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingFont, setEditingFont] = useState<any>(null);
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const itemsPerPage = 15;

  // --- BATCH SELECTION & PRICE ADJUSTMENT STATE ---
  const [selectedFontIds, setSelectedFontIds] = useState<string[]>([]);
  const [showBatchPriceModal, setShowBatchPriceModal] = useState(false);
  const [batchScope, setBatchScope] = useState<'all' | 'selected'>('all');
  const [adjustmentSign, setAdjustmentSign] = useState<'+' | '-'>('+');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('3.00');
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Lock background scroll & handle ESC key when Batch Price modal is active
  useEffect(() => {
    if (!showBatchPriceModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUpdatingPrices) {
        setShowBatchPriceModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBatchPriceModal, isUpdatingPrices]);

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
      setSelectedFontIds(prev => prev.filter(x => x !== id));
      alert("Font berhasil dihapus beserta asetnya.");
    } catch (err: any) { 
      alert("Error: " + err.message); 
    }
  };

  const handleDownloadZip = async (font: any) => {
    try {
      setDownloadingId(font.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Session expired, please re-login.");
        return;
      }

      const res = await fetch(`/api/admin/download-font-zip?id=${encodeURIComponent(font.id)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      const disposition = res.headers.get('Content-Disposition');
      let filename = `BT_${font.name.replace(/\s+/g, '_')}.zip`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert("Download error: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // --- SELECTION HELPERS ---
  const handleToggleSelectFont = (id: string) => {
    setSelectedFontIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedFonts.map(f => f.id);
    const allSelected = pageIds.every(id => selectedFontIds.includes(id));
    if (allSelected) {
      setSelectedFontIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedFontIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllArchive = () => {
    if (selectedFontIds.length === fonts.length) {
      setSelectedFontIds([]);
    } else {
      setSelectedFontIds(fonts.map(f => f.id));
    }
  };

  // --- BATCH PRICE ADJUSTMENT LOGIC ---
  const deltaNum = parseFloat(adjustmentAmount) || 0;
  const signedDelta = adjustmentSign === '+' ? deltaNum : -deltaNum;

  // Determine target fonts for batch price update
  const targetFontsForPriceUpdate = batchScope === 'selected' 
    ? fonts.filter(f => selectedFontIds.includes(f.id))
    : fonts;

  const handleExecuteBatchPriceAdjustment = async () => {
    if (targetFontsForPriceUpdate.length === 0) {
      alert("No fonts selected for price adjustment.");
      return;
    }

    if (deltaNum === 0) {
      alert("Please provide an adjustment amount greater than 0.");
      return;
    }

    const actionText = adjustmentSign === '+' ? `add +$${deltaNum.toFixed(2)}` : `subtract -$${deltaNum.toFixed(2)}`;
    const confirmMsg = `Are you sure you want to ${actionText} to the base valuation of ${targetFontsForPriceUpdate.length} font(s)?\n\nCommercial license matrix will be automatically scaled proportionally.`;
    if (!confirm(confirmMsg)) return;

    setIsUpdatingPrices(true);
    try {
      const updates = targetFontsForPriceUpdate.map(font => {
        const oldPrice = Number(font.price || 0);
        // Minimum floor of $1.00 USD
        const newBase = Math.max(1, Number((oldPrice + signedDelta).toFixed(2)));
        
        // Recalculate proportional license matrix
        const calc = (m: number) => m > 0 ? (m === 1 ? newBase : Math.floor(newBase * m)) : 0;
        const updatedLicensePrices = {
          desktop: { solo: calc(1), team: calc(3), studio: calc(7), enterprise: calc(15) },
          social_web: { small_50k: calc(1), medium_500k: calc(3), large_5m: calc(7), enterprise_unlimited: calc(15) },
          logo_branding: { personal: calc(2.5), solo: calc(5), team: calc(10), studio: calc(20), enterprise: calc(30) },
          app: { solo: calc(5), team: calc(12), studio: calc(25), enterprise: calc(55) },
          server: { solo: calc(5), team: 0, studio: calc(25), enterprise: calc(50) },
          broadcast: { solo: calc(5), team: 0, studio: calc(25), enterprise: calc(50) },
          corporate_full_suite: calc(150.0)
        };

        return supabase
          .from('fonts')
          .update({
            price: newBase,
            price_web: newBase,
            price_app: calc(5),
            license_prices: updatedLicensePrices
          })
          .eq('id', font.id);
      });

      await Promise.all(updates);
      await fetchFonts();
      setShowBatchPriceModal(false);
      alert(`Success! Updated prices for ${targetFontsForPriceUpdate.length} font(s).`);
    } catch (err: any) {
      alert("Batch price adjustment error: " + err.message);
    } finally {
      setIsUpdatingPrices(false);
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

  const isAllCurrentPageSelected = paginatedFonts.length > 0 && paginatedFonts.every(f => selectedFontIds.includes(f.id));

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
    <div className="space-y-12 font-sans text-vintage-ink">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-vintage-ink pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-script capitalize">Inventory</h2>
          <div className="flex items-center gap-3 mt-1 text-[11px] font-serif italic text-vintage-ink/70">
            <span>{fonts.length} Typefaces in Archive</span>
            {selectedFontIds.length > 0 && (
              <span className="font-mono font-bold text-vintage-accent px-2 py-0.5 bg-vintage-background border border-vintage-ink/30 not-italic">
                {selectedFontIds.length} Selected
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* SEARCH INPUT */}
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
            className="bg-transparent border-b border-vintage-ink px-0 py-2 text-[10px] font-bold text-vintage-ink outline-none focus:border-vintage-accent w-40 sm:w-56 tracking-widest transition-colors placeholder:text-vintage-ink/60"
          />

          {/* BATCH PRICE ADJUST TRIGGER BUTTON */}
          <button
            type="button"
            onClick={() => {
              if (selectedFontIds.length > 0) {
                setBatchScope('selected');
              } else {
                setBatchScope('all');
              }
              setShowBatchPriceModal(true);
            }}
            className="vintage-btn py-3 px-4 text-[10px] tracking-widest uppercase flex items-center gap-2 font-bold"
            title="Batch adjust base prices across all or selected fonts"
          >
            <DollarSign size={13} className="text-vintage-accent" />
            <span>Batch Price Adjust</span>
            {selectedFontIds.length > 0 && (
              <span className="px-1.5 py-0.2 bg-vintage-ink text-vintage-paper rounded-full text-[9px] font-mono">
                {selectedFontIds.length}
              </span>
            )}
          </button>

          {/* NEW ENTRY BUTTON */}
          <button 
            onClick={() => { setEditingFont(null); setShowForm(true); }} 
            className="vintage-btn btn-reverse px-8 py-3 text-[10px] tracking-widest uppercase flex items-center gap-2"
          >
            <Plus size={14} /> New Entry
          </button>
        </div>
      </div>

      {/* QUICK SELECTION CONTROLS BAR */}
      <div className="flex items-center justify-between text-xs py-2 px-1 border-b border-vintage-ink/20">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSelectAllCurrentPage}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-vintage-ink/70 hover:text-vintage-ink cursor-pointer"
          >
            {isAllCurrentPageSelected ? <CheckSquare size={14} className="text-vintage-accent" /> : <Square size={14} />}
            <span>Select Page ({paginatedFonts.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSelectAllArchive}
            className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink/70 hover:text-vintage-ink underline cursor-pointer"
          >
            {selectedFontIds.length === fonts.length ? 'Deselect All' : `Select All Archive (${fonts.length})`}
          </button>
        </div>

        {selectedFontIds.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedFontIds([])}
            className="text-[10px] uppercase font-bold text-red-900/70 hover:text-red-700"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-vintage-ink bg-vintage-background/40">
              <th className="p-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={isAllCurrentPageSelected} 
                  onChange={handleSelectAllCurrentPage} 
                  className="cursor-pointer accent-vintage-ink" 
                />
              </th>
              <th className="p-3 w-16 text-center text-xs uppercase font-bold tracking-wider text-vintage-ink font-sans">Flags</th>
              <th className="p-3 text-xs uppercase font-bold tracking-wider text-vintage-ink font-sans">Font Name</th>
              <th className="p-3 text-right text-xs uppercase font-bold tracking-wider text-vintage-ink w-32 font-sans">Base Price</th>
              <th className="p-3 text-xs uppercase font-bold tracking-wider text-right text-vintage-ink font-sans">Management</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-20 text-center italic text-vintage-ink/70 font-serif text-sm">Loading font catalog...</td>
              </tr>
            ) : paginatedFonts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center italic text-vintage-ink/70 font-serif text-sm">No fonts found in this category.</td>
              </tr>
            ) : (
              paginatedFonts.map((f, i) => {
                const globalIdx = (currentPage - 1) * itemsPerPage + i;
                const isSelected = selectedFontIds.includes(f.id);

                return (
                  <tr 
                    key={f.id} 
                    draggable
                    onDragStart={() => handleDragStart(globalIdx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(globalIdx)}
                    className={`border-b border-vintage-ink/20 hover:bg-vintage-ink/5 transition-colors group cursor-grab active:cursor-grabbing ${
                      draggedIdx === globalIdx ? 'opacity-30 border-dashed' : ''
                    } ${isSelected ? 'bg-vintage-accent/5' : ''}`}
                  >
                    {/* CHECKBOX */}
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleToggleSelectFont(f.id)} 
                        className="cursor-pointer accent-vintage-ink" 
                      />
                    </td>

                    {/* STATUS TOGGLES (FEATURED & HANDPICKED) */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleFeatured(f); }}
                          className={`transition-all duration-500 cursor-pointer ${f.metadata?.is_featured ? 'text-vintage-accent' : 'text-vintage-ink/30 hover:text-vintage-accent'}`}
                          title={f.metadata?.is_featured ? "Remove from Featured" : "Set as Featured"}
                        >
                          <Star size={14} fill={f.metadata?.is_featured ? "currentColor" : "none"} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleHandpicked(f); }}
                          className={`transition-all duration-500 cursor-pointer ${f.metadata?.is_handpicked ? 'text-vintage-accent' : 'text-vintage-ink/30 hover:text-vintage-accent'}`}
                          title={f.metadata?.is_handpicked ? "Remove from Handpicked" : "Set as Handpicked (Max 4)"}
                        >
                          <Sparkles size={14} fill={f.metadata?.is_handpicked ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </td>
                    
                    {/* FONT NAME */}
                    <td className="p-3">
                      <span className="font-display text-2xl tracking-wider select-none text-vintage-ink">{f.name}</span>
                      {f.tags && f.tags.length > 0 && (
                        <span className="block text-xs font-mono text-vintage-ink/75 truncate max-w-sm mt-0.5">
                          {Array.isArray(f.tags) ? f.tags.slice(0, 4).join(', ') : f.tags}
                        </span>
                      )}
                    </td>

                    {/* BASE PRICE BEFORE DISCOUNT */}
                    <td className="p-3 text-right font-mono font-bold text-vintage-ink text-sm">
                      ${Number(f.price || 0).toFixed(2)}
                    </td>

                    {/* ACTIONS */}
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-3.5 items-center font-sans">
                        <button 
                          type="button"
                          disabled={downloadingId === f.id}
                          onClick={() => handleDownloadZip(f)} 
                          className="text-xs font-bold uppercase tracking-wider text-vintage-ink/80 hover:text-vintage-accent transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-30"
                          title="Download font files as .zip"
                        >
                          <Download size={13} className={downloadingId === f.id ? 'animate-bounce' : ''} /> 
                          {downloadingId === f.id ? 'Zipping...' : 'Zip'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleEdit(f)} 
                          className="text-xs font-bold uppercase tracking-wider text-vintage-ink hover:text-vintage-accent transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDuplicate(f)} 
                          className="text-xs font-bold uppercase tracking-wider text-vintage-ink/80 hover:text-vintage-accent transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={13} /> Copy
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(f.id)} 
                          className="text-xs font-bold uppercase tracking-wider text-red-900/80 hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} /> Delete
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4 border-t border-vintage-ink/20">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)} 
            className="vintage-btn py-1.5 px-3 text-[10px] uppercase font-bold tracking-widest disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-mono text-xs font-bold text-vintage-ink/70">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)} 
            className="vintage-btn py-1.5 px-3 text-[10px] uppercase font-bold tracking-widest disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      {/* BATCH PRICE ADJUSTMENT MODAL (Rendered via Portal at body root with top z-index & focus lock) */}
      {showBatchPriceModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUpdatingPrices) {
              setShowBatchPriceModal(false);
            }
          }}
        >
          <div 
            className="bg-vintage-paper border border-vintage-ink/40 max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 my-auto shadow-2xl relative z-[1000000]"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-vintage-ink pb-4">
              <div>
                <span className="text-[10px] font-bold text-vintage-accent uppercase tracking-widest block">
                  Bulk Catalog Pricing Tool
                </span>
                <h3 className="text-2xl font-display font-bold">
                  Batch Price Adjustment
                </h3>
                <p className="text-xs text-vintage-ink/70 mt-0.5">
                  Increase or decrease the pre-discount base valuation across multiple typefaces at once.
                </p>
              </div>
              <button 
                onClick={() => setShowBatchPriceModal(false)}
                className="p-1 hover:bg-vintage-background border border-vintage-ink/30 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest block text-vintage-ink/80">
                1. Target Selection Scope
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBatchScope('all')}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    batchScope === 'all'
                      ? 'border-vintage-ink bg-vintage-ink text-vintage-paper font-bold'
                      : 'border-vintage-ink/30 bg-vintage-background/40 text-vintage-ink hover:border-vintage-ink'
                  }`}
                >
                  <span className="block text-xs uppercase tracking-wider font-bold">All Products</span>
                  <span className="text-[10px] opacity-80 font-mono">Affects all {fonts.length} fonts in catalog</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedFontIds.length === 0) {
                      alert("Please checklist at least one font in the inventory table first.");
                      return;
                    }
                    setBatchScope('selected');
                  }}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    batchScope === 'selected'
                      ? 'border-vintage-ink bg-vintage-ink text-vintage-paper font-bold'
                      : 'border-vintage-ink/30 bg-vintage-background/40 text-vintage-ink hover:border-vintage-ink'
                  } ${selectedFontIds.length === 0 ? 'opacity-50' : ''}`}
                >
                  <span className="block text-xs uppercase tracking-wider font-bold">Selected Only</span>
                  <span className="text-[10px] opacity-80 font-mono">
                    {selectedFontIds.length} font(s) currently checked
                  </span>
                </button>
              </div>
            </div>

            {/* Adjustment Form */}
            <div className="space-y-3 p-4 border border-vintage-ink bg-vintage-background/50">
              <label className="text-[10px] font-bold uppercase tracking-widest block text-vintage-ink/80">
                2. Price Change Amount ($ USD)
              </label>

              <div className="flex items-center gap-3">
                {/* Sign Selector (+ or -) */}
                <div className="flex border border-vintage-ink bg-vintage-paper">
                  <button
                    type="button"
                    onClick={() => setAdjustmentSign('+')}
                    className={`px-4 py-2 font-display text-lg font-bold transition-colors cursor-pointer ${
                      adjustmentSign === '+' ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/10'
                    }`}
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentSign('-')}
                    className={`px-4 py-2 font-display text-lg font-bold transition-colors cursor-pointer ${
                      adjustmentSign === '-' ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/10'
                    }`}
                  >
                    - Deduct
                  </button>
                </div>

                {/* Amount Input */}
                <div className="relative grow">
                  <span className="absolute left-3 top-2.5 font-bold text-vintage-ink/60">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={adjustmentAmount}
                    onChange={e => setAdjustmentAmount(e.target.value)}
                    className="vintage-input pl-7 pr-3 py-2 font-mono text-base font-bold w-full"
                    placeholder="3.00"
                  />
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-vintage-ink/60 mr-1">Presets:</span>
                {['1.00', '2.00', '2.50', '3.00', '5.00', '10.00'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAdjustmentAmount(val)}
                    className={`px-2 py-0.5 text-[10px] font-mono border border-vintage-ink/30 hover:border-vintage-ink bg-vintage-paper transition-colors ${
                      adjustmentAmount === val ? 'font-bold bg-vintage-ink/10 border-vintage-ink' : ''
                    }`}
                  >
                    {adjustmentSign}${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Impact Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest block text-vintage-ink/80">
                  3. Live Impact Preview ({targetFontsForPriceUpdate.length} Typefaces)
                </label>
                <span className="text-[9px] font-serif italic text-vintage-ink/60">
                  Safety floor: Min $1.00 USD
                </span>
              </div>

              <div className="border border-vintage-ink/40 max-h-48 overflow-y-auto bg-vintage-paper">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-vintage-ink/30 bg-vintage-background/80 text-[9px] font-bold uppercase">
                      <th className="p-2 border-r border-vintage-ink/20">Typeface</th>
                      <th className="p-2 border-r border-vintage-ink/20 text-right">Current Base</th>
                      <th className="p-2 border-r border-vintage-ink/20 text-right">Adjustment</th>
                      <th className="p-2 text-right text-vintage-accent font-bold">New Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-ink/10 text-[11px]">
                    {targetFontsForPriceUpdate.map(font => {
                      const oldP = Number(font.price || 0);
                      const newP = Math.max(1, Number((oldP + signedDelta).toFixed(2)));
                      return (
                        <tr key={font.id} className="hover:bg-vintage-background/40">
                          <td className="p-2 border-r border-vintage-ink/20 font-sans font-bold">{font.name}</td>
                          <td className="p-2 border-r border-vintage-ink/20 text-right">${oldP.toFixed(2)}</td>
                          <td className={`p-2 border-r border-vintage-ink/20 text-right font-bold ${
                            adjustmentSign === '+' ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {adjustmentSign}${deltaNum.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-bold text-vintage-ink">
                            ${newP.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] font-serif italic text-vintage-ink/70">
                Notice: All extended commercial licenses (Desktop Team/Studio, Web, App, Logo, Broadcast, Corporate) will be automatically scaled proportionally with the new base valuation.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-vintage-ink/20">
              <button
                type="button"
                onClick={() => setShowBatchPriceModal(false)}
                disabled={isUpdatingPrices}
                className="vintage-btn py-2 px-4 text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchPriceAdjustment}
                disabled={isUpdatingPrices || targetFontsForPriceUpdate.length === 0}
                className="vintage-btn bg-vintage-ink! text-vintage-paper! py-2 px-6 text-xs uppercase font-bold tracking-wider flex items-center gap-2"
              >
                {isUpdatingPrices ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> APPLYING CHANGES...
                  </>
                ) : (
                  <>
                    <Check size={14} /> APPLY TO {targetFontsForPriceUpdate.length} FONTS
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ProductManager;