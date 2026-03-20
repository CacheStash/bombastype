import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase'; // Pastikan path ke client supabase benar

export interface CartItem {
  cartId: string; // ID unik untuk setiap baris di keranjang
  id: string; // FIXED: Tambahkan ID (UUID database) ke interface agar tidak error
  fontId: string; // Ini tetap ada sebagai nama font/slug
  name: string;
  price: number;
  tier: string;
  usages: string[];
  font_files: string[];
  webTierLabel?: string;
  metadata?: {
    mpv?: string;
  };
  hasTrial?: boolean;
  trialFileUrl?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  cartCount: number;
  
  // Modal Control
  isModalOpen: boolean;
  selectedFont: any | null;
  openConfigurator: (font: any) => void;
  closeConfigurator: () => void;

  // New Validation Logic
  checkExistingTrials: (email: string) => Promise<string[]>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<any>(null);

  const openConfigurator = (font: any) => {
    // Gunakan spread operator untuk memastikan state mendapat objek baru 
    // termasuk membawa properti initialOption jika ada.
    setSelectedFont({ ...font });
    setIsModalOpen(true);
  };

  const closeConfigurator = () => {
    setIsModalOpen(false);
    setSelectedFont(null);
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    closeConfigurator();
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
  };

  /**
   * FUNGSI BARU: Mengecek riwayat klaim trial user berdasarkan email
   * Mengembalikan array font_id yang sudah pernah diklaim.
   */
  const checkExistingTrials = async (email: string): Promise<string[]> => {
    if (!email) return [];
    try {
      // 1. Dapatkan user_id dari email via tabel fontbuyer
      const { data: userData, error: userError } = await supabase
        .from('fontbuyer')
        .select('id')
        .eq('email', email)
        .single();
        
      if (userError || !userData) return [];

      // 2. Ambil daftar font_id yang sudah pernah diklaim sebagai trial
      const { data: history, error: historyError } = await supabase
        .from('font_history')
        .select('font_id')
        .eq('user_id', userData.id)
        .eq('download_type', 'trial');

      if (historyError) return [];
      return history ? history.map(h => h.font_id) : [];
    } catch (err) {
      console.error("TRIAL_CHECK_ERROR:", err);
      return [];
    }
  };

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, clearCart, cartCount: cart.length, 
      isModalOpen, selectedFont, openConfigurator, closeConfigurator,
      checkExistingTrials // Register fungsi baru ke provider
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};