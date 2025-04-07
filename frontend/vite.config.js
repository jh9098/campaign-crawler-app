import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: ".", // frontend 기준일 경우 기본값
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: path.resolve(__dirname, "public/index.html") // ✅ 명시적으로 entry 지정
    }
  }
});
