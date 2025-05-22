import {
  createRootRoute,
  Outlet,
  useRouter,
  Link,
  type AnyRouteMatch,
  useMatches
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import React, { type JSX } from 'react'

import { AppSidebar } from '@renderer/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@renderer/components/ui/breadcrumb'
import { Separator } from '@renderer/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@renderer/components/ui/sidebar'

interface RouteHandle {
  breadcrumb?: (match: AnyRouteMatch) => React.ReactNode
}

function RootComponent(): JSX.Element {
  const originalMatches = useMatches()
  const router = useRouter()
  const currentLocationPath = router.state.location.pathname
  console.log('currentLocationPath', currentLocationPath)
  const generateDefaultBreadcrumb = (pathname: string): string => {
    if (pathname === '/') return 'Home'
    const segments = pathname.split('/').filter(Boolean)
    const lastSegment = segments.pop() || 'Page'
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ')
  }

  // If on the root path, only show the most specific match for breadcrumbs
  const displayMatches =
    currentLocationPath === '/' && originalMatches.length > 0
      ? [originalMatches[originalMatches.length - 1]!]
      : originalMatches

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {displayMatches.map((match, index) => {
                    const { pathname, routeId } = match
                    let breadcrumbContent: React.ReactNode

                    const routeDefinition = router.routesById[routeId]

                    if (
                      routeDefinition &&
                      routeDefinition.options &&
                      typeof routeDefinition.options === 'object' &&
                      'handle' in routeDefinition.options
                    ) {
                      const handle = routeDefinition.options.handle as RouteHandle | undefined
                      if (handle?.breadcrumb) {
                        breadcrumbContent =
                          typeof handle.breadcrumb === 'function'
                            ? handle.breadcrumb(match)
                            : handle.breadcrumb
                      } else {
                        breadcrumbContent = generateDefaultBreadcrumb(pathname)
                      }
                    } else {
                      breadcrumbContent = generateDefaultBreadcrumb(pathname)
                    }

                    const isLast = index === displayMatches.length - 1

                    return (
                      <React.Fragment key={routeId}>
                        <BreadcrumbItem
                          className={
                            currentLocationPath !== '/' && index === 0 && displayMatches.length > 1
                              ? 'hidden md:block'
                              : ''
                          }
                        >
                          {isLast ? (
                            <BreadcrumbPage>{breadcrumbContent}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link
                                to={pathname}
                                params={match.params}
                                search={match.search}
                                preload="intent"
                              >
                                {breadcrumbContent}
                              </Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLast && (
                          <BreadcrumbSeparator
                            className={
                              currentLocationPath !== '/' &&
                              index === 0 &&
                              displayMatches.length > 1
                                ? 'hidden md:block'
                                : ''
                            }
                          />
                        )}
                      </React.Fragment>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent
})
