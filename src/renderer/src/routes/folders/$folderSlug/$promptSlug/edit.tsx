import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from '../../../../components/ui/form'

export const Route = createFileRoute('/folders/$folderSlug/$promptSlug/edit')({
  component: PromptEditComponent
})

// Zod schema for form validation
const promptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  authors: z.string().optional(), // Comma-separated string
  model: z.string().optional(), // JSON string
  contentBody: z.string().min(1, 'Prompt content is required')
})

type PromptFormData = z.infer<typeof promptSchema>

interface Variable {
  key: string
  value: string
}

interface VariableDropdownProps {
  variables: Variable[]
  onSelect: (variable: string) => void
  position: { top: number; left: number }
  visible: boolean
}

function VariableDropdown({
  variables,
  onSelect,
  position,
  visible
}: VariableDropdownProps): React.JSX.Element | null {
  if (!visible || variables.length === 0) return null

  return (
    <div
      className="absolute z-50 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-48 overflow-y-auto min-w-48"
      style={{ top: position.top, left: position.left }}
    >
      {variables.map((variable) => (
        <button
          key={variable.key}
          type="button"
          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          onClick={() => onSelect(variable.key)}
        >
          <div className="font-mono text-blue-600 dark:text-blue-400">{variable.key}</div>
          <div className="text-xs text-gray-500 truncate">{variable.value}</div>
        </button>
      ))}
    </div>
  )
}

