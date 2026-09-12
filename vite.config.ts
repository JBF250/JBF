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

/**
 * onnxruntime-web 会把它的 wasm(26.5MiB)自动孪生一份进 dist 资产。
 * 运行时已改从 Supabase Storage 拉取(见 src/lib/ocr.ts 的 wasmPaths)，这份本地副本无用
 * 且超出 Cloudflare Pages 单文件 25MiB 限制，故在 output 阶段剔除。
 */
function stripOrtWasm(): Plugin {
  return {
    name: 'strip-ort-wasm',
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        const file = bundle[name]
        if (file.type === 'asset' && /ort-wasm-.*\.wasm$/.test(file.fileName)) {
          delete bundle[name]
          this.warn(`已剔除超限的 onnxruntime wasm 资产: ${file.fileName}`)
        }
      }
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    crossOriginIsolation(),
    servePublicOrt(),
    stripOrtWasm(),
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