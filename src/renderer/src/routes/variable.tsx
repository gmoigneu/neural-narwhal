import React, { useEffect, useState } from 'react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { createFileRoute } from '@tanstack/react-router'

interface Variable {
  key: string
  value: string
}

type ApiResult = { success: boolean; variables?: Record<string, string>; error?: string }

const VariableManager: React.FC = () => {
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addKey, setAddKey] = useState('')
  const [addValue, setAddValue] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const fetchVariables = async () => {
    setLoading(true)
    setError(null)
    try {
      const vars = await (window as Window).api.getVariables()
      setVariables(Object.entries(vars).map(([key, value]) => ({ key, value })))
    } catch (e) {
      setError(`Failed to load variables: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVariables()
  }, [])

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setAddError(null)
    if (!addKey.trim() || !addValue.trim()) {
      setAddError('Key and value are required')
      return
    }
    if (addKey.length > 255 || addValue.length > 255) {
      setAddError('Key and value must be 255 characters or less')
      return
    }
    const res: ApiResult = await window.api.addVariable(addKey, addValue)
    if (!res.success) {
      setAddError(res.error || 'Failed to add variable')
    } else {
      setAddKey('')
      setAddValue('')
      fetchVariables()
    }
  }

  const handleEdit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setEditError(null)
    if (!editKey || !editValue.trim()) {
      setEditError('Value is required')
      return
    }
    if (editValue.length > 255) {
      setEditError('Value must be 255 characters or less')
      return
    }
    const res: ApiResult = await window.api.updateVariable(editKey, editValue)
    if (!res.success) {
      setEditError(res.error || 'Failed to update variable')
    } else {
      setShowEdit(false)
      setEditKey(null)
      setEditValue('')
      fetchVariables()
    }
  }

  const handleDelete = async (key: string): Promise<void> => {
    if (!window.confirm(`Delete variable '${key}'?`)) return
    const res: ApiResult = await window.api.deleteVariable(key)
    if (!res.success) {
      setError(res.error || 'Failed to delete variable')
    } else {
      fetchVariables()
    }
  }

  const startEdit = (key: string, value: string): void => {
    setEditKey(key)
    setEditValue(value)
    setShowEdit(true)
    setEditError(null)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Variables</h1>
      <form className="flex gap-2 mb-6" onSubmit={handleAdd}>
        <Input
          placeholder="Key"
          value={addKey}
          onChange={(e) => setAddKey(e.target.value)}
          maxLength={255}
        />
        <Input
          placeholder="Value"
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          maxLength={255}
        />
        <Button type="submit">Add</Button>
      </form>
      {addError && <div className="text-red-500 mb-2">{addError}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-2 text-left">Key</th>
              <th className="p-2 text-left">Value</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.key} className="border-t">
                <td className="p-2 font-mono">{v.key}</td>
                <td className="p-2 font-mono">{v.value}</td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(v.key, v.value)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(v.key)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Dialog open={showEdit} onOpenChange={() => setShowEdit}>
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white dark:bg-gray-900 rounded shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Edit Variable</h2>
            <form onSubmit={handleEdit}>
              <Label className="block mb-1">Key</Label>
              <Input value={editKey || ''} disabled className="mb-2" />
              <Label className="block mb-1">Value</Label>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                maxLength={255}
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
          </div>
        </div>
      </Dialog>
      <div className="mt-8 text-gray-500 text-xs">
        Use variables in prompts with <span className="font-mono">{'{{ variable_name }}'}</span>.
      </div>
    </div>
  )
}

export default VariableManager

export const Route = createFileRoute('/variable')({
  component: VariableManager
})