function PromptEditComponent(): React.JSX.Element {
  const { folderSlug, promptSlug } = Route.useParams()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<PromptFile | null>(null)
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Variable dropdown state
  const [showVariableDropdown, setShowVariableDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [filteredVariables, setFilteredVariables] = useState<Variable[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = useState(0)

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: '',
      description: '',
      authors: '',
      model: '',
      contentBody: ''
    }
  })

  // Load prompt and variables
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        if (!folderSlug || !promptSlug) {
          setError('Invalid folder or prompt')
          return
        }

        // Fetch prompt
        const allFolders: IndexedFolder[] = await window.api.getIndexedFolders()
        const folder = allFolders.find((f) => f.slug === folderSlug)
        if (!folder) {
          setError('Folder not found')
          return
        }
        const promptFile = folder.prompts.find((p) => p.slug === promptSlug)
        if (!promptFile) {
          setError('Prompt not found')
          return
        }

        // Fetch variables
        const vars = await window.api.getVariables()
        const variableList = Object.entries(vars).map(([key, value]) => ({ key, value }))
        setVariables(variableList)
        setFilteredVariables(variableList)

        // Set form data
        const formData: PromptFormData = {
          name: (promptFile.frontmatter?.name as string) || promptFile.name.replace('.md', ''),
          description: (promptFile.frontmatter?.description as string) || '',
          authors: Array.isArray(promptFile.frontmatter?.authors)
            ? (promptFile.frontmatter.authors as string[]).join(', ')
            : (promptFile.frontmatter?.authors as string) || '',
          model: promptFile.frontmatter?.model
            ? JSON.stringify(promptFile.frontmatter.model, null, 2)
            : '',
          contentBody: promptFile.contentBody || ''
        }

        form.reset(formData)
        setPrompt(promptFile)
      } catch (e) {
        setError(`Failed to load prompt: ${e}`)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [folderSlug, promptSlug, form])

  // Handle variable autocomplete
  const handleContentChange = (value: string, cursorPos: number): void => {
    form.setValue('contentBody', value)
    setCursorPosition(cursorPos)

    // Check for {{ trigger
    const beforeCursor = value.substring(0, cursorPos)
    const lastBraceMatch = beforeCursor.match(/\{\{\s*([a-zA-Z0-9_-]*)\s*$/)

    if (lastBraceMatch && textareaRef.current) {
      const query = lastBraceMatch[1].toLowerCase()
      const filtered = variables.filter((v) => v.key.toLowerCase().includes(query))
      setFilteredVariables(filtered)

      // Calculate dropdown position
      const textarea = textareaRef.current
      const rect = textarea.getBoundingClientRect()
      const lines = beforeCursor.split('\n')
      const currentLine = lines.length - 1
      const currentColumn = lines[lines.length - 1].length

      // Rough calculation for cursor position
      const lineHeight = 20
      const charWidth = 8
      const top = rect.top + currentLine * lineHeight + lineHeight + 5
      const left = rect.left + currentColumn * charWidth

      setDropdownPosition({ top, left })
      setShowVariableDropdown(true)
    } else {
      setShowVariableDropdown(false)
    }
  }

  const handleVariableSelect = (variableKey: string): void => {
    const currentValue = form.getValues('contentBody')
    const beforeCursor = currentValue.substring(0, cursorPosition)
    const afterCursor = currentValue.substring(cursorPosition)

    // Replace the partial {{ with the full variable
    const newBefore = beforeCursor.replace(/\{\{\s*[a-zA-Z0-9_-]*\s*$/, `{{${variableKey}}}`)
    const newValue = newBefore + afterCursor

    form.setValue('contentBody', newValue)
    setShowVariableDropdown(false)

    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
      const newCursorPos = newBefore.length
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
    }
  }

  const onSubmit = async (data: PromptFormData): Promise<void> => {
    if (!prompt) return

    setSaving(true)
    try {
      // Parse model JSON if provided
      let modelData = null
      if (data.model && data.model.trim()) {
        try {
          modelData = JSON.parse(data.model)
        } catch {
          form.setError('model', { message: 'Invalid JSON format' })
          setSaving(false)
          return
        }
      }

      // Parse authors array
      const authorsArray =
        data.authors && data.authors.trim()
          ? data.authors
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : []

      // Prepare frontmatter
      const frontmatter: Record<string, unknown> = {
        name: data.name
      }

      if (data.description) {
        frontmatter.description = data.description
      }

      if (authorsArray.length > 0) {
        frontmatter.authors = authorsArray
      }

      if (modelData) {
        frontmatter.model = modelData
      }

      // Save prompt
      const result = await window.api.savePrompt(prompt.path, frontmatter, data.contentBody)

      if (result.success) {
        // Navigate back to prompt view
        navigate({ to: `/folders/${folderSlug}/${promptSlug}` })
      } else {
        setError(result.error || 'Failed to save prompt')
      }
    } catch (e) {
      setError(`Save failed: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading prompt...</div>
  }

  if (error || !prompt) {
    return <div className="p-8 text-center text-red-500">{error || 'Prompt not found.'}</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Edit Prompt</h1>
        <p className="text-muted-foreground">Editing: {prompt.name}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter prompt name..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Enter prompt description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Authors */}
          <FormField
            control={form.control}
            name="authors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authors</FormLabel>
                <FormControl>
                  <Input placeholder="Enter authors separated by commas..." {...field} />
                </FormControl>
                <FormDescription>Separate multiple authors with commas</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Model */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model Configuration</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter model configuration as JSON..."
                    className="font-mono text-sm"
                    rows={8}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Enter the model configuration as JSON (optional)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Content Body */}
          <FormField
            control={form.control}
            name="contentBody"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel>Prompt Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your prompt content... Use {{variable_name}} for variables."
                    className="min-h-64 font-mono"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      handleContentChange(e.target.value, e.target.selectionStart)
                    }}
                    onKeyUp={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      setCursorPosition(target.selectionStart)
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      setCursorPosition(target.selectionStart)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Type {'{{'} to see available variables. Use markdown formatting.
                </FormDescription>
                <FormMessage />

                <VariableDropdown
                  variables={filteredVariables}
                  onSelect={handleVariableSelect}
                  position={dropdownPosition}
                  visible={showVariableDropdown}
                />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Prompt'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: `/folders/${folderSlug}/${promptSlug}` })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
