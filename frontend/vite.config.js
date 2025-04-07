import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'public/index.html'), // ✅ 명시적으로 entry 지정
    },
  },
});
