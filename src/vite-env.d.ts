/// <reference types="vite/client" />

interface ImportMeta {
  glob: (path: string, options?: any) => Record<string, any>;
}