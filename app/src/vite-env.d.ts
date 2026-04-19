/// <reference types="vite/client" />

import type { IpcApi } from './types'

declare global {
  interface Window {
    desktopApi?: {
      invoke: <T = unknown>(channel: string, payload?: unknown) => Promise<T>
    }
    api: IpcApi
  }
}
