import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join, extname } from 'node:path'
import fs from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/electron-prompts.png?asset'
import Store from 'electron-store'
import slugify from '@sindresorhus/slugify'
import yaml from 'js-yaml'

export interface Window {
  api: {
    getIndexedFolders: () => Promise<IndexedFolder[]>
    onVaultIndexed: (callback: (indexedFolders: IndexedFolder[]) => void) => void
    onVaultReady: (callback: (vaultPath: string) => void) => void
    onVaultSetSuccess: (callback: () => void) => void
    onShowVaultSetupDialog: (callback: () => void) => void
    getVaultPath: () => Promise<string>
    selectNativeFolder: () => Promise<string>
    saveVaultDirectory: (vaultPath: string) => Promise<void>
    getVariables: () => Promise<Record<string, string>>
  }
}

// Define a schema for the store
interface PromptFile {
  name: string // e.g., "example-prompt.md"
  path: string // Full path to the file
  slug: string // Slugified filename (without .md)
  frontmatter?: Record<string, unknown> // Parsed YAML frontmatter
  contentBody?: string // The content of the prompt after the frontmatter
  lastIndexed: number // Timestamp of the last indexing
}

export interface IndexedFolder {
  name: string // e.g., "Test folder"
  path: string // Full path to the folder
  slug: string // Slugified path
  prompts: PromptFile[]
}

interface AppStore {
  vaultDirectory?: string
  indexedFolders?: IndexedFolder[]
  variables?: Record<string, string> // Add variables to the store
  partials?: Record<string, string> // Add partials to the store
}

