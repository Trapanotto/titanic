import { defineConfig } from 'vite';

// Relative base so the build works under https://<user>.github.io/titanic/ as well as locally.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
