import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Method to get the initial vault path or check if it's set
  getVaultPath: (): Promise<string | undefined> => ipcRenderer.invoke('get-vault-path'),
  // Method to trigger native folder selection dialog
  selectNativeFolder: (): Promise<string | undefined> => ipcRenderer.invoke('select-native-folder'),
  // Method to save the selected vault directory
  saveVaultDirectory: (path: string): Promise<{success: boolean, path?: string, error?: string}> => ipcRenderer.invoke('save-vault-directory', path),
  // Listener for main process instructing to show the dialog
  onShowVaultSetupDialog: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('show-vault-setup-dialog', handler)
    return () => {
      ipcRenderer.removeListener('show-vault-setup-dialog', handler)
    }
  },
  // Listener for main process indicating vault is already set and ready
  onVaultReady: (callback: (path: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, path: string): void => callback(path)
    ipcRenderer.on('vault-ready', handler)
    return () => ipcRenderer.removeListener('vault-ready', handler)
  },
  // Listener for successful vault set confirmation
  onVaultSetSuccess: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('vault-set-success', handler)
    return () => ipcRenderer.removeListener('vault-set-success', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

// Type definition for the exposed 'api' object for the renderer process.
// Create a file e.g., src/renderer/preload.d.ts and add this to it:
/*
declare global {
  export interface IVaultApi {
    getVaultPath: () => Promise<string | undefined>;
    selectNativeFolder: () => Promise<string | undefined>;
    saveVaultDirectory: (path: string) => Promise<{
      success: boolean;
      path?: string;
      error?: string;
    }>;
    onShowVaultSetupDialog: (callback: () => void) => () => void; // Returns a cleanup function
    onVaultReady: (callback: (path: string) => void) => () => void; // Returns a cleanup function
    onVaultSetSuccess: (callback: () => void) => () => void; // Returns a cleanup function
  }

  interface Window {
    electron: unknown; // Replace 'unknown' with a more specific type if available for electronAPI
    api: IVaultApi;
  }
}

// Make it a module by adding an empty export statement.
export {};
*/
