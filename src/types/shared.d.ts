// Shared global types for Prompt Manager
// Place this file in src/types/shared.d.ts

declare global {
  interface PromptFile {
    name: string // File name, e.g., "example-prompt.md"
    path: string // Full path to the file
    slug: string // Slugified filename (without .md)
    frontmatter?: Record<string, unknown> // Parsed YAML frontmatter
    contentBody?: string // The content of the prompt after the frontmatter
    lastIndexed: number // Timestamp of the last indexing
  }

  interface IndexedFolder {
    name: string // Folder name
    path: string // Full path to the folder
    slug: string // Slugified path
    prompts: PromptFile[] // List of prompt files in this folder
  }

  interface Window {
    electron: unknown // Replace 'unknown' with the actual type of electronAPI if known
    api: {
      getVaultPath: () => Promise<string | undefined>
      selectNativeFolder: () => Promise<string | undefined>
      saveVaultDirectory: (path: string) => Promise<{
        success: boolean
        path?: string
        error?: string
      }>
      onShowVaultSetupDialog: (callback: () => void) => () => void
      onVaultReady: (callback: (path: string) => void) => () => void
      onVaultSetSuccess: (callback: () => void) => () => void
      onVaultIndexed: (callback: (indexedFolders: IndexedFolder[]) => void) => () => void
      getIndexedFolders: () => Promise<IndexedFolder[]>
      getPromptsForFolder: (folderSlug: string) => Promise<PromptFile[] | undefined>
      getVariables: () => Promise<Record<string, string>>
      addVariable: (
        key: string,
        value: string
      ) => Promise<{
        success: boolean
        variables?: Record<string, string>
        error?: string
      }>
      updateVariable: (
        key: string,
        value: string
      ) => Promise<{
        success: boolean
        variables?: Record<string, string>
        error?: string
      }>
      deleteVariable: (key: string) => Promise<{
        success: boolean
        variables?: Record<string, string>
        error?: string
      }>
      savePrompt: (
        filePath: string,
        frontmatter: Record<string, unknown>,
        contentBody: string
      ) => Promise<{
        success: boolean
        error?: string
      }>
    }
  }
}

// Ensure this file is treated as a script and not a module
export {}
