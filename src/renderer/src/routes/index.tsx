import { Button } from '@renderer/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index
})

function Index(): React.JSX.Element {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <Button>Click me</Button>
    </div>
  )
}
