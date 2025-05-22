import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BadgeX } from 'lucide-react'

export const Route = createFileRoute('/folders/$folderSlug/')({
  component: FolderComponent
})

function FolderComponent(): React.JSX.Element {
  const { folderSlug } = Route.useParams()
  const [prompts, setPrompts] = useState<PromptFile[]>([]) // PromptFile type from preload.d.ts
  const [folderName, setFolderName] = useState<string>('')

  useEffect(() => {
    const fetchPromptsAndFolderInfo = async (): Promise<void> => {
      if (!folderSlug) return

      console.log('[FolderComponent] window.api contents:', window.api) // Diagnostic log

      // Fetch all indexed folders to find the current folder's name
      // In a more complex app, you might have an API endpoint to get folder details by slug
      const allFolders = await (window as Window).api.getIndexedFolders()
      const currentFolder = allFolders.find((f) => f.slug === folderSlug)
      if (currentFolder) {
        setFolderName(currentFolder.name)
        const folderPrompts = await (window as Window).api.getPromptsForFolder(folderSlug)
        if (folderPrompts) {
          console.log('[FolderComponent] folderPrompts:', folderPrompts)
          setPrompts(folderPrompts)
        } else {
          setPrompts([]) // Folder exists but no prompts or error fetching them
        }
      } else {
        // Handle folder not found
        setFolderName('Unknown Folder')
        setPrompts([])
      }
    }
    fetchPromptsAndFolderInfo()
  }, [folderSlug])

  if (!folderSlug) {
    return <div>Loading folder information...</div>
  }

  return (
    <div className="p-4 h-full">
      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <BadgeX className="size-8 mb-4" />
          <p>No prompts found in this folder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((prompt) => (
            <Link
              to={`/folders/$folderSlug/$promptSlug`}
              params={{
                folderSlug: folderSlug,
                promptSlug: prompt.slug
              }}
              key={prompt.path}
              className="bg-white shadow-md rounded-lg p-4 dark:bg-gray-800"
            >
              <h2 className="text-xl font-semibold mb-2 dark:text-white">
                {prompt.name.replace(/\.md$/, '')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1 h-16 overflow-y-auto">
                {(prompt.frontmatter?.description as string) || 'No description available.'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Last updated: {new Date(prompt.lastIndexed).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
