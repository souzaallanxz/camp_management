import * as React from 'react'
import { ChevronsUpDown, Plus, Building2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Team } from '@/features/teams/types'

export function TeamSwitcher({ isLoading = false }: { isLoading?: boolean }) {
  const { isMobile } = useSidebar()
  const { teams } = useTeamData()
  const currentTeam = teams[0]

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center space-x-4 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-3 w-[70px]" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!currentTeam) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-background text-foreground'>
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={currentTeam.logo_url || undefined} 
                    alt={currentTeam.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-background">
                    <Building2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {currentTeam.name}
                </span>
                <span className='truncate text-xs'>Free</span>
              </div>
              <ChevronsUpDown className='ml-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <Avatar className="h-6 w-6">
                    <AvatarImage 
                      src={team.logo_url || undefined} 
                      alt={team.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-background">
                      <Building2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className='gap-2 p-2'>
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