// Initialize electron-store with the schema
const store = new Store<AppStore>({
  defaults: {
    vaultDirectory: undefined,
    indexedFolders: [] // Default to an empty array
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
        message:
          'No vault directory was selected. The application may not function correctly or will close.'
      })
      // Optionally, prevent further app operation or guide user to select again
      // For now, we allow the app to continue but log an error.
      console.error('Vault Directory Not Saved: No directory provided.')
      // Consider sending a specific IPC message to renderer to re-trigger setup
      mainWindow?.webContents.send('show-vault-setup-dialog')
      return { success: false, error: 'No path provided, setup dialog triggered.' }
    } else {
      console.error(
        'Vault Directory Not Saved: No directory provided and no main window available for dialog.'
      )
      // If no mainWindow, this is a critical setup failure, likely on initial launch without UI.
      // Depending on app design, might quit or retry. For now, quit.
      app.quit()
      return { success: false, error: 'No path provided and no window context.' }
    }
  }

  try {
    store.set('vaultDirectory', vaultPath)
    console.log(`Vault directory set to: ${vaultPath}`)
    await indexVaultDirectory(vaultPath, mainWindow) // Index after setting
    if (mainWindow) {
      mainWindow.webContents.send('vault-set-success') // Inform renderer
    }
    return { success: true, path: vaultPath }
  } catch (error: unknown) {
    console.error('Failed to save/index vault directory:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
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

// Function to parse a single prompt file
async function parsePromptFileContent(
  filePath: string,
  fileName: string // pass the filename for slug generation
): Promise<Omit<PromptFile, 'name' | 'path' | 'lastIndexed'> & { error?: string }> {
  const slug = slugify(fileName.replace(/\.md$/i, ''), { lowercase: true })
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const parts = fileContent.split('---')
    let frontmatter: Record<string, unknown> | undefined
    let contentBody: string | undefined

    if (parts.length >= 3 && parts[0].trim() === '') {
      // Potential frontmatter
      try {
        frontmatter = yaml.load(parts[1]) as Record<string, unknown>
        contentBody = parts.slice(2).join('---').trim()
      } catch (e) {
        console.warn(`[Main Process] YAML parsing error in ${filePath}:`, e)
        // Fallback: treat entire content as body if YAML is malformed
        contentBody = fileContent.trim()
        return { contentBody, slug, error: `YAML parsing error: ${(e as Error).message}` }
      }
    } else {
      // No valid frontmatter found or not in Prompty format
      contentBody = fileContent.trim()
    }

    return { frontmatter, contentBody, slug }
  } catch (error) {
    console.error(`[Main Process] Error reading or processing file ${filePath}:`, error)
    return { error: `Failed to read file: ${(error as Error).message}`, slug }
  }
}

async function indexVaultDirectory(
  vaultPath: string,
  mainWindow: BrowserWindow | null
): Promise<void> {
  console.log(`[Main Process] Indexing vault directory: ${vaultPath}`)
  try {
    const indexedFolders: IndexedFolder[] = []
    const entries = await fs.readdir(vaultPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = join(vaultPath, entry.name)
        const promptFiles: PromptFile[] = []
        try {
          const subEntries = await fs.readdir(folderPath, { withFileTypes: true })
          for (const subEntry of subEntries) {
            if (subEntry.isFile() && extname(subEntry.name).toLowerCase() === '.md') {
              const filePath = join(folderPath, subEntry.name)
              const parsedContent = await parsePromptFileContent(filePath, subEntry.name)
              if (parsedContent.error) {
                console.warn(
                  `[Main Process] Skipping file ${filePath} due to error: ${parsedContent.error}`
                )
                // Optionally, still add the file but with an error status
                promptFiles.push({
                  name: subEntry.name,
                  path: filePath,
                  slug: parsedContent.slug,
                  lastIndexed: Date.now(),
                  contentBody: `Error: ${parsedContent.error}` // Store error in contentBody
                })
              } else {
                promptFiles.push({
                  name: subEntry.name,
                  path: filePath,
                  slug: parsedContent.slug,
                  frontmatter: parsedContent.frontmatter,
                  contentBody: parsedContent.contentBody,
                  lastIndexed: Date.now()
                })
              }
            }
          }
          indexedFolders.push({
            name: entry.name,
            path: folderPath,
            slug: slugify(entry.name, { lowercase: true }),
            prompts: promptFiles
          })
        } catch (err) {
          console.error(`[Main Process] Error reading subdirectory ${folderPath}:`, err)
          // Skip this folder or handle error as needed
        }
      }
    }
    store.set('indexedFolders', indexedFolders)
    console.log('[Main Process] Vault indexing complete. Folders found:', indexedFolders.length)
    if (mainWindow) {
      mainWindow.webContents.send('vault-indexed', indexedFolders) // Send indexed data
    }
  } catch (error) {
    console.error(`[Main Process] Error indexing vault directory ${vaultPath}:`, error)
    store.set('indexedFolders', []) // Clear or set to empty on error
    if (mainWindow) {
      mainWindow.webContents.send('vault-indexed', []) // Or send an error signal
    }
  }
}

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
    checkAndSetVaultDirectory(mainWindow) // Now check vault status
  })

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
    console.log(`[Main Process] Vault directory found: ${vaultPath}`)
    await indexVaultDirectory(vaultPath, mainWindow) // Index if vault already set
    mainWindow.webContents.send('vault-ready', vaultPath)
  }
}

