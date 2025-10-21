import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'content-script': path.resolve(__dirname, 'src/lib/content-script.ts'),
        background: path.resolve(__dirname, 'src/background.ts'),
        offscreen: path.resolve(__dirname, 'src/offscreen/offscreen.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: {
          // Split vendors for better caching
          'vendor': ['react', 'react-dom'],
          // Separate UI components
          'ui': ['lucide-react', 'framer-motion']
        }
      },
      onwarn(warning, warn) {
        // Suppress CSS comment warnings
        if (warning.code === 'js-comment-in-css') {
          return;
        }
        warn(warning);
      }
    }
  }
});
