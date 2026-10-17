/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Layout & Global Components (Static for immediate layout shell)
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';
import Footer from './components/Footer';
import CartCard from './components/CartCard';
import ContextMenu from './components/ContextMenu';
import { CartProvider, useCart } from './context/CartContext';
import { AdminProvider } from './context/AdminContext';
import { InContextAdminBar } from './components/admin/InContextAdminBar';
import { InContextEditorModal } from './components/admin/InContextEditorModal';

// Core Public Pages (Home loaded directly for instant initial paint)
import Home from './pages/Home';

// Lazy-Loaded Public Store Pages
const Fonts = lazy(() => import('./pages/Fonts'));
const FontDetail = lazy(() => import('./pages/FontDetail'));
const CartPage = lazy(() => import('./pages/shop/CartPage'));
const License = lazy(() => import('./pages/License'));
const FAQ = lazy(() => import('./pages/Faq')); 
const Policy = lazy(() => import('./pages/Policy'));
const Contact = lazy(() => import('./pages/Contact'));
const Checkout = lazy(() => import('./pages/shop/Checkout')); 
const CanvasLanding = lazy(() => import('./pages/CanvasLanding'));
const AffiliateLanding = lazy(() => import('./pages/AffiliateLanding'));

// Lazy-Loaded User Account Pages
const UserAuth = lazy(() => import('./pages/user/UserAuth'));
const UserDashboard = lazy(() => import('./pages/user/Dashboard'));
const LicenseReceipt = lazy(() => import('./pages/user/LicenseReceipt'));

// Lazy-Loaded Admin & Maintenance Components (Completely decoupled from public visitor bundle)
const AdminDashboard = lazy(() => import('./components/admin/AdminLayout'));
const AdminLoginModal = lazy(() => import('./components/admin/AdminLoginModal'));
const MaintenanceScreen = lazy(() => import('./components/MaintenanceScreen'));

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

const PageLoader: React.FC = () => (
  <div className="w-full min-h-[40vh] flex flex-col items-center justify-center p-8 space-y-3">
    <div className="font-mono text-xs uppercase tracking-[0.3em] text-vintage-ink animate-pulse font-bold">
      Loading...
    </div>
  </div>
);

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
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = React.useState(false);

  const isAffiliateAllowed = Boolean(
    isAdmin || (session?.user?.email && session.user.email.toLowerCase() === 'gotrainer19@gmail.com')
  );

  React.useEffect(() => {
    const handleOpenAdminAuth = () => {
      if (session && isAdmin) {
        window.location.href = '/backstage';
      } else {
        setIsAdminLoginModalOpen(true);
      }
    };
    window.addEventListener('open-admin-auth', handleOpenAdminAuth);
    return () => window.removeEventListener('open-admin-auth', handleOpenAdminAuth);
  }, [session, isAdmin]);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('c');
      if (ref) {
        localStorage.setItem('affiliate_ref', ref.trim().toUpperCase());
      }
    } catch (_) {}
  }, []);

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
        return false;
      }
      const { data } = await supabase
        .from('fontadmin')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      return admin;
    };

    fetchMaintenanceStatus();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await checkAdminStatus(session?.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      await checkAdminStatus(session?.user);
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
    <AdminProvider>
      <CartProvider>
        <Router>
          <ScrollToHash />

        {isMaintenance && !isAdmin ? (
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Stealth Admin Routes */}
              <Route 
                path="/backstage" 
                element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} 
              />
              <Route 
                path="/backstage/*" 
                element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} 
              />

              {/* Silent Decoy Redirects */}
              <Route path="/admin" element={<Navigate to="/" replace />} />
              <Route path="/admin/*" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />

              <Route path="*" element={<MaintenanceScreen />} />
            </Routes>
          </Suspense>
        ) : (
          /* Heritage Design: Outer Wrapper Bersih (Tanpa Redundant Background) */
          <div className="min-h-screen p-2 sm:p-4 md:p-8 lg:p-12 flex justify-center">
            
            {/* Heritage Design: Global Ornate Container (Murni ornate-border sesuai index.css) */}
            <div className="w-full max-w-[1840px] ornate-border bg-vintage-paper shadow-2xl relative flex flex-col">
              
              <Navbar onStateChange={setIsNavActive} />
              
              <main className="grow relative z-10">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Bombastype Functional Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/fonts" element={<Fonts />} />
                    <Route path="/canvas" element={<CanvasLanding />} />
                    <Route path="/license" element={<License />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/policy" element={<Policy />} />
                    <Route path="/about" element={<Navigate to="/" replace />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/insights" element={<Navigate to="/" replace />} />
                    <Route path="/insight/:id" element={<Navigate to="/" replace />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/font/:id" element={<FontDetail />} />

                    {/* Auth & User Routes */}
                    <Route 
                      path="/user/auth" 
                      element={!session ? <UserAuth /> : (isAdmin ? <Navigate to="/backstage" replace /> : <Navigate to="/user/dashboard" replace />)} 
                    />
                    <Route 
                      path="/user/dashboard/*" 
                      element={
                        session ? (
                          isAdmin ? <Navigate to="/backstage" replace /> : <UserDashboard />
                        ) : (
                          <Navigate to="/user/auth" replace />
                        )
                      } 
                    />
                    <Route path="/user/receipt/:orderId" element={<LicenseReceipt />} />

                    {/* Public Affiliate Landing Page */}
                    <Route path="/affiliate" element={<AffiliateLanding />} />
                    
                    {/* Stealth Admin Routes */}
                    <Route 
                      path="/backstage" 
                      element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} 
                    />
                    <Route 
                      path="/backstage/*" 
                      element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} 
                    />

                    {/* Silent Decoy Redirects */}
                    <Route path="/admin" element={<Navigate to="/" replace />} />
                    <Route path="/admin/*" element={<Navigate to="/" replace />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>

              <CartConfiguratorModal />
              <ContextMenu />

              {!isNavActive && <BackToTop />}
              
              <div className="relative z-10 mt-auto w-full">
                <Footer />
              </div>
            </div>
          </div>
        )}

        {isAdminLoginModalOpen && (
          <Suspense fallback={null}>
            <AdminLoginModal 
              isOpen={isAdminLoginModalOpen} 
              onClose={() => setIsAdminLoginModalOpen(false)} 
            />
          </Suspense>
        )}

        {/* WordPress / Notion Style In-Context Live Page Editing Bar & Modal */}
        <InContextAdminBar />
        <InContextEditorModal />
      </Router>
    </CartProvider>
  </AdminProvider>
  );
};

export default App;