// <<< ANCHOR TOP: import createClient >>>
import { createClient } from '@supabase/supabase-js';

// Mengambil variabel dari environment Vite dengan fallback permanen Bombastype
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://zuvlxospyjtypwijrxvd.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmx4b3NweWp0eXB3aWpyeHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTc5NjIsImV4cCI6MjA4OTUzMzk2Mn0.rsRt2muxqc55tqQK8rcyzMXcoPXgdPXpuP6U2SyIHT8';

// Validasi kritis: Jika variabel kosong, berikan peringatan keras sebelum createClient dipanggil
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Supabase URL/Key tidak ditemukan!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// <<< ANCHOR BOTTOM: export const supabase >>>