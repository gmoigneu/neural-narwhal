'use client'

import React, { useEffect, useState } from 'react'
import { Folder as FolderIcon, MoreHorizontal, Pencil, Trash2, type LucideIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@renderer/components/ui/sidebar'
import type { IndexedFolder, Window } from '@main/index'
import { Link } from '@tanstack/react-router'

export function NavFolders(): React.JSX.Element {
  const { isMobile } = useSidebar()
  const [folders, setFolders] = useState<IndexedFolder[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAndSetFolders = async (): Promise<void> => {
      try {
        setError(null)
        console.log('nav-folders: Fetching indexed folders...')
        const fetchedFolders = await (window as Window).api.getIndexedFolders()
        console.log('nav-folders: Fetched indexed folders:', fetchedFolders)
        if (fetchedFolders) {
          setFolders(fetchedFolders)
        } else {
          setFolders([]) // Ensure it's an empty array if null/undefined is fetched
        }
      } catch (err) {
        console.error('nav-folders: Error fetching initial folders:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        setFolders([])
      }
    }

    fetchAndSetFolders()

    const cleanupVaultIndexed = (window as Window).api.onVaultIndexed((updatedFolders) => {
      console.log('nav-folders: Vault re-indexed, updating folders:', updatedFolders)
      setError(null)
      if (updatedFolders) {
        setFolders(updatedFolders)
      } else {
        setFolders([])
      }
    })

    return () => {
      cleanupVaultIndexed()
    }
  }, [])

  if (error) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Prompts</SidebarGroupLabel>
        <div className="p-2 text-sm text-red-500">Error: {error}</div>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Prompts</SidebarGroupLabel>
      <SidebarMenu>
        {folders.length === 0 && !error && (
          <div className="p-2 text-sm text-muted-foreground">No folders found.</div>
        )}
        {folders.map((folder) => (
          <SidebarMenuItem key={folder.slug}>
            {/* Use path as key, assuming it is unique */}
            <SidebarMenuButton asChild>
              <Link to={`/folders/$folderSlug`} params={{ folderSlug: folder.slug }}>
                <FolderIcon className="h-4 w-4" /> {/* Ensure icon size */}
                <span>{folder.name}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal className="h-4 w-4" /> {/* Ensure icon size */}
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem>
                  <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Link to={`/folders/$folderSlug/edit`} params={{ folderSlug: folder.slug }}>
                    Edit Folder
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Delete Folder</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
