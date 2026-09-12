/**
 * OCR 引擎(单例懒加载)。
 * 使用本地化的 Tesseract.js(worker/core/语言包均在 public/tesseract)，
 * 避免 PP-OCR(onnxruntime-web)在 COEP 隔离 + Vite 打包 + Cloudflare 25MiB
 * 组合下的 wasm 过大/worker 崩溃问题。
 */
import { createWorker } from 'tesseract.js'
import type { Worker } from 'tesseract.js'

type ProgressCb = ((progress: number) => void) | null

let progressCb: ProgressCb = null

export function setEngineProgress(cb: ProgressCb): void {
  progressCb = cb
}

const WORKER_PATH = '/tesseract/worker.min.js'
// 用非 SIMD 的 lstm core，兼容性最好；单个也是小体积，无 25MiB 困扰
const CORE_PATH = '/tesseract/core/tesseract-core-lstm.wasm.js'
const LANG_PATH = '/tesseract/lang'

let workerPromise: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(['chi_sim', 'eng', 'jpn'], 1, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (m) => {
        if (progressCb && typeof m.progress === 'number') {
          progressCb(m.progress)
        }
      },
    }).catch((err) => {
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

export function getEngine() {
  return {
    async recognize(file: File): Promise<{ fullText: string }> {
      const worker = await getWorker()
      const { data } = await worker.recognize(file)
      return { fullText: data.text ?? '' }
    },
  }
}