import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/folders/$folderSlug/edit')({
  component: FolderEditComponent
})

function FolderEditComponent(): React.JSX.Element {
  return <div>Edit {`/folders/$($folderId)`}!</div>
}
