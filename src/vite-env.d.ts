/// <reference types="vite/client" />

interface ImportMeta {
  glob: (path: string, options?: any) => Record<string, any>;
}

declare module 'gifenc' {
  export function GIFEncoder(opt?: { initialCapacity?: number; auto?: boolean }): {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: {
      transparent?: boolean;
      transparentIndex?: number;
      delay?: number;
      palette?: any;
      repeat?: number;
      colorDepth?: number;
      dispose?: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
    readonly buffer: any;
    readonly stream: any;
  };

  export function quantize(rgba: Uint8ClampedArray | Uint8Array, maxColors: number, opts?: {
    format?: 'rgb565' | 'rgb444' | 'rgba4444';
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  }): number[][];

  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: number[][], format?: string): Uint8Array;
}
