import { Search } from 'lucide-react'

import { Label } from '@renderer/components/ui/label'
import { SidebarGroup, SidebarGroupContent, SidebarInput } from '@renderer/components/ui/sidebar'

export function NavSearch({ ...props }: React.ComponentProps<'form'>): React.JSX.Element {
  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput id="search" placeholder="Search prompts..." className="pl-8" />
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50 ring-0 focus-visible:shadow-none!" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
