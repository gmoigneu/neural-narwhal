'use client'

import * as React from 'react'
import { Command, LifeBuoy, Send, Settings2, SquareTerminal, DollarSign } from 'lucide-react'

import { NavMain } from '@renderer/components/nav-main'
import { NavFolders } from '@renderer/components/nav-folders'
import { NavSecondary } from '@renderer/components/nav-secondary'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@renderer/components/ui/sidebar'
import { NavSearch } from './nav-search'
import { Link } from '@tanstack/react-router'

const data = {
  navMain: [
    {
      title: 'Partials',
      url: '#',
      icon: SquareTerminal,
      isActive: true
    },
    {
      title: 'Variables',
      url: '#',
      icon: DollarSign,
      isActive: true
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2
    }
  ],
  navSecondary: [
    {
      title: 'Support',
      url: '#',
      icon: LifeBuoy
    },
    {
      title: 'Feedback',
      url: '#',
      icon: Send
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>): React.JSX.Element {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <Link to="/" className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Neural Narwhal</span>
                  <span className="truncate text-xs">Prompt management</span>
                </Link>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavSearch />
        <NavFolders />
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <p>SidebarFooter</p>
      </SidebarFooter>
    </Sidebar>
  )
}
