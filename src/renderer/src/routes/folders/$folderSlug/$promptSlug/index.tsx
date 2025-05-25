import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

export const Route = createFileRoute('/folders/$folderSlug/$promptSlug/')({
  component: PromptComponent
})

function substituteVariables(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(variables, varName)) {
      return `<span style="color: #2563eb; background-color: #eff6ff; padding: 2px 4px; border-radius: 4px; font-weight: 500;">${variables[varName]}</span>`
    } else {
      return `<span style="color: #dc2626; background-color: #fef2f2; padding: 2px 4px; border-radius: 4px; font-weight: 500;">${match}</span>`
    }
  })
}

function substitutePartials(
  content: string,
  partials: Record<string, string>,
  variables: Record<string, string>,
  depth: number = 0
): string {
  // Prevent infinite recursion
  if (depth > 5) {
    console.warn('Maximum partial nesting depth reached')
    return content
  }

  // Replace partials with syntax {{> partial_name }}
  let result = content.replace(/\{\{>\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, partialName) => {
    if (Object.prototype.hasOwnProperty.call(partials, partialName)) {
      const partialContent = partials[partialName]
      // Recursively process partials within partials
      const processedPartial = substitutePartials(partialContent, partials, variables, depth + 1)
      return `<div style="border-left: 3px solid #8b5cf6; padding-left: 12px; margin: 8px 0;">${processedPartial}</div>`
    } else {
      return `<span style="color: #dc2626; background-color: #fef2f2; padding: 2px 4px; border-radius: 4px; font-weight: 500;">${match}</span>`
    }
  })

  // Substitute variables after processing partials
  result = substituteVariables(result, variables)

  return result
}

function PromptComponent(): React.JSX.Element {
  const [prompt, setPrompt] = useState<PromptFile | null>(null)
  const { folderSlug, promptSlug } = Route.useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renderedContent, setRenderedContent] = useState<string>('')

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

  useEffect(() => {
    const fetchVarsAndRender = async (): Promise<void> => {
      if (!prompt) {
        setRenderedContent('')
        return
      }
      const [vars, parts] = await Promise.all([
        (window as Window).api.getVariables(),
        (window as Window).api.getPartials()
      ])
      const processedContent = substitutePartials(prompt.contentBody || '', parts, vars)
      setRenderedContent(processedContent)
    }
    fetchVarsAndRender()
  }, [prompt])

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
          <div className="flex-row">
            <h1 className="text-2xl font-bold mb-2 dark:text-white">
              {prompt.frontmatter.name as string}
            </h1>
            <Link
              to={'/folders/$folderSlug/$promptSlug/edit'}
              params={{ folderSlug, promptSlug }}
              className="text-sm text-muted-foreground"
            >
              Edit Prompt
            </Link>
          </div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">Frontmatter</h2>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(prompt.frontmatter).map(([key, value]) => {
                const normalizedKey = key.toLowerCase()
                let displayValue: string

                if (normalizedKey === 'authors' && Array.isArray(value)) {
                  displayValue = value.join(', ')
                } else if (normalizedKey === 'model' && typeof value === 'object') {
                  displayValue = JSON.stringify(value, null, 2)
                } else if (typeof value === 'object') {
                  displayValue = JSON.stringify(value, null, 2)
                } else {
                  displayValue = String(value)
                }

                return (
                  <div key={key} className="flex flex-col mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span
                      className={`text-gray-900 dark:text-gray-100 ${normalizedKey === 'model' ? 'font-mono text-sm whitespace-pre-wrap' : ''}`}
                    >
                      {displayValue}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-2 dark:text-white">Prompt Content</h2>
        <div className="prose dark:prose-invert max-w-none border rounded p-4 bg-gray-50 dark:bg-gray-800">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{renderedContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
