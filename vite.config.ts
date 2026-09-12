import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * onnxruntime-web dynamically `import()`s ort-wasm...jsep.mjs at runtime.
 * Vite's dev server refuses to transform module files living under /public
 * (they must be served as-is), which breaks the OCR engine in dev.
 * Production copies these files verbatim to dist/ and needs no handling.
 */
const PUBLIC_WASM_PREFIX = '/ort/'

/**
 * onnxruntime-web dynamically `import()`s ort-wasm...jsep.mjs at runtime.
 * Vite's dev server refuses to transform module files living under /public
 * (they must be served as-is), which breaks the OCR engine in dev.
 *
 * Make the runtime `import('/ort/...')` a real Vite module by feeding it through
 * resolveId + load, so no "should not be imported from source" error occurs.
 */
function servePublicOrt(): Plugin {
  return {
    name: 'serve-public-ort',
    resolveId(id) {
      if (id.startsWith(PUBLIC_WASM_PREFIX)) return id
      return null
    },
    async load(id) {
      if (!id.startsWith(PUBLIC_WASM_PREFIX)) return null
      const filePath = path.join(__dirname, 'public', id.slice(1).replace(/^\/+/, ''))
      const code = await readFile(filePath, 'utf8')
      return { code, map: null }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        const pathname = decodeURIComponent(req.url.split('?')[0])
        if (!pathname.startsWith('/ocr/')) return next()

        const filePath = path.join(__dirname, 'public', pathname.replace(/^\/+/, ''))
        readFile(filePath)
          .then((buf) => {
            const ext = path.extname(filePath).toLowerCase()
            const mime = ext === '.onnx' ? 'application/octet-stream' : 'text/plain'
            res.setHeader('Content-Type', mime)
            res.setHeader('Cache-Control', 'no-cache')
            res.end(buf)
          })
          .catch(() => next())
      })
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    crossOriginIsolation(),
    servePublicOrt(),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web', '@ocr-web/core'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})