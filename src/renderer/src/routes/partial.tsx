import React, { useEffect, useState } from 'react'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { createFileRoute } from '@tanstack/react-router'

interface Partial {
  name: string
  content: string
}

type ApiResult = { success: boolean; partials?: Record<string, string>; error?: string }

const PartialManager: React.FC = () => {
  const [partials, setPartials] = useState<Partial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addContent, setAddContent] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editName, setEditName] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const fetchPartials = async () => {
    setLoading(true)
    setError(null)
    try {
      const parts = await (window as Window).api.getPartials()
      setPartials(Object.entries(parts).map(([name, content]) => ({ name, content })))
    } catch (e) {
      setError(`Failed to load partials: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPartials()
  }, [])

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setAddError(null)
    if (!addName.trim() || !addContent.trim()) {
      setAddError('Name and content are required')
      return
    }
    if (addName.length > 100) {
      setAddError('Name must be 100 characters or less')
      return
    }
    if (addContent.length > 5000) {
      setAddError('Content must be 5000 characters or less')
      return
    }
    const res: ApiResult = await window.api.addPartial(addName, addContent)
    if (!res.success) {
      setAddError(res.error || 'Failed to add partial')
    } else {
      setAddName('')
      setAddContent('')
      fetchPartials()
    }
  }

  const handleEdit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setEditError(null)
    if (!editName || !editContent.trim()) {
      setEditError('Content is required')
      return
    }
    if (editContent.length > 5000) {
      setEditError('Content must be 5000 characters or less')
      return
    }
    const res: ApiResult = await window.api.updatePartial(editName, editContent)
    if (!res.success) {
      setEditError(res.error || 'Failed to update partial')
    } else {
      setShowEdit(false)
      setEditName(null)
      setEditContent('')
      fetchPartials()
    }
  }

  const handleDelete = async (name: string): Promise<void> => {
    if (!window.confirm(`Delete partial '${name}'?`)) return
    const res: ApiResult = await window.api.deletePartial(name)
    if (!res.success) {
      setError(res.error || 'Failed to delete partial')
    } else {
      fetchPartials()
    }
  }

  const startEdit = (name: string, content: string): void => {
    setEditName(name)
    setEditContent(content)
    setShowEdit(true)
    setEditError(null)
  }

  return (
    <div className="mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Partials</h1>
      <form className="space-y-2 mb-6" onSubmit={handleAdd}>
        <Input
          placeholder="Partial name"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          maxLength={100}
        />
        <Textarea
          placeholder="Partial content"
          value={addContent}
          onChange={(e) => setAddContent(e.target.value)}
          maxLength={5000}
          rows={4}
        />
        <Button type="submit">Add Partial</Button>
      </form>
      {addError && <div className="text-red-500 mb-2">{addError}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="space-y-4">
          {partials.map((p) => (
            <div key={p.name} className="border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-mono font-semibold">{p.name}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(p.name, p.content)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.name)}>
                    Delete
                  </Button>
                </div>
              </div>
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                {p.content}
              </pre>
            </div>
          ))}
        </div>
      )}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-[625px]">
          <h2 className="text-lg font-bold mb-2">Edit Partial</h2>
          <form onSubmit={handleEdit}>
            <Label className="block mb-1">Name</Label>
            <Input value={editName || ''} disabled className="mb-2" />
            <Label className="block mb-1">Content</Label>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={5000}
              rows={8}
              className="mb-2"
            />
            {editError && <div className="text-red-500 mb-2">{editError}</div>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <div className="mt-8 text-gray-500 text-xs">
        Include partials in prompts with <span className="font-mono">{'{{> partial_name }}'}</span>.
        Partials can contain variables that will be substituted when rendered.
      </div>
    </div>
  )
}

export default PartialManager

export const Route = createFileRoute('/partial')({
  component: PartialManager
})
