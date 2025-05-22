import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

export const Route = createFileRoute('/folders/$folderSlug/$promptSlug')({
  component: PromptComponent
})

function PromptComponent(): React.JSX.Element {
  const [prompt, setPrompt] = useState<PromptFile | null>(null)
  const { folderSlug, promptSlug } = Route.useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrompt = async (): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        if (!folderSlug || !promptSlug) {
          setPrompt(null)
          setLoading(false)
          return
        }
        const allFolders: IndexedFolder[] = await (window as Window).api.getIndexedFolders()
        const folder = allFolders.find((f) => f.slug === folderSlug)
        if (!folder) {
          setPrompt(null)
          setLoading(false)
          setError('Folder not found')
          return
        }
        const promptFile = folder.prompts.find((p) => p.slug === promptSlug)
        if (!promptFile) {
          setPrompt(null)
          setLoading(false)
          setError('Prompt not found')
          return
        }
        setPrompt(promptFile)
      } catch {
        setError('Failed to load prompt')
        setPrompt(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPrompt()
  }, [folderSlug, promptSlug])

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading prompt...</div>
  }
  if (error || !prompt) {
    return <div className="p-8 text-center text-red-500">{error || 'Prompt not found.'}</div>
  }

  return (
    <div className="p-4">
      {prompt.frontmatter && (
        <>
          <h1 className="text-2xl font-bold mb-2 dark:text-white">
            {prompt.frontmatter.name as string}
          </h1>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">Frontmatter</h2>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(prompt.frontmatter).map(([key, value]) => (
                <div key={key} className="flex flex-col mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-2 dark:text-white">Prompt Content</h2>
        <div className="prose dark:prose-invert max-w-none border rounded p-4 bg-gray-50 dark:bg-gray-800">
          <ReactMarkdown>{prompt.contentBody || ''}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
