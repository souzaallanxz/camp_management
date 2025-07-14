import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { useSidebarData } from './data/sidebar-data'
import { Skeleton } from '@/components/ui/skeleton'

function SidebarSkeleton() {
  return (
    <Sidebar collapsible='icon' variant='floating'>
      <SidebarHeader>
        <Skeleton className='h-10 w-40 mb-4' />
      </SidebarHeader>
      <SidebarContent>
        <div className='space-y-4'>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className='h-8 w-32' />
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <Skeleton className='h-10 w-32' />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sidebarData = useSidebarData()

  // Bloquear renderização enquanto carrega permissões/usuário/time
  if (sidebarData.isLoading) {
    return <SidebarSkeleton />
  }

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher isLoading={sidebarData.isLoading} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
