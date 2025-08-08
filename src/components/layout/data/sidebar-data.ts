import {
  IconLayoutDashboard,
  IconSettings,
  IconPalette,
  IconUserCog,
  IconFileDescription,
  IconTent,
  IconCampfire,
  IconIceCream,
  IconUsers,
  IconWebhook,
  IconBuildingCommunity,
  IconCreditCard,
  IconUsersGroup,
} from '@tabler/icons-react'
import { Command } from 'lucide-react'
import { type SidebarData, type NavItem } from '../types'
import { useUser } from '@/features/auth/hooks/use-user'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { useMemo } from 'react'

// Default sidebar data without user info
export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: '',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Equipa',
      logo: Command,
      plan: 'Standard Plan',
    },
  ],
  navGroups: [
    {
      title: 'Geral',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: IconLayoutDashboard,
        },
        {
          title: 'Inscrições',
          url: '/registrations',
          icon: IconFileDescription,
        },
        {
          title: 'Campistas',
          url: '/campers',
          icon: IconTent,
        },
        {
          title: 'Usuários',
          url: '/users',
          icon: IconUsers,
        },
        {
          title: 'Acampamentos',
          url: '/camps',
          icon: IconCampfire,
        },
        {
          title: 'Snack Bar',
          url: '/snack-bar',
          icon: IconIceCream,
        },

      ],
    },
    {
      title: 'Outros',
      items: [
        {
          title: 'Definições',
          icon: IconSettings,
          items: [
            {
              title: 'Perfil',
              url: '/settings',
              icon: IconUserCog,
            },
            {
              title: 'Organização',
              url: '/settings/organization',
              icon: IconBuildingCommunity,
            },
            {
              title: 'Faturação',
              url: '/settings/billing',
              icon: IconCreditCard,
            },
            {
              title: 'Aparência',
              url: '/settings/appearance',
              icon: IconPalette,
            },
          ],
        },
      ],
    },
  ],
}

// Hook version with user info - OPTIMIZED to prevent unnecessary API calls
export function useSidebarData(): SidebarData & { isLoading: boolean } {
  const user = useUser()
  const { teams: dbTeams, isLoading: teamsLoading } = useTeamData()
  const permissions = useTeamPermissions()

  // Se ainda está carregando informações do usuário ou permissões, não mostrar itens
  const isLoading = user.isLoading || permissions.isLoading || teamsLoading

  // Memoize teams to prevent unnecessary re-renders
  const teams = useMemo(() => {
    return dbTeams.map(team => ({
      name: team.name,
      logo: Command,
      plan: team.tier === 'premium' ? 'Premium' : 'Free',
    }))
  }, [dbTeams])

  // Memoize general items to prevent unnecessary re-computations
  const generalItems = useMemo((): NavItem[] => {
    // Se ainda está carregando, não mostrar nenhum item
    if (isLoading) {
      return []
    }

    const items: NavItem[] = []

    // Se for cashier, mostra Dashboard, Campistas, Staff e Snack Bar
    if (user?.role === 'cashier') {
      items.push({
        title: 'Dashboard',
        url: '/',
        icon: IconLayoutDashboard,
      })
      if (permissions.campers?.viewList) {
        items.push({
          title: 'Campistas',
          url: '/campers',
          icon: IconTent,
        })
      }
      if (permissions.staff?.viewList) {
        items.push({
          title: 'Staff',
          url: '/staff',
          icon: IconUsersGroup,
        })
      }
      if (permissions.snackBar.access) {
        items.push({
          title: 'Snack Bar',
          url: '/snack-bar',
          icon: IconIceCream,
        })
      }
    } else {
      items.push({
        title: 'Dashboard',
        url: '/',
        icon: IconLayoutDashboard,
      })
      items.push({
        title: 'Inscrições',
        url: '/registrations',
        icon: IconFileDescription,
      })
      items.push({
        title: 'Campistas',
        url: '/campers',
        icon: IconTent,
      })
      if (permissions.staff?.viewList) {
        items.push({
          title: 'Staff',
          url: '/staff',
          icon: IconUsersGroup,
        })
      }
      // Only show Users menu item for superadmin and admin roles
      if (user?.role === 'superadmin' || user?.role === 'admin') {
        items.push({
          title: 'Utilizadores',
          url: '/users',
          icon: IconUsers,
        })
      }
      items.push({
        title: 'Acampamentos',
        url: '/camps',
        icon: IconCampfire,
      })
      if (permissions.snackBar.access) {
        items.push({
          title: 'Snack Bar',
          url: '/snack-bar',
          icon: IconIceCream,
        })
      }

    }

    return items
  }, [isLoading, user?.role, permissions.snackBar.access, permissions.campers?.viewList, permissions.staff?.viewList])

  // Memoize the entire sidebar data to prevent unnecessary re-renders
  const sidebarDataValue = useMemo(() => ({
    user: {
      name: user?.user?.name ?? user?.email ?? 'User',
      email: user?.email ?? '',
      avatar: '/avatars/shadcn.jpg',
    },
    teams,
    navGroups: [
      {
        title: 'Geral',
        items: generalItems,
      },
      {
        title: 'Outros',
        items: [
          {
            title: 'Definições',
            icon: IconSettings,
            items: [
              {
                title: 'Perfil',
                url: '/settings',
                icon: IconUserCog,
              },
              {
                title: 'Organização',
                url: '/settings/organization',
                icon: IconBuildingCommunity,
              },
              {
                title: 'Faturação',
                url: '/settings/billing',
                icon: IconCreditCard,
              },
              {
                title: 'Aparência',
                url: '/settings/appearance',
                icon: IconPalette,
              }
            ],
          },
        ],
      },
    ],
  }), [user?.user?.name, user?.email, teams, generalItems])

  return {
    ...sidebarDataValue,
    isLoading,
  }
}
