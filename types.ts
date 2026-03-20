export interface Axis {
    tag: string;
    name: string;
    min: number;
    max: number;
    default: number;
    step?: number;
    unit?: string;
}

export interface FontConfig {
  id?: string;
  name: string;
  family: string;
  file?: string;
  file_url?: string;      // Untuk single file
  font_files?: string[];  // Untuk multiple styles
  description: string;
  tags: string[];
  price?: number;
  license_prices?: any;   // Menyimpan matriks harga EULA
  styleCount?: number;
  randomText?: string;    
  previewImages?: string[];
  axes: Axis[];
  features?: {
    tag: string;
    name: string;
  }[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Promotion {
  id?: string;
  name: string;
  description: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
  type: 'global' | 'bundle';
  font_ids?: string[]; // Untuk bundle pack
  is_active: boolean;
}

export interface ToggleProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}