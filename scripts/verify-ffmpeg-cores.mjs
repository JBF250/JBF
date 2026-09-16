#!/usr/bin/env node
// 核验 Supabase Storage 上 ffmpeg 核心可访问、体积与本地依赖一致、缓存头是否已设置。
// 使用 Range 请求只取首字节，避免真的下载 30MB。
// 用法: node scripts/verify-ffmpeg-cores.mjs
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const STORAGE_BASE = 'https://noiebpjyskscjtmdytxj.supabase.co/storage/v1/object/public/ffmpeg-core'

// 远程文件名 -> 期望的本地文件（用于体积比对）
const TARGETS = [
  { remote: 'ffmpeg-core-esm.js', local: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', group: '单线程(当前使用)' },
  { remote: 'ffmpeg-core.wasm', local: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', group: '单线程(当前使用)' },
  { remote: 'ffmpeg-core-mt-esm.js', local: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js', group: '多线程(未启用)' },
  { remote: 'ffmpeg-core-mt.wasm', local: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm', group: '多线程(未启用)' },
  { remote: 'ffmpeg-core-mt.worker.js', local: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js', group: '多线程(未启用)' },
]

const localSize = (p) => (existsSync(path.join(ROOT, p)) ? statSync(path.join(ROOT, p)).size : null)

let group = ''
let bad = 0
for (const { remote, local, group: g } of TARGETS) {
  if (g !== group) {
    group = g
    console.log(`\n=== ${group} ===`)
  }
  const url = `${STORAGE_BASE}/${remote}`
  const expect = localSize(local)
  try {
    const t0 = Date.now()
    const resp = await fetch(url, { headers: { Range: 'bytes=0-0' } })
    await resp.arrayBuffer()
    const total = Number((resp.headers.get('content-range') || '').split('/')[1] || 0)
    const cache = resp.headers.get('cache-control') || '(未设置)'
    const ct = resp.headers.get('content-type') || '-'
    const match = expect === null ? '本地缺失' : total === expect ? '一致 ✓' : `不一致 ✗ (本地 ${expect})`
    console.log(`${remote}`)
    console.log(`  HTTP ${resp.status} | ${ct} | 远端 ${total} bytes (${(total / 1024 / 1024).toFixed(2)}MB) -> ${match}`)
    console.log(`  cache-control: ${cache} | 耗时 ${Date.now() - t0}ms`)
    if (!resp.ok) { bad++; console.log('  !! 非 200，核心可能未上传') }
    if (expect !== null && total !== expect) bad++
  } catch (e) {
    bad++
    console.log(`${remote}\n  请求失败: ${e}`)
  }
}
console.log(bad === 0 ? '\n核验通过。' : `\n有 ${bad} 项异常，请检查上面的输出。`)
