import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/folders/$folderSlug/$promptSlug/edit')({
  component: PromptEditComponent
})

function PromptEditComponent(): React.JSX.Element {
  return <div>Hello &quot;/folders/$folderSlug/$promptSlug/edit&quot;!</div>
}
