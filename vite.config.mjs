import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    global: 'globalThis',
  },
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 8080,
  },
  preview: {
    port: 8080,
  },
});
