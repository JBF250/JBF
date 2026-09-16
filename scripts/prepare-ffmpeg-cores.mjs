#!/usr/bin/env node
// 把多线程 ffmpeg 核心从 node_modules 准备到 public/ffmpeg-mt/，供同源加载。
// 为什么要切分：Cloudflare Pages 单文件上限 25MiB，而 ffmpeg-core-mt.wasm 有 31MB，
// 无法直接部署；这里按 PART_SIZE 切片，前端取回后拼成一个 Blob 再交给 ffmpeg。
// 产物写在 public/ 下（已被 .gitignore 忽略），由 predev / prebuild 自动生成。
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'node_modules/@ffmpeg/core-mt/dist/esm')
const OUT_DIR = path.join(ROOT, 'public/ffmpeg-mt')

// 24MiB，留出余量确保不超过 Cloudflare Pages 的 25MiB 单文件上限
const PART_SIZE = 24 * 1024 * 1024

// [对外文件名, node_modules 中的源文件名]
const FILES = [
  ['ffmpeg-core-mt-esm.js', 'ffmpeg-core.js'],
  ['ffmpeg-core-mt.wasm', 'ffmpeg-core.wasm'],
  ['ffmpeg-core-mt.worker.js', 'ffmpeg-core.worker.js'],
]

rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const manifest = {}
for (const [outName, srcName] of FILES) {
  const srcPath = path.join(SRC_DIR, srcName)
  if (!existsSync(srcPath)) {
    console.error(`[准备核心] 缺少 ${srcPath}，请先执行 npm install`)
    process.exit(1)
  }
  const buf = readFileSync(srcPath)
  const parts = Math.ceil(buf.byteLength / PART_SIZE)
  if (parts <= 1) {
    writeFileSync(path.join(OUT_DIR, outName), buf)
  } else {
    for (let i = 0; i < parts; i++) {
      const slice = buf.subarray(i * PART_SIZE, Math.min((i + 1) * PART_SIZE, buf.byteLength))
      writeFileSync(path.join(OUT_DIR, `${outName}.part${i}`), slice)
    }
  }
  manifest[outName] = { size: buf.byteLength, parts }
  console.log(`[准备核心] ${outName} -> ${parts} 片, 共 ${(buf.byteLength / 1024 / 1024).toFixed(1)}MB`)
}

writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`[准备核心] 完成，输出目录 public/ffmpeg-mt`)
