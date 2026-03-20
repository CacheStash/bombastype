import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import { useLocation } from 'react-router-dom';

const ScrollToHash = () => {
  const { hash } = useLocation();
  React.useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Timeout 0 diperlukan untuk menunggu komponen target selesai render
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [hash]);
  return null;
};

// Layout & Global Components
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';

// Admin Components
import Login from './components/admin/Login';
import AdminDashboard from './components/admin/AdminLayout';

// Pages - Pastikan penamaan file FAQ.tsx menggunakan huruf BESAR semua
import Home from './pages/Home';
import Fonts from './pages/Fonts';
import License from './pages/License';
import FAQ from './pages/Faq'; 
import Policy from './pages/Policy';
import About from './pages/About';
import Contact from './pages/Contact';
import Insights from './pages/Insights';
import InsightDetail from './pages/InsightDetail';
import UserAuth from './pages/user/UserAuth';
import UserDashboard from './pages/user/Dashboard';
import { CartProvider, useCart } from './context/CartContext';
import CartPage from './pages/shop/CartPage';
import Checkout from './pages/shop/Checkout'; // Ubah dari CartPage menjadi Checkout
import CartCard from './components/CartCard';
import LicenseReceipt from './pages/user/LicenseReceipt';
import FontDetail from './pages/FontDetail';
import Footer from './components/Footer';


// Placeholders

const CartConfiguratorModal = () => {
  const { isModalOpen, selectedFont, closeConfigurator } = useCart();
  if (!isModalOpen || !selectedFont) return null;
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      {/* Backdrop: Diubah ke fixed agar tetap di posisi belakang saat konten di-scroll */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfigurator} />
      
      {/* Centering Wrapper: Memastikan kartu di tengah jika pendek, dan bisa scroll jika panjang */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative z-[210] animate-in zoom-in-95 duration-300">
          <CartCard 
            fontId={selectedFont.id} // FIXED: Mengirimkan UUID asli dari database
            fontName={selectedFont.name} 
            prices={selectedFont.license_prices} 
            initialOption={selectedFont.initialOption}
            
            font_files={selectedFont.font_files}
            trialFileUrl={selectedFont.trial_file_url}
            discount={selectedFont.activeDiscount || 0}
            // FIXED: Tambahkan baris di bawah ini agar CartCard menerima flag directCheckout
            directCheckout={selectedFont.directCheckout} 
          />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
  // STATE BARU: Untuk memantau apakah menu/search sedang terbuka
  const [isNavActive, setIsNavActive] = React.useState(false);

  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAdminStatus = async (user: any) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      // Cek ke tabel fontadmin (Gunakan .maybeSingle agar tidak error 406 jika data tidak ditemukan)
      const { data } = await supabase
        .from('fontadmin')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAdminStatus(session?.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkAdminStatus(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EDEBE6] flex items-center justify-center font-sans uppercase tracking-widest text-sm">
        Verifying Access...
      </div>
    );
  }

  return (

    <CartProvider>
    <Router>
      <ScrollToHash />
      <div className="min-h-screen bg-[#EDEBE6] text-black font-sans selection:bg-black selection:text-white relative flex flex-col uppercase">
        
        {/* Kirim fungsi setIsNavActive ke Navbar */}
        <Navbar onStateChange={setIsNavActive} />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fonts" element={<Fonts />} />
            <Route path="/license" element={<License />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/insight/:id" element={<InsightDetail />} />

            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/font/:id" element={<FontDetail />} />

            {/* USER / BUYER ROUTES */}
            <Route 
              path="/user/auth" 
              element={!session ? <UserAuth /> : <Navigate to="/user/dashboard" />} 
            />
            <Route 
              path="/user/dashboard/*" 
              element={session && !isAdmin ? <UserDashboard /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/user/auth" />)} 
            />

            <Route path="/user/receipt/:orderId" element={<LicenseReceipt />} />
            
            <Route 
              path="/login" 
              element={!session ? <Login /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/user/dashboard" />)} 
            />
            
            <Route 
              path="/admin/*" 
              element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} 
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <CartConfiguratorModal />

        {/* Tombol BackToTop hanya muncul jika Navigasi (Menu/Search) sedang TIDAK aktif */}
        {!isNavActive && <BackToTop />}
        
        <footer className="relative z-50 bg-[#EDEBE6]">
          <Footer />
        </footer>
      </div>
    </Router>
    </CartProvider>
  );
};

export default App;