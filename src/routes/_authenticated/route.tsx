import Cookies from 'js-cookie'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import SkipToMain from '@/components/skip-to-main'
import { TeamProvider } from '@/features/teams/context/team-context'
import { getCurrentUser } from '@/features/auth/auth-service'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    try {
      await getCurrentUser()
    } catch {
      throw redirect({
        to: '/sign-in',
      })
    }
  },
  component: RouteComponent,
})

function LayoutSkeleton() {
  return (
    <div className='flex h-screen w-screen bg-background'>
      <div className='w-64 min-w-[16rem] border-r p-4 flex flex-col'>
        <Skeleton className='h-10 w-40 mb-4' />
        <div className='flex-1 space-y-4'>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className='h-8 w-32' />
          ))}
        </div>
        <Skeleton className='h-10 w-32 mt-4' />
      </div>
      <div className='flex-1 flex flex-col p-8'>
        <Skeleton className='h-10 w-1/3 mb-6' />
        <div className='flex-1 space-y-4'>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className='h-24 w-full' />
          ))}
        </div>
      </div>
    </div>
  )
}

function RouteComponent() {
  const defaultOpen = Cookies.get('sidebar:state') !== 'false'
  return (
    <TeamProvider>
      <AuthenticatedLayout defaultOpen={defaultOpen} />
    </TeamProvider>
  )
}

function AuthenticatedLayout({ defaultOpen }: { defaultOpen: boolean }) {
  const permissions = useTeamPermissions();

  if (permissions.isLoading) {
    return <LayoutSkeleton />;
  }

  return (
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
  );
}
