import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // FIXED: Tambah useNavigate
import { supabase } from '../lib/supabase';
import TypeTester from '../components/TypeTester';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronDown } from 'lucide-react';
const resolvePreviewUrl = (filename: string) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `/api/images/${filename}`; 
};


const FontDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [font, setFont] = useState<any>(null);
  const navigate = useNavigate();
  const { openConfigurator } = useCart(); 
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const [fontRes, promosRes] = await Promise.all([
      supabase.from('fonts').select('*').eq('id', id).single(),
      supabase.from('promotions').select('*').eq('is_active', true)
    ]);
    
    if (fontRes.data) setFont(fontRes.data);
    if (promosRes.data) setPromos(promosRes.data);
    setLoading(false);
  };

  const activePromo = useMemo(() => {
    if (!font) return null;
    const now = new Date();
    return promos.find(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      const fontIds = typeof p.font_ids === 'string' ? JSON.parse(p.font_ids) : (p.font_ids || []);
      return now >= start && now <= end && (p.type === 'global' || fontIds.includes(font.id));
    });
  }, [font, promos]);

  const calculateDaysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days <= 0 ? "Ends today" : `${days} day${days > 1 ? 's' : ''} left`;
  };

  if (loading) return <div className="p-20 text-center uppercase font-bold animate-pulse tracking-widest">Loading Font Details...</div>;
  if (!font) return <div className="p-20 text-center uppercase font-bold">Font not found.</div>;

  const basePrice = font.price || 25;
  const styleCount = Array.isArray(font.font_files) ? font.font_files.length : 1;
  const tags = Array.isArray(font.tags) ? font.tags : (typeof font.tags === 'string' ? font.tags.split(',') : []);
  const fontPreviews = Array.isArray(font.preview_images) ? font.preview_images : [];

  return (
    <div className="relative z-10 text-black font-sans selection:bg-black selection:text-white min-h-screen bg-transparent overflow-x-hidden">
      {/* BACKGROUND ORBS - Selaras dengan Home */}
      <div className="grain-orb-base orb-top-right" />
      <div className="grain-orb-base orb-bottom-left" />

      {/* 1. HEADER: CLEAN SECTION (No Images) */}
      <header className="relative w-full border-b border-black bg-transparent overflow-hidden">
        {/* HEADER ORB EFFECT (Atas Kanan) - Identik dengan Home */}
        <div className="absolute -top-20 -right-20 w-[600px] h-[400px] pointer-events-none z-0">
           <div 
              className="w-full h-full mix-blend-multiply blur-[60px]"
              style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.8) 0%, rgba(253, 186, 116, 0.5) 50%, rgba(253, 186, 116, 0) 100%)' }}
           />
        </div>
        {/* FIXED: Mengubah breakpoint dari 'md' ke 'lg' agar header bertumpuk pada tablet portrait, selaras dengan TypeTester */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] relative z-10">
          {/* FIXED: Border bawah aktif di resolusi < 1024px (lg:border-b-0) dan border kanan aktif di >= 1024px (lg:border-r) */}
          <div className="p-6 md:p-8 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-black bg-white/10 backdrop-blur-md text-left">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.3em] block mb-4">Specimen Details</span>
            <h1 className="text-6xl md:text-9xl font-normal uppercase tracking-tighter leading-[0.8] break-words">
              {font.name}
            </h1>
            <span className="block text-sm md:text-base font-bold uppercase tracking-widest mt-4 text-black/50">
              {styleCount} STYLES AVAILABLE
              {activePromo && ` | ${activePromo.name} - ${activePromo.discount_percent}% OFF`}
            </span>
          </div>
          
          {/* FIXED: Alignment tombol menyesuaikan breakpoint (lg:justify-end) */}
          <div className="flex flex-col justify-center lg:justify-end p-6 md:p-8 items-end bg-white/10 backdrop-blur-md gap-3">
            {/* FIXED: Efek hover diubah menjadi outline mode (bg-white & text-black saat hover) */}
            <button 
              onClick={() => {
                const discountPercent = activePromo ? activePromo.discount_percent : 0;
                openConfigurator({ 
                  ...font, 
                  trialFileUrl: font.trial_file_url,
                  activeDiscount: discountPercent,
                  directCheckout: true 
                });
              }}
              className="w-full md:w-64 bg-black text-white px-8 py-6 text-xs font-black uppercase border border-black hover:bg-white hover:text-black transition-all flex items-center justify-center"
            >
              BUY LICENSE
            </button>
            <button 
          onClick={() => {
            const discountPercent = activePromo ? activePromo.discount_percent : 0;
            openConfigurator({ 
              ...font, 
              trialFileUrl: font.trial_file_url,
              activeDiscount: discountPercent,
              initialOption: 'trial' // Mengaktifkan opsi trial/demo secara otomatis
            });
          }}
          className="w-full md:w-64 border border-black px-8 py-4 text-xs font-black uppercase hover:bg-black hover:text-white transition-all flex items-center justify-center"
        >
          Free Trial
        </button>

            <button 
              onClick={() => navigate(-1)} 
              className="w-full md:w-64 border border-black px-8 py-4 text-xs font-black uppercase hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3"
            >
              <ChevronLeft size={16} /> Back to Collection
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT GRID */}
      <main className="w-full">
        {/* FIXED: Mengubah grid menjadi 2 kolom (450px untuk info dan sisa untuk tester) */}
        <section className="relative border-b border-black grid grid-cols-1 lg:grid-cols-[450px_1fr]">
          
          {/* CONTENT ORB EFFECT (Tengah Kiri) - Identik dengan posisi ganjil di Home */}
          <div className="absolute z-0 pointer-events-none overflow-visible hidden md:block" 
               style={{ 
                 width: '1000px', 
                 height: '600px',
                 top: '50%',
                 left: '22%', 
                 transform: 'translate(-50%, -50%)',
                 opacity: 0.8
               }}>
               <div className="w-full h-full mix-blend-multiply blur-[60px]" 
                    style={{ background: 'radial-gradient(closest-side, rgba(255, 80, 80, 0.8) 0%, rgba(253, 186, 116, 0.5) 50%, rgba(253, 186, 116, 0) 100%)' }} />
          </div>

          {/* COLUMN A: INFO */}
          {/* FIXED: Menambahkan 'relative z-10' agar konten berada di atas orb */}
          <div className="relative z-10 p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black bg-transparent">
            <div>
              {/* FIXED: Nama font dan Style info dihapus dari sini karena sudah ada di header */}

              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block border border-black rounded-full px-3 py-1 font-regular italic text-[11px] md:text-[14px] lowercase leading-none">starting at</span>
                  {activePromo && (
                    <span className="inline-block border border-orange-600 rounded-full px-3 py-1 font-bold text-[11px] md:text-[14px] uppercase text-red-600 leading-none">
                      {activePromo.discount_percent}% OFF
                    </span>
                  )}
                </div>
                
                {activePromo ? (
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-8xl md:text-9xl font-light tracking-tighter leading-[0.8]">
                      ${(basePrice * (1 - (activePromo.discount_percent / 100))).toFixed(0)}
                    </span>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="relative w-fit text-center">
                        <span className="text-3xl md:text-4xl font-bold text-red-600 leading-none">${basePrice}</span>
                        <div className="absolute top-[50%] left-[-5%] w-[110%] h-[2px] bg-orange-600"></div>
                      </div>
                      <span className="inline-block border border-orange-600 rounded-full px-2 md:px-3 py-1 font-bold text-[9px] md:text-[10px] uppercase text-red-600 whitespace-nowrap">
                        {calculateDaysLeft(activePromo.end_date)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-8xl md:text-9xl font-light tracking-tighter leading-[0.8]">${basePrice}</div>
                )}
              </div>
            </div>

            <div className="pb-10 lg:pb-0">
               <div className="flex flex-wrap gap-2 text-[10px] uppercase mb-6">
                {tags.map((tag: string) => (
                  <span key={tag} className="border border-black px-3 py-1 rounded-full font-bold uppercase bg-transparent">
                    {tag.trim()}
                  </span>
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed normal-case italic">{font.description}</p>
            </div>
          </div>

                {/* COLUMN C: FULL TYPE TESTER */}
         <div className="relative flex items-stretch bg-transparent overflow-hidden">
            <TypeTester 
              config={{
                ...font,
                family: `"${font.name}"`,
                styleCount: styleCount,
                randomText: font.random_text || "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin."
              }} 
              isEven={true} // isEven true untuk menjaga konsistensi Align Left
            />
          </div>
        </section>

        {/* 3. SPACER: Muncul di semua ukuran layar (Mobile, Tablet, & Desktop) */}
        <div className="h-12 border-b border-black w-full bg-orange-500/10" />

        {/* 4. PREVIEW IMAGES GALLERY */}
        {/* FIXED: Grid full width tanpa padding. 1 kolom di < 1024px (lg), 2 kolom di >= 1024px */}
        <section className="w-full grid grid-cols-1 lg:grid-cols-2 border-black border-t-0">
          {fontPreviews.map((img: string, idx: number) => {
            const imageUrl = resolvePreviewUrl(img);
            if (!imageUrl) return null;
            return (
              <div key={idx} className="w-full border-b lg:even:border-l border-black overflow-hidden bg-white">
                <img 
                  src={imageUrl} 
                  alt={`${font.name} Preview ${idx + 1}`} 
                  className="w-full h-auto block object-cover"
                />
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default FontDetail;