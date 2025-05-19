import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

import './global.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { VaultSetupDialog } from './components/VaultSetupDialog'
// import { Toaster } from '@renderer/components/ui/toaster' // User will add this later

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
      <VaultSetupDialog />
      {/* <Toaster /> */}
      {/* User will add this later */}
    </React.StrictMode>
  )
}
