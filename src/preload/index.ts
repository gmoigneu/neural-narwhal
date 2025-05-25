import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Minimal type definitions for preload's awareness, mirroring those in main/index.ts for the API contract.
// These ensure preload knows the shape of data it's passing for getIndexedFolders and onVaultIndexed.
interface PromptFilePreload {
  name: string
  path: string
  frontmatter?: Record<string, unknown>
  contentBody?: string
  lastIndexed: number
}

interface IndexedFolderPreload {
  name: string
  path: string
  slug: string
  prompts: PromptFilePreload[]
}

// Custom APIs for renderer
const api = {
  // Method to get the initial vault path or check if it's set
  getVaultPath: (): Promise<string | undefined> => ipcRenderer.invoke('get-vault-path'),
  // Method to trigger native folder selection dialog
  selectNativeFolder: (): Promise<string | undefined> => ipcRenderer.invoke('select-native-folder'),
  // Method to save the selected vault directory
  saveVaultDirectory: (
    path: string
  ): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('save-vault-directory', path),
  // Listener for main process instructing to show the dialog
  onShowVaultSetupDialog: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('show-vault-setup-dialog', handler)
    return () => ipcRenderer.removeListener('show-vault-setup-dialog', handler)
  },
  // Listener for main process indicating vault is already set and ready
  onVaultReady: (callback: (path: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, path: string): void => callback(path)
    ipcRenderer.on('vault-ready', handler)
    return () => ipcRenderer.removeListener('vault-ready', handler)
  },
  // Listener for successful vault set confirmation
  onVaultSetSuccess: (callback: () => void): (() => void) => {
    const channel = 'vault-set-success'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const listener = (_event: IpcRendererEvent): void => callback()
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },
  getIndexedFolders: (): Promise<IndexedFolderPreload[]> =>
    ipcRenderer.invoke('get-indexed-folders'),
  onVaultIndexed: (callback: (indexedFolders: IndexedFolderPreload[]) => void) => {
    const channel = 'vault-indexed'
    const listener = (_event: IpcRendererEvent, indexedFolders: IndexedFolderPreload[]): void =>
      callback(indexedFolders)
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },
  getPromptsForFolder: (folderSlug: string): Promise<PromptFilePreload[] | undefined> =>
    ipcRenderer.invoke('get-prompts-for-folder', folderSlug),
  getVariables: (): Promise<Record<string, string>> => ipcRenderer.invoke('get-variables'),
  addVariable: (
    key: string,
    value: string
  ): Promise<{ success: boolean; variables?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('add-variable', { key, value }),
  updateVariable: (
    key: string,
    value: string
  ): Promise<{ success: boolean; variables?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('update-variable', { key, value }),
  deleteVariable: (
    key: string
  ): Promise<{ success: boolean; variables?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('delete-variable', key),
  savePrompt: (
    filePath: string,
    frontmatter: Record<string, unknown>,
    contentBody: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-prompt', filePath, frontmatter, contentBody),
  getPartials: (): Promise<Record<string, string>> => ipcRenderer.invoke('get-partials'),
  addPartial: (
    name: string,
    content: string
  ): Promise<{ success: boolean; partials?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('add-partial', { name, content }),
  updatePartial: (
    name: string,
    content: string
  ): Promise<{ success: boolean; partials?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('update-partial', { name, content }),
  deletePartial: (
    name: string
  ): Promise<{ success: boolean; partials?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('delete-partial', name)
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
