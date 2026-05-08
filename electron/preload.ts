import type { IpcRendererEvent } from 'electron'
// @ts-ignore
const { ipcRenderer, contextBridge } = require('electron')

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    return ipcRenderer.on(channel, (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args))
  },
  off(channel: string, listener: (...args: any[]) => void) {
    return ipcRenderer.off(channel, listener as any)
  },
  send(channel: string, ...args: any[]) {
    return ipcRenderer.send(channel, ...args)
  },
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args)
  },
})
