import { defineConfig } from 'vite';

// GitHub Pages serves the site from /underdeck/.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { main: 'index.html' } } },
});
