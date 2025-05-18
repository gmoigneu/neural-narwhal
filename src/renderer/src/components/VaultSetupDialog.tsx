import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
// We might need a way to show toast notifications for errors or success
// For now, console.log and alert will be used.

export function VaultSetupDialog(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const handleShowDialog = useCallback(() => {
    setError(undefined)
    window.api
      .getVaultPath()
      .then((currentPath) => {
        setSelectedPath(currentPath)
        setIsOpen(true)
      })
      .catch(err => {
        console.error('[VaultSetupDialog] Error in getVaultPath inside handleShowDialog:', err);
        // Optionally, still try to open the dialog but show an error,
        // or decide not to open if this initial check fails badly.
        setIsOpen(true); // Attempt to open even if getVaultPath fails to show setup
      })
  }, [])

  useEffect(() => {
    const cleanupShowDialog = window.api.onShowVaultSetupDialog(handleShowDialog)
    const cleanupVaultReady = window.api.onVaultReady((_path: string) => {
      // If needed, you can use the 'path' variable here.
      // For example: console.log('Vault is ready at path:', path);
      setIsOpen(false)
    })
    const cleanupVaultSetSuccess = window.api.onVaultSetSuccess(() => {
        setIsOpen(false);
        alert('Vault directory saved successfully!'); // Consider a less obtrusive notification
    });

    // Initial check to see if vault is already set. If not, main will command dialog to open.
    // If it is set, main will send 'vault-ready', handled above.
    window.api.getVaultPath().catch(console.error); // Just log error for initial check

    return () => {
      cleanupShowDialog()
      cleanupVaultReady()
      cleanupVaultSetSuccess()
    }
  }, [handleShowDialog])

  const handleChooseFolder = async (): Promise<void> => {
    setIsLoading(true)
    setError(undefined)
    try {
      const path = await window.api.selectNativeFolder()
      if (path) {
        setSelectedPath(path)
      }
    } catch (err) {
      console.error('Error selecting folder:', err)
      setError(err instanceof Error ? err.message : 'Failed to select folder')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedPath) {
      setError('Please choose a vault directory first.')
      return
    }
    setIsLoading(true)
    setError(undefined)
    try {
      const result = await window.api.saveVaultDirectory(selectedPath)
      if (!result.success) {
        setError(result.error || 'Failed to save vault directory.')
      }
      // On success, the onVaultSetSuccess listener will handle closing and alert.
    } catch (err) {
      console.error('Error saving vault directory:', err)
      setError(err instanceof Error ? err.message : 'Failed to save vault directory.')
    } finally {
      setIsLoading(false)
    }
  }

  // This dialog should not be closable by Escape key or overlay click if vault is mandatory
  // and not yet set. The `Dialog` component from shadcn/ui might allow `onInteractOutside`
  // and `onEscapeKeyDown` props, or `DialogPrimitive.Content` might need to be used directly
  // for more control if `modal={true}` (which is default for DialogPrimitive.Root) isn't enough.
  // For now, we rely on user clicking "Save" or main process quitting if they cancel.

  if (!isOpen) {
    return <></>
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-[425px]"
        // Prevent closing by interaction outside or escape key if setup is critical
        // onInteractOutside={(e) => e.preventDefault()}
        // onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Setup Vault Directory</DialogTitle>
          <DialogDescription>
            Please select a folder to use as your vault. This is where all your prompts and
            configurations will be stored.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vault-path" className="text-right">
              Vault Path
            </Label>
            <Input id="vault-path" value={selectedPath || 'Not selected'} readOnly className="col-span-3" />
          </div>
          <Button onClick={handleChooseFolder} disabled={isLoading} variant="outline">
            {isLoading ? 'Loading...' : 'Choose Folder...'}
          </Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          {/* <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button> */}
          <Button onClick={handleSave} disabled={isLoading || !selectedPath}>
            {isLoading ? 'Saving...' : 'Save and Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
