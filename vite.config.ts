/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(), 
        // Mengaktifkan Tailwind v4 agar style Heritage terimplementasi
        tailwindcss() 
      ],
      resolve: {
        alias: {
          // Menjaga kompatibilitas import path '@/'
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-motion': ['framer-motion', 'motion'],
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-opentype': ['opentype.js'],
            }
          }
        }
      }
    };
});