import { Link, useNavigate } from '@tanstack/react-router'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/features/auth/auth-context'
import { toast } from '@/hooks/use-toast'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate({ to: '/sign-in' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out. Please try again.',
      })
    }
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    const name = user?.user_metadata?.name
    if (!name) return 'U'
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  }

  const userName = user?.user_metadata?.name || user?.email || 'User'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src='/avatars/01.png' alt={userName} />
                <AvatarFallback className='rounded-lg'>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{userName}</span>
                <span className='truncate text-xs'>{user?.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src='/avatars/01.png' alt={userName} />
                  <AvatarFallback className='rounded-lg'>{getInitials()}</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{userName}</span>
                  <span className='truncate text-xs'>{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to='/settings/'>
                  <BadgeCheck />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/settings/billing'>
                  <CreditCard />
                  Faturação
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
