import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Pastikan path ini benar sesuai folder lib kamu

// Definisi tipe untuk hasil API agar TypeScript tidak error
interface UploadResponse {
  success: boolean;
  fileName: string;
  url: string;
  error?: string;
}

// Menambahkan props initialData & onSuccess untuk fitur EDIT
const FontUploadForm = ({ initialData, onSuccess }: { initialData?: any, onSuccess?: () => void }) => {
  // 1. State untuk Form (Diambil dari initialData jika sedang mode EDIT)
  const [fontName, setFontName] = useState(initialData?.name || '');
  const FONT_TAGS_LIBRARY = [
    // Dasar & Teknis
    "Sans Serif", "Serif", "Slab Serif", "Monospace", "Variable Font", "Display", "Text", "Stencil", "Blackletter", "Script", "Handwritten",
    // Sub-Klasifikasi Serif
    "Didone", "Old Style", "Transitional", "Modern Serif", "Glyphic", "Didot", "Garalde", "Humanist Serif",
    // Sub-Klasifikasi Sans
    "Geometric Sans", "Grotesque", "Neo-Grotesque", "Humanist Sans", "Grotesk",
    // Gaya & Era
    "Art Deco", "Art Nouveau", "Bauhaus", "Vintage", "Retro", "Victorian", "Mid-Century", "Y2K", "90s", "80s", "Cyberpunk", "Futuristic",
    // Vibe & Mood
    "Minimalist", "Brutalism", "Acid", "Experimental", "Liquid", "Distorted", "Elegant", "Luxury", "Classic", "Editorial", "Fashion", "Corporate",
    // Khusus & Dekoratif
    "Horror", "Gothic", "Old English", "Fraktur", "Calligraphy", "Signature", "Brush", "Marker", "Comic", "Pixel", "Gaming", "Sports", "Techno",
    // Karakteristik Fisik
    "Condensed", "Expanded", "Narrow", "Wide", "Outline", "Inline", "Shadow", "Soft Edges", "Rounded", "Sharp", "High Contrast", "Low Contrast"
  ].sort();
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || ''); 
  
  // Matriks Harga sesuai EULA 2026 (User Seats, Traffic Tiers, & Corporate)
  const [licensePrices, setLicensePrices] = useState(initialData?.license_prices || {
    desktop: { solo: 0, team: 0, studio: 0, enterprise: 0 },
    logo_branding: { personal: 0, solo: 0, team: 0, studio: 0, enterprise: 0 },
    social_web: { small_50k: 0, medium_500k: 0, large_5m: 0, enterprise_unlimited: 0 },
    app: { solo: 0, team: 0, studio: 0, enterprise: 0 },
    broadcast: { solo: 0, team: 0, studio: 0, enterprise: 0 },
    server: { solo: 0, team: 0, studio: 0, enterprise: 0 },
    corporate_full_suite: 0
  })

  const [price, setPrice] = useState(initialData?.price?.toString() || ''); 
  // Preview sederhana (Tetap dipertahankan sesuai backup)
  const [prices, setPrices] = useState({ desktop: 0, web: 0, app: 0 }); 

  // Handler untuk update harga (Tetap dipertahankan sesuai backup)
  const updatePrice = (category: string, subKey: string | null, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLicensePrices((prev: any) => {
      if (category === 'corporate_full_suite') {
        return { ...prev, corporate_full_suite: numValue };
      }
      return {
        ...prev,
        [category]: { 
          ...(prev[category as keyof typeof prev] as object), 
          [subKey!]: numValue 
        }
      };
    });
  };

  const [fontFiles, setFontFiles] = useState<File[]>([]);
  const [trialFile, setTrialFile] = useState<File | null>(null);
  const [previewImages, setPreviewImages] = useState<File[]>([]);
  const [existingFontFiles, setExistingFontFiles] = useState<string[]>(initialData?.font_files || []);
  const [existingPreviewImages, setExistingPreviewImages] = useState<string[]>(initialData?.preview_images || []);
  const [existingTrialFile, setExistingTrialFile] = useState<string>(initialData?.trial_file_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [driveResults, setDriveResults] = useState<{images: any[], fonts: any[], trial: any[]} | null>(null);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [primaryFontIndex, setPrimaryFontIndex] = useState<number>(initialData?.metadata?.primary_font_index || 0);

  const [draggedImgIndex, setDraggedImgIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDraggedImgIndex(index);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (index: number) => {
    if (draggedImgIndex === null) return;
    const newArray = [...existingPreviewImages];
    const draggedItem = newArray[draggedImgIndex];
    newArray.splice(draggedImgIndex, 1);
    newArray.splice(index, 0, draggedItem);
    setExistingPreviewImages(newArray);
    setDraggedImgIndex(null);
  };

  // Fungsi helper untuk merubah urutan item dalam array (Move Up/Down)
  const moveItem = (array: any[], setArray: React.Dispatch<React.SetStateAction<any[]>>, index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= array.length) return;
    const newArray = [...array];
    [newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]];
    setArray(newArray);
  };

  const handleSelectAllDrive = (type: 'fonts' | 'previews') => {
    if (!driveResults) return;
    if (type === 'fonts') {
      const unselected = driveResults.fonts.filter(f => !existingFontFiles.includes(f.id));
      setExistingFontFiles(prev => [...prev, ...unselected.map(f => f.id)]);
    } else {
      const unselected = driveResults.images.filter(img => !existingPreviewImages.includes(img.id));
      if (existingPreviewImages.length + previewImages.length + unselected.length > 20) return alert("Maksimal 20 gambar!");
      setExistingPreviewImages(prev => [...prev, ...unselected.map(img => img.id)]);
    }
  };

  const fetchFromDrive = async () => {
    if (!fontName) return alert("Isi nama font dulu!");
    setIsSearchingDrive(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/drive-search?q=${encodeURIComponent(fontName)}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = (await res.json()) as { images: any[]; fonts: any[]; trial: any[]; error?: string };
      
      if (data.error) {
        alert("Drive Error: " + data.error);
        setDriveResults({ images: [], fonts: [], trial: [] });
      } else {
        setDriveResults(data);
      }
    } catch (err) { 
      alert("Gagal koneksi ke Worker"); 
    } finally { 
      setIsSearchingDrive(false); 
    }
  };

  React.useEffect(() => {
    if (initialData) {
      setFontName(initialData.name || '');
      setDescription(initialData.description || '');
      setPrice(initialData.price?.toString() || '');
      setLicensePrices(initialData.license_prices || licensePrices);
      setTags(initialData.tags?.join(', ') || '');
      setExistingFontFiles(initialData.font_files || []);
      setExistingPreviewImages(initialData.preview_images || []);
      setExistingTrialFile(initialData.trial_file_url || '');
    }
  }, [initialData]);

  const removeExistingTrial = () => setExistingTrialFile('');

  const removeExistingFont = (index: number) => {
    setExistingFontFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPreview = (index: number) => {
    setExistingPreviewImages(prev => prev.filter((_, i) => i !== index));
  };
 
  const handleDropFiles = (e: React.DragEvent, type: 'fonts' | 'previews') => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    
    if (type === 'fonts') {
      const filtered = files.filter(f => f.name.endsWith('.ttf') || f.name.endsWith('.otf') || f.name.endsWith('.woff2'));
      setFontFiles(prev => [...prev, ...filtered]);
    } else {
      if (previewImages.length + files.length > 20) return alert("Maksimal 20 gambar!");
      setPreviewImages(prev => [...prev, ...files]);
    }
  };

  // Fungsi upload helper ke R2 (Tetap dipertahankan sesuai backup)
  const uploadToR2 = async (files: File[]) => {
    const uploadedUrls = [];
    // Ambil token sesi admin untuk verifikasi
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Akses ditolak. Silakan login kembali.");

    for (const file of files) {
     try {
        // Tembak jalur Admin Upload dengan method PUT & Token
        const timestamp = Date.now();
        const cleanFileName = file.name.replace(/\s+/g, '_');
        const uniqueFileName = `${timestamp}-${cleanFileName}`;

        // 2. Tembak jalur Admin Upload dengan nama file unik
        const res = await fetch(`/api/admin/upload/${uniqueFileName}`, { 
          method: 'PUT', 
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': file.type
          },
          body: file 
        });

        if (!res.ok) {
          const errorData = (await res.json()) as { error?: string };
          throw new Error(errorData.error || `Server Error: ${res.status}`);
        }

        // 3. Tangkap fileName dari response Worker (Sinkron dengan index.js)
        const data = (await res.json()) as UploadResponse;
        if (data.success && data.fileName) {
          uploadedUrls.push(data.fileName);
        } else {
          throw new Error('Upload gagal tanpa alasan');
        }

      } catch (err: any) {
        console.error("Upload error detail:", err);
        throw new Error(`Gagal mengunggah ${file.name}: ${err.message}`);
      }
    }
    return uploadedUrls;
  };

  // 2. Handler Upload & Save (Disesuaikan untuk INSERT & UPDATE)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    // Jika mode baru, fontFiles wajib. Jika mode edit, boleh kosong (menggunakan file lama).
    if (!initialData && fontFiles.length === 0 && existingFontFiles.length === 0) {
      return alert("Upload file font dulu (Local atau Drive)!");
    }
    if (!fontName || !price) return alert("Lengkapi data!");

    setIsUploading(true);
    try {
      const uploadedFontUrls = await uploadToR2(fontFiles);
      const uploadedPreviewUrls = await uploadToR2(previewImages);

      let uploadedTrialUrl = existingTrialFile;
      if (trialFile) {
        const trialResult = await uploadToR2([trialFile]);
        uploadedTrialUrl = trialResult[0];
      }

      const payload = {
        name: fontName,
        price: parseFloat(price),
        price_web: licensePrices.social_web.small_50k,
        price_app: licensePrices.app.solo,
        license_prices: licensePrices,
        description: description,
        tags: tags.split(',').map((t: string) => t.trim()).filter((t: string) => t !== ""),
        font_files: [...existingFontFiles, ...uploadedFontUrls],
        preview_images: [...existingPreviewImages, ...uploadedPreviewUrls],
        trial_file_url: uploadedTrialUrl,
        has_trial: uploadedTrialUrl !== '',
        metadata: {
          ...initialData?.metadata,
          primary_font_index: primaryFontIndex
        }
      };


      if (initialData?.id) {
        // Mode UPDATE
        const { error: dbError } = await supabase.from('fonts').update(payload).eq('id', initialData.id);
        if (dbError) throw dbError;
        alert("Font berhasil diupdate!");
      } else {
        // Mode INSERT
        const { error: dbError } = await supabase.from('fonts').insert([payload]);
        if (dbError) throw dbError;
        alert("Gokil! Font berhasil dipublikasikan.");
      }
      
      onSuccess?.();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form className="space-y-12 max-w-4xl mx-auto py-12" onSubmit={handleSaveProduct}>
      <div className="border-b border-vintage-ink/20 pb-8 mb-12">
        <h2 className="text-4xl font-display uppercase tracking-widest text-vintage-ink">
          {initialData ? "Update Typeface Archive" : "Register New Heritage"}
        </h2>
        <p className="text-sm italic opacity-60 font-serif mt-2">Meticulously documenting typographic history and provenance.</p>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
          <label className="block font-bold text-[10px] uppercase tracking-[0.3em] text-vintage-accent">Font Identity</label>
          <input 
            type="text" 
            value={fontName}
            onChange={(e) => setFontName(e.target.value.toUpperCase())}
            className="w-full border-b border-vintage-ink/20 py-4 bg-transparent outline-none font-display text-4xl focus:border-vintage-ink transition-colors placeholder:opacity-20" 
            placeholder="ENTER FONT NAME..."
            required
          />
          <button 
            type="button" 
            onClick={fetchFromDrive}
            disabled={isSearchingDrive}
            className="text-[9px] border border-vintage-ink/20 px-3 py-1 font-bold uppercase hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-50"
          >
            {isSearchingDrive ? "Searching..." : "⚡ Sync Archive (Drive)"}
          </button>
        </div>

        <div className="space-y-4">
          <label className="block font-bold text-[10px] uppercase tracking-[0.3em] text-vintage-accent">Base Valuation ($)</label>
          <input 
            type="number" 
            required
            value={price}
            onChange={(e) => {
              const val = e.target.value;
              setPrice(val);
              const base = parseFloat(val) || 0;
              const calc = (m: number) => m > 0 ? (m === 1 ? base : Math.floor(base * m)) : 0;
              
              setLicensePrices({
                desktop: { solo: calc(1), team: calc(3), studio: calc(7), enterprise: calc(15) },
                social_web: { small_50k: calc(1), medium_500k: calc(3), large_5m: calc(7), enterprise_unlimited: calc(15) },
                logo_branding: { personal: calc(2.5), solo: calc(5), team: calc(10), studio: calc(20), enterprise: calc(30) },
                app: { solo: calc(5), team: calc(12), studio: calc(25), enterprise: calc(55) },
                server: { solo: calc(5), team: 0, studio: calc(25), enterprise: calc(50) },
                broadcast: { solo: calc(5), team: 0, studio: calc(25), enterprise: calc(50) },
                corporate_full_suite: calc(150.0)
              });
            }}
            className="w-full border-b border-vintage-ink/20 py-4 bg-transparent outline-none font-display text-2xl focus:border-vintage-ink transition-colors" 
            placeholder="25" 
          />
        </div>

        <div className="p-6 bg-vintage-ink/2 border border-vintage-ink/10 text-[11px] space-y-3 font-serif italic">
          <p className="font-bold uppercase not-italic border-b border-vintage-ink/10 pb-2 mb-2 text-vintage-ink tracking-widest text-[9px]">License Matrix Preview (Solo/Base)</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-vintage-ink/60">
            <div className="flex items-center gap-2"><span>Desktop:</span> <span className="font-bold not-italic">${licensePrices.desktop.solo}</span></div>
            <div className="flex items-center gap-2"><span>Social/Web:</span> <span className="font-bold not-italic">${licensePrices.social_web.small_50k}</span></div>
            <div className="flex items-center gap-2"><span>Logo:</span> <span className="font-bold not-italic">${licensePrices.logo_branding.solo}</span></div>
            <div className="flex items-center gap-2"><span>App:</span> <span className="font-bold not-italic">${licensePrices.app.solo}</span></div>
            <div className="flex items-center gap-2"><span>Broadcast:</span> <span className="font-bold not-italic">${licensePrices.broadcast.solo}</span></div>
            <div className="flex items-center gap-2"><span>Server:</span> <span className="font-bold not-italic">${licensePrices.server.solo}</span></div>
            <div className="flex items-center gap-2 border-l border-vintage-ink/10 pl-8"><span>Corporate:</span> <span className="font-bold not-italic">${licensePrices.corporate_full_suite}</span></div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block font-bold text-[10px] uppercase tracking-[0.3em] text-vintage-accent">Classification Tags</label>
          <input 
            type="text" 
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            list="font-tags-suggestions"
            className="w-full border-b border-vintage-ink/20 py-4 bg-transparent outline-none font-serif text-lg focus:border-vintage-ink transition-colors" 
            placeholder="Variable, Serif, Display..." 
          />
          <datalist id="font-tags-suggestions">
            {FONT_TAGS_LIBRARY.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block font-bold text-[10px] uppercase tracking-[0.3em] text-vintage-accent">Typographic Artifacts (.otf, .ttf, .woff2)</label>
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropFiles(e, 'fonts')}
          className="border-2 border-dashed border-vintage-ink/20 p-12 text-center hover:bg-vintage-ink/2 transition-colors cursor-pointer group bg-transparent relative"
        >
          {/* Sinkronisasi Drive untuk font dihapus (Hanya upload lokal ke R2) */}
          <input
            type="file" multiple accept=".ttf,.otf,.woff2" className="hidden" id="fontFiles" 
            onChange={(e) => setFontFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
          />
          <label htmlFor="fontFiles" className="cursor-pointer">
            <Plus className="mx-auto mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Drag & Drop or Click to Add Fonts</p>
          </label>

          {(existingFontFiles.length > 0 || fontFiles.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {existingFontFiles.map((f, i) => (
                <span 
                  key={`ex-f-${i}`} 
                  onClick={() => setPrimaryFontIndex(i)}
                  className={`border text-[9px] px-2 py-1 uppercase flex items-center gap-2 cursor-pointer transition-all ${primaryFontIndex === i ? 'bg-black text-white border-black' : 'bg-gray-100 border-black'}`}
                  title="Click to set as Primary Style"
                >
                  {primaryFontIndex === i && <span className="text-yellow-400">★</span>}
                  {f.includes('-') ? f.replace(/^\d{10,}-/, '') : f} 
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeExistingFont(i); }} className="text-red-500 font-bold hover:scale-125 transition-transform">×</button>
                </span>
              ))}
              {fontFiles.map((f, i) => {
                const combinedIdx = existingFontFiles.length + i;
                return (
                  <span 
                    key={`new-f-${i}`} 
                    onClick={() => setPrimaryFontIndex(combinedIdx)}
                    className={`text-[9px] px-2 py-1 uppercase flex items-center gap-2 cursor-pointer transition-all ${primaryFontIndex === combinedIdx ? 'bg-black text-white border border-black' : 'bg-gray-800 text-gray-300 border border-transparent'}`}
                    title="Click to set as Primary Style"
                  >
                    {primaryFontIndex === combinedIdx && <span className="text-yellow-400">★</span>}
                    {f.name}
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setFontFiles(prev => prev.filter((_, idx) => idx !== i)); }} 
                      className="text-red-400 font-bold hover:text-red-200 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block font-bold text-xs uppercase tracking-wider text-gray-500">
          Trial / Demo Version (.zip / .ttf)
        </label>
        <div className="border-2 border-black p-4 bg-yellow-50/50 relative">
          <input 
            type="file" 
            accept=".zip,.ttf,.otf"
            onChange={(e) => setTrialFile(e.target.files?.[0] || null)}
            className="w-full text-[10px] font-mono cursor-pointer"
          />
          {(existingTrialFile || trialFile) && (
            <div className="flex justify-between items-center mt-2">
              <p className="text-[9px] font-bold uppercase text-black">
                STATUS: {trialFile ? `NEW: ${trialFile.name}` : `EXISTING: ${existingTrialFile}`}
              </p>
              {/* Tombol hapus untuk file trial baru yang baru dipilih */}
              {trialFile && (
                <button 
                  type="button" 
                  onClick={() => setTrialFile(null)}
                  className="text-red-500 font-bold text-[10px] hover:underline"
                >
                  CANCEL NEW ×
                </button>
              )}
              {/* Tombol hapus trial file yang sudah ada di database */}
              {existingTrialFile && !trialFile && (
                <button 
                  type="button" 
                  onClick={() => setExistingTrialFile('')}
                  className="text-red-500 font-bold text-[10px] hover:underline"
                >
                  REMOVE EXISTING ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block font-bold text-xs uppercase tracking-wider text-gray-500">Preview Images (Max 20)</label>
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropFiles(e, 'previews')}
          className="grid grid-cols-4 md:grid-cols-6 gap-2 border-2 border-black p-4 bg-gray-100"
        >
          {/* Header Select All untuk Images */}
          {Array.isArray(driveResults?.images) && driveResults.images.filter(img => !existingPreviewImages.includes(img.id)).length > 0 && (
             <div className="col-span-full flex justify-between items-center bg-blue-100 p-1 px-2 border border-blue-300">
               <span className="text-[8px] font-bold text-blue-700 uppercase">Drive Images</span>
               <button type="button" onClick={() => handleSelectAllDrive('previews')} className="text-[7px] bg-blue-600 text-white px-2 py-0.5 font-bold uppercase hover:bg-black transition-colors">Select All</button>
             </div>
          )}

          {/* Hasil dari Google Drive (Filtered) */}
          {Array.isArray(driveResults?.images) && driveResults.images.filter(img => !existingPreviewImages.includes(img.id)).map((img, i) => (
            <div key={`dr-p-${i}`} className="aspect-square bg-blue-50 border border-blue-200 relative group overflow-hidden">
              <img src={img.url} className="w-full h-full object-cover" alt="drive" />
              <button
                type="button"
                onClick={() => setExistingPreviewImages(prev => [...prev, img.id])}
                className="absolute inset-0 bg-blue-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-[8px]"
              >
                USE DRIVE FILE
              </button>
              <div className="absolute top-0 left-0 bg-blue-600 text-white text-[7px] px-1">DRIVE</div>
            </div>
          ))}

          {existingPreviewImages.map((url, i) => (
            <div 
              key={`ex-p-${i}`} 
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
              className={`aspect-square bg-white border border-black relative group overflow-hidden cursor-move transition-opacity ${draggedImgIndex === i ? 'opacity-30' : 'opacity-100'}`}
            >
              {/* GUNAKAN /api/images/ agar mendukung format .webp & caching */}
              <img src={`/api/images/${url}`} className="w-full h-full object-cover" alt="preview" />
              <button 
                type="button"
                onClick={() => removeExistingPreview(i)}
                className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold"
              >
                DELETE
              </button>
            </div>
          ))}
          {previewImages.map((file, i) => (
            <div key={`new-p-${i}`} className="aspect-square bg-white border border-black relative group overflow-hidden">
              <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
              <button 
                type="button"
                onClick={() => setPreviewImages(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold"
              >
                REMOVE
              </button>
            </div>
          ))}

          {previewImages.length + existingPreviewImages.length < 20 && (
            <label className="aspect-square border border-dashed border-black flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
              <input 
                type="file" multiple accept="image/*" className="hidden" 
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (previewImages.length + existingPreviewImages.length + files.length > 20) {
                    alert("Maksimal 20 gambar!");
                    return;
                  }
                  setPreviewImages(prev => [...prev, ...files]);
                }}
              />
              <Plus size={16} />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <label className="block font-bold text-[10px] uppercase tracking-[0.3em] text-vintage-accent">Historical Narrative</label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-vintage-ink/20 p-6 bg-transparent outline-none h-48 font-serif text-lg focus:border-vintage-ink transition-colors placeholder:italic" 
          placeholder="Narrate the provenance and design philosophy of this typeface..."
        />
      </div>

      <div className="pt-12">
        <button 
          type="submit"
          disabled={isUploading}
          className="vintage-btn btn-reverse w-full py-6 text-sm tracking-[0.4em] flex justify-center items-center gap-4 group"
        >
          {isUploading ? (
            <><Loader2 className="animate-spin" /> ARCHIVING...</>
          ) : (
            <>{initialData ? "UPDATE RECORD" : "COMMISSION TO HERITAGE"}</>
          )}
        </button>
      </div>
    </form>
  );
};

export default FontUploadForm;