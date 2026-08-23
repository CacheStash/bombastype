/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Layout & Global Components
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';
import Footer from './components/Footer';
import CartCard from './components/CartCard';

// Admin Components
import Login from './components/admin/Login';
import AdminDashboard from './components/admin/AdminLayout';

// Pages
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
import Checkout from './pages/shop/Checkout'; 
import LicenseReceipt from './pages/user/LicenseReceipt';
import FontDetail from './pages/FontDetail';

// Maintenance Screen
import MaintenanceScreen from './components/MaintenanceScreen';

// Sesuai Protokol Heritage: CSS harus di-load PALING AKHIR setelah semua komponen/halaman
import './index.css';

const ScrollToHash = () => {
  const { hash } = useLocation();
  React.useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Timeout diperlukan untuk menunggu komponen target selesai render
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [hash]);
  return null;
};

const CartConfiguratorModal = () => {
  const { isModalOpen, selectedFont, closeConfigurator } = useCart();
  if (!isModalOpen || !selectedFont) return null;
  return (
    <div className="fixed inset-0 z-200 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfigurator} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative z-210 animate-in zoom-in-95 duration-300">
          <CartCard 
            fontId={selectedFont.id} 
            fontName={selectedFont.name} 
            prices={selectedFont.license_prices} 
            initialOption={selectedFont.initialOption}
            font_files={selectedFont.font_files}
            trialFileUrl={selectedFont.trial_file_url}
            discount={selectedFont.activeDiscount || 0}
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
  const [isNavActive, setIsNavActive] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isMaintenance, setIsMaintenance] = React.useState(false);

  React.useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .maybeSingle();
        if (data) {
          setIsMaintenance(data.value === true || data.value === 'true');
        }
      } catch (err) {
        console.error("Failed to check maintenance mode:", err);
      }
    };

    const checkAdminStatus = async (user: any) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('fontadmin')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    };

    fetchMaintenanceStatus();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAdminStatus(session?.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkAdminStatus(session?.user);
    });

    // Realtime listener untuk status maintenance
    const maintenanceChannel = supabase
      .channel('public:site_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        fetchMaintenanceStatus();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(maintenanceChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center font-sans uppercase tracking-widest text-sm text-vintage-ink">
        Verifying Access...
      </div>
    );
  }

  return (
    <CartProvider>
      <Router>
        <ScrollToHash />

        {isMaintenance && !isAdmin ? (
          <Routes>
            <Route 
              path="/admin" 
              element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/*" 
              element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/login" 
              element={!session ? <Login /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/" />)} 
            />
            <Route path="*" element={<MaintenanceScreen />} />
          </Routes>
        ) : (
          /* Heritage Design: Outer Wrapper Bersih (Tanpa Redundant Background) */
          <div className="min-h-screen p-2 sm:p-4 md:p-8 lg:p-12 flex justify-center">
            
            {/* Heritage Design: Global Ornate Container (Murni ornate-border sesuai index.css) */}
            <div className="max-w-7xl w-full ornate-border bg-vintage-paper shadow-2xl relative flex flex-col">
              
              <Navbar onStateChange={setIsNavActive} />
              
              <main className="grow relative z-10">
                <Routes>
                  {/* Bombastype Functional Routes */}
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

                  {/* Auth & User Routes */}
                  <Route 
                    path="/user/auth" 
                    element={!session ? <UserAuth /> : <Navigate to="/user/dashboard" />} 
                  />
                  <Route 
                    path="/user/dashboard/*" 
                    element={session && !isAdmin ? <UserDashboard /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/user/auth" />)} 
                  />
                  <Route path="/user/receipt/:orderId" element={<LicenseReceipt />} />
                  
                  {/* Admin Routes */}
                  <Route 
                    path="/login" 
                    element={!session ? <Login /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/user/dashboard" />)} 
                  />
                  <Route 
                    path="/admin" 
                    element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/admin/*" 
                    element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} 
                  />

                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>

              <CartConfiguratorModal />

              {!isNavActive && <BackToTop />}
              
              <footer className="relative z-50">
                <Footer />
              </footer>
            </div>
          </div>
        )}
      </Router>
    </CartProvider>
  );
};

export default App;