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
      // The content script is NOT built here. It must be a classic script, and
      // this multi-entry build hoists shared modules into chunks pulled in with
      // `import`, which a content script cannot execute. It gets its own IIFE
      // build in vite.content.config.ts.
      // Only the popup. The extension no longer has a service worker or an
      // offscreen document: both existed to host an inference runtime, and the
      // static embedding model does not need one.
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: {
          // Split vendors for better caching
          'vendor': ['react', 'react-dom'],
          // Separate UI components
          'ui': ['lucide-react']
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
