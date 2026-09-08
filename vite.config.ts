import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('commonjsHelpers') ||
            id.includes('preload-helper') ||
            /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|zustand)\//.test(
              id,
            )
          )
            return 'react';
          if (/\/node_modules\/(three|three-stdlib|@react-three)\//.test(id)) return 'three';
        },
      },
    },
  },
});