app.whenReady().then(() => {
  // Log the userData path to help locate the electron-store JSON file
  console.log(`[Main Process] electron-store userData path: ${app.getPath('userData')}`)

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

// IPC handler for renderer to get indexed folders
ipcMain.handle('get-indexed-folders', async () => {
  return store.get('indexedFolders')
})

// IPC handler for renderer to get prompts for a specific folder slug
ipcMain.handle('get-prompts-for-folder', async (_, folderSlug: string) => {
  const indexedFolders = store.get('indexedFolders')
  if (indexedFolders) {
    const folder = indexedFolders.find((f) => f.slug === folderSlug)
    return folder?.prompts
  }
  return undefined
})

// --- Variable IPC handlers ---
ipcMain.handle('get-variables', () => {
  return store.get('variables') || {}
})
ipcMain.handle('add-variable', (_event, { key, value }: { key: string; value: string }) => {
  if (!key || typeof key !== 'string' || key.length > 255) {
    return { success: false, error: 'Invalid variable name.' }
  }
  if (typeof value !== 'string' || value.length > 255) {
    return { success: false, error: 'Invalid variable value.' }
  }
  const variables = store.get('variables') || {}
  if (variables[key]) {
    return { success: false, error: 'Variable already exists.' }
  }
  variables[key] = value
  store.set('variables', variables)
  return { success: true, variables }
})
ipcMain.handle('update-variable', (_event, { key, value }: { key: string; value: string }) => {
  if (!key || typeof key !== 'string' || key.length > 255) {
    return { success: false, error: 'Invalid variable name.' }
  }
  if (typeof value !== 'string' || value.length > 255) {
    return { success: false, error: 'Invalid variable value.' }
  }
  const variables = store.get('variables') || {}
  if (!variables[key]) {
    return { success: false, error: 'Variable does not exist.' }
  }
  variables[key] = value
  store.set('variables', variables)
  return { success: true, variables }
})
ipcMain.handle('delete-variable', (_event, key: string) => {
  if (!key || typeof key !== 'string') {
    return { success: false, error: 'Invalid variable name.' }
  }
  const variables = store.get('variables') || {}
  if (!variables[key]) {
    return { success: false, error: 'Variable does not exist.' }
  }
  delete variables[key]
  store.set('variables', variables)
  return { success: true, variables }
})

// IPC handlers for partials management
ipcMain.handle('get-partials', async () => {
  const partials = store.get('partials', {})
  return partials
})

ipcMain.handle(
  'add-partial',
  async (_event, { name, content }: { name: string; content: string }) => {
    if (!name || typeof name !== 'string' || name.length > 100) {
      return {
        success: false,
        error: 'Invalid partial name. Must be a string with 100 characters or less.'
      }
    }
    if (!content || typeof content !== 'string' || content.length > 5000) {
      return {
        success: false,
        error: 'Invalid partial content. Must be a string with 5000 characters or less.'
      }
    }
    const partials = store.get('partials', {})
    if (partials[name]) {
      return { success: false, error: 'Partial with this name already exists.' }
    }
    partials[name] = content
    store.set('partials', partials)
    return { success: true, partials }
  }
)

ipcMain.handle(
  'update-partial',
  async (_event, { name, content }: { name: string; content: string }) => {
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Invalid partial name.' }
    }
    if (!content || typeof content !== 'string' || content.length > 5000) {
      return {
        success: false,
        error: 'Invalid partial content. Must be a string with 5000 characters or less.'
      }
    }
    const partials = store.get('partials', {})
    if (!partials[name]) {
      return { success: false, error: 'Partial does not exist.' }
    }
    partials[name] = content
    store.set('partials', partials)
    return { success: true, partials }
  }
)

ipcMain.handle('delete-partial', async (_event, name: string) => {
  if (!name || typeof name !== 'string') {
    return { success: false, error: 'Invalid partial name.' }
  }
  const partials = store.get('partials', {})
  if (!partials[name]) {
    return { success: false, error: 'Partial does not exist.' }
  }
  delete partials[name]
  store.set('partials', partials)
  return { success: true, partials }
})

// IPC handler for saving a prompt
ipcMain.handle(
  'save-prompt',
  async (_event, filePath: string, frontmatter: Record<string, unknown>, contentBody: string) => {
    try {
      // Generate the markdown content with frontmatter
      let markdownContent = ''

      if (frontmatter && Object.keys(frontmatter).length > 0) {
        const yamlString = yaml.dump(frontmatter, { indent: 2 })
        markdownContent = `---\n${yamlString}---\n\n${contentBody}`
      } else {
        markdownContent = contentBody
      }

      // Write to file
      await fs.writeFile(filePath, markdownContent, 'utf-8')

      // Update the store by re-indexing the vault
      const vaultPath = getVaultDirectory()
      if (vaultPath) {
        const mainWindow = BrowserWindow.getAllWindows()[0]
        await indexVaultDirectory(vaultPath, mainWindow)
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving prompt:', error)
      return { success: false, error: `Failed to save prompt: ${(error as Error).message}` }
    }
  }
)

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
