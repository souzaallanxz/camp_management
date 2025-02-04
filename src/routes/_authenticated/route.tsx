import Cookies from 'js-cookie'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import SkipToMain from '@/components/skip-to-main'
import { supabase } from '@/lib/supabase'
import { TeamProvider } from '@/features/teams/context/team-context'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: window.location.pathname,
        },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const defaultOpen = Cookies.get('sidebar:state') !== 'false'
  return (
    <TeamProvider>
      <SearchProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <div
            id="content"
            className={cn(
              'max-w-full w-full ml-auto',
              'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
              'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
              'transition-[width] ease-linear duration-200',
              'h-svh flex flex-col',
              'group-data-[scroll-locked=1]/body:h-full',
              'group-data-[scroll-locked=1]/body:has-[main.fixed-main]:h-svh',
            )}
          >
            <Outlet />
          </div>
        </SidebarProvider>
      </SearchProvider>
    </TeamProvider>
  )
}
