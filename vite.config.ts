import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    // Allow access from LAN devices during development (useful for mobile preview).
    // Set to 'localhost' or remove this line if you don't need LAN access.
    host: true,
  },

  preview: {
    port: 4173,
  },

  build: {
    // Emit source maps in production for easier debugging; remove or set to
    // false / 'hidden' if source maps should not be publicly accessible.
    sourcemap: false,
    // Warn when any individual chunk exceeds 500 kB (Vite default).
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split vendor code into a separate chunk for better long-term caching.
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          motion: ['framer-motion'],
          charts: ['recharts'],
          geo: ['d3-geo'],
        },
      },
    },
  },
});
