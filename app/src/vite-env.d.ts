/// <reference types="vite/client" />

import type { IpcApi, IpcInvoker } from './types'

declare global {
  interface Window {
    desktopApi?: IpcInvoker
    api: IpcApi
  }
}
