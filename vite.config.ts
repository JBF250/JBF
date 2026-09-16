import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    headers: {
      // 跨源隔离：ffmpeg.wasm 多线程核心需要 SharedArrayBuffer。
      // 用 credentialless 而非 require-corp：同样开启隔离，但不强制跨源资源
      // （如 Supabase 上的贴子图片）携带 CORP 头，避免图片被浏览器拦截。
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  // vite preview 不读 server.headers，需单独声明，保证本地打包预览与生产一致
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})