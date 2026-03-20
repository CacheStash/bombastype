import { createClient } from '@supabase/supabase-js';

// Mengambil variabel dari .env.local menggunakan standar Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Validasi kritis: Jika variabel kosong, berikan peringatan keras sebelum createClient dipanggil
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Supabase URL/Key tidak ditemukan! Pastikan file .env sudah benar sebelum menjalankan 'npm run build'.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);