import { OcrEngine } from '@ocr-web/core'

let enginePromise: Promise<OcrEngine> | null = null
let progressCb: ((p: number) => void) | null = null

export function setEngineProgress(cb: ((p: number) => void) | null) {
  progressCb = cb
}

/**
 * Lazy-singleton: builds and caches a single RapidOCR/PP-OCRv5 engine.
 * ONNX 模型本地托管；onnxruntime 的 wasm（26.5MiB 超出 Cloudflare Pages 单文件 25MiB 限制）
 * 改为从 Supabase Storage 公开桶拉取。
 */
const ORT_STORAGE_BASE = 'https://noiebpjyskscjtmdytxj.supabase.co/storage/v1/object/public/ort/'

export function getEngine(): Promise<OcrEngine> {
  if (!enginePromise) {
    enginePromise = OcrEngine.create({
      models: {
        detection: '/ocr/ppocrv5_det.onnx',
        recognition: '/ocr/ppocrv5_rec.onnx',
      },
      dictionary: '/ocr/ppocrv5_dict.txt',
      runtime: 'wasm',
      // 让 onnxruntime 的 glue(.mjs) 与 wasm 都从 Supabase Storage 拉取，避免部署超限
      wasmPaths: {
        'ort-wasm-simd-threaded.jsep.mjs': ORT_STORAGE_BASE + 'ort-wasm-simd-threaded.jsep.mjs',
        'ort-wasm-simd-threaded.jsep.wasm': ORT_STORAGE_BASE + 'ort-wasm-simd-threaded.jsep.wasm',
      },
      numThreads: 2,
      onProgress: ({ loaded, total }) => {
        if (progressCb) progressCb(total > 0 ? loaded / total : 0)
      },
    }).catch((err) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}