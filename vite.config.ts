import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copy } from 'vite-plugin-copy';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    copy([
      { src: 'public/models/**/*', dest: 'dist/models' },
      { src: 'public/wasm/**/*', dest: 'dist/wasm' },
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext', // For WebGPU/WebLLM compatibility
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // Raise limit to 2MB for AI libraries
    assetsInlineLimit: 0, // Don't inline WASM/ONNX – keep as files
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'content-script': path.resolve(__dirname, 'src/lib/content-script.ts'),
        background: path.resolve(__dirname, 'src/background.ts'),
        offscreen: path.resolve(__dirname, 'src/offscreen.ts'),
        'infer-worker': path.resolve(__dirname, 'src/infer-worker.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: {
          // Split vendors for better caching
          'vendor': ['react', 'react-dom'],
          // Group AI libraries together
          'ai-libs': ['@mlc-ai/web-llm', '@xenova/transformers', 'onnxruntime-web'],
          // Separate UI components
          'ui': ['lucide-react', 'framer-motion']
        }
      },
      external: (id) => {
        // Bundle AI libraries for offscreen document (don't externalize)
        if (id.includes('@mlc-ai/web-llm') || id.includes('@xenova/transformers')) {
          return false; // Bundle these libraries
        }
        return false; // Bundle everything else too
      },
      onwarn(warning, warn) {
        // Suppress eval warnings from onnxruntime-web
        if (warning.code === 'EVAL' && warning.id?.includes('onnxruntime-web')) {
          return;
        }
        // Suppress CSS comment warnings
        if (warning.code === 'js-comment-in-css') {
          return;
        }
        warn(warning);
      }
    }
  }
});
