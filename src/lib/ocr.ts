import { OcrEngine } from '@ocr-web/core'

let enginePromise: Promise<OcrEngine> | null = null
let progressCb: ((p: number) => void) | null = null

export function setEngineProgress(cb: ((p: number) => void) | null) {
  progressCb = cb
}

/**
 * Lazy-singleton: builds and caches a single RapidOCR/PP-OCRv5 engine.
 * Models + ONNX runtime are served from local /ocr and /ort.
 */
export function getEngine(): Promise<OcrEngine> {
  if (!enginePromise) {
    enginePromise = OcrEngine.create({
      models: {
        detection: '/ocr/ppocrv5_det.onnx',
        recognition: '/ocr/ppocrv5_rec.onnx',
      },
      dictionary: '/ocr/ppocrv5_dict.txt',
      runtime: 'wasm',
      wasmPaths: '/ort/',
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