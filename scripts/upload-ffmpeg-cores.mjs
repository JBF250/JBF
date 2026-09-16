#!/usr/bin/env node
// 将 ffmpeg 核心上传/覆盖到 Supabase Storage `ffmpeg-core` 桶，并设置长缓存头。
// 单线程核心取自 node_modules/@ffmpeg/core（ConverterPage 当前使用）；
// 多线程核心取自本地 ffmpeg-core-upload/（暂未启用，保留备用）。
// 用法: $env:SUPABASE_ANON_KEY="<service_role_key>"; node scripts/upload-ffmpeg-cores.mjs
// 若 RLS 拒绝 anon 写入，需在 Supabase Dashboard 手动上传并在桶设置中配置 cache-control。
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SUPABASE_URL = 'https://noiebpjyskscjtmdytxj.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaWVicGp5c2tzY2p0bWR5dHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjY2MzEsImV4cCI6MjEwMDQ0MjYzMX0.1KQOc02ySuxi-k845kbplnXyXndrlH6hxz58sFFb_Rs'

// 浏览器缓存 7 天，避免每次转换都重新下载约 30MB 的 wasm
const CACHE_CONTROL = 'public, max-age=604800'

const TARGETS = [
  // 单线程核心（当前生效路径）
  { name: 'ffmpeg-core-esm.js', src: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', mime: 'text/javascript' },
  { name: 'ffmpeg-core.wasm', src: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', mime: 'application/wasm' },
  // 多线程核心（已从页面移除，保留在存储中以备后续使用）
  { name: 'ffmpeg-core-mt-esm.js', src: 'ffmpeg-core-upload/ffmpeg-core-mt-esm.js', mime: 'text/javascript' },
  { name: 'ffmpeg-core-mt.wasm', src: 'ffmpeg-core-upload/ffmpeg-core-mt.wasm', mime: 'application/wasm' },
  { name: 'ffmpeg-core-mt.worker.js', src: 'ffmpeg-core-upload/ffmpeg-core-mt.worker.js', mime: 'text/javascript' },
]

async function upload(name, data, mime) {
  const url = `${SUPABASE_URL}/storage/v1/object/ffmpeg-core/${name}`
  return fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-upsert': 'true',
      'cache-control': CACHE_CONTROL,
      'content-type': mime,
    },
    body: data,
  })
}

let failed = 0
for (const { name, src, mime } of TARGETS) {
  const abs = path.join(ROOT, src)
  if (!existsSync(abs)) {
    console.log(`${name}: 跳过（本地源文件不存在: ${src}）`)
    failed++
    continue
  }
  const data = readFileSync(abs)
  const t0 = Date.now()
  try {
    const resp = await upload(name, data, mime)
    console.log(`${name}: HTTP ${resp.status} ${resp.statusText} (${data.length} bytes, ${Date.now() - t0}ms)`)
    if (!resp.ok) {
      failed++
      const text = await resp.text()
      console.log(`   body: ${text.slice(0, 200)}`)
    }
  } catch (e) {
    failed++
    console.log(`${name}: 请求失败 ${e}`)
  }
}
console.log(failed === 0 ? '\n全部上传成功。' : `\n有 ${failed} 项未成功，请检查上面的输出。`)
