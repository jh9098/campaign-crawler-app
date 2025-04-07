import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: '.', // Netlify에서 frontend 기준이므로 그대로 두기
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
