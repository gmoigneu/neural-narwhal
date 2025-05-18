import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About
})

function About(): React.JSX.Element {
  return <div className="p-2">Hello from About!</div>
}
