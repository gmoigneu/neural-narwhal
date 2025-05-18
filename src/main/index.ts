import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'

// Define a schema for the store
interface AppStore {
  vaultDirectory?: string
}

// Initialize electron-store with the schema
const store = new Store<AppStore>({
  defaults: {
    vaultDirectory: undefined
  }
})

// Function to get the vault directory
function getVaultDirectory(): string | undefined {
  return store.get('vaultDirectory')
}

// IPC handler for renderer to request opening the native folder selection dialog
ipcMain.handle('select-native-folder', async (event) => {
  const mainWindow = BrowserWindow.fromWebContents(event.sender)
  if (!mainWindow) return undefined

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Vault Directory',
    buttonLabel: 'Select Folder'
  })

  if (canceled || filePaths.length === 0) {
    return undefined
  }
  return filePaths[0]
})

// IPC handler for renderer to save the chosen vault directory
ipcMain.handle('save-vault-directory', async (event, vaultPath: string | undefined) => {
  const mainWindow = BrowserWindow.fromWebContents(event.sender)

  if (!vaultPath) {
    if (mainWindow) {
      dialog.showMessageBoxSync(mainWindow, {
        type: 'error',
        title: 'Vault Directory Not Saved',
        message: 'No vault directory was selected. The application will now close.'
      })
    } else {
      console.error(
        'Vault Directory Not Saved: No directory provided and no main window available for dialog.'
      )
    }
    app.quit()
    return { success: false, error: 'No path provided.' }
  }

  try {
    store.set('vaultDirectory', vaultPath)
    console.log(`Vault directory set to: ${vaultPath}`)
    if (mainWindow) {
      mainWindow.webContents.send('vault-set-success') // Inform renderer
    }
    return { success: true, path: vaultPath }
  } catch (error: unknown) {
    console.error('Failed to save vault directory:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    if (mainWindow) {
      dialog.showMessageBoxSync(mainWindow, {
        type: 'error',
        title: 'Error Saving Vault',
        message: `Failed to save the vault directory: ${errorMessage}. The application will now close.`
      })
    }
    app.quit()
    return { success: false, error: errorMessage }
  }
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Listen for did-finish-load before checking vault and potentially sending IPC
  mainWindow.webContents.on('did-finish-load', () => {
    checkAndSetVaultDirectory(mainWindow); // Now check vault status
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or local HTML for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Function to check and set vault directory
async function checkAndSetVaultDirectory(mainWindow: BrowserWindow): Promise<void> {
  const vaultPath = getVaultDirectory()

  if (!vaultPath) {
    mainWindow.webContents.send('show-vault-setup-dialog')
  } else {
    console.log(`[Main Process] Vault directory found: ${vaultPath}`);
    mainWindow.webContents.send('vault-ready', vaultPath)
  }
}

app.whenReady().then(() => {
  // Log the userData path to help locate the electron-store JSON file
  console.log(`[Main Process] electron-store userData path: ${app.getPath('userData')}`);

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // IPC handler for renderer to get the current vault path
  ipcMain.handle('get-vault-path', () => {
    return getVaultDirectory()
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
