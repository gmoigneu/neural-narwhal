import React from 'react'
import { Outlet } from '@tanstack/react-router'
import { NavFolders } from './components/nav-folders'

function App(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-60 border-r border-border bg-muted/40 p-4">
        <NavFolders />
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default App
