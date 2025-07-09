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
import { useUser } from '@/features/auth/hooks/use-user'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sidebarData = useSidebarData()
  const { isLoading: userLoading, user } = useUser()
  const permissions = useTeamPermissions()

  if (userLoading || !user || !permissions) return null // ou um loading

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
