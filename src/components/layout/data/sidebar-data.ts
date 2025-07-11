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
        {
          title: 'Integrações',
          url: '/integrations',
          icon: IconWebhook,
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

// Hook version with user info
export function useSidebarData(): SidebarData & { isLoading: boolean } {
  const user = useUser()
  const { teams: dbTeams, isLoading: teamsLoading } = useTeamData()
  const permissions = useTeamPermissions()

  // Se ainda está carregando informações do usuário ou permissões, não mostrar itens
  const isLoading = user.isLoading || permissions.isLoading || teamsLoading

  const teams = dbTeams.map(team => ({
    name: team.name,
    logo: Command,
    plan: team.tier === 'premium' ? 'Premium' : 'Free',
  }))

  const generalItems: NavItem[] = [];

  // Se ainda está carregando, não mostrar nenhum item
  if (isLoading) {
    // Não adicionar itens enquanto carrega
  } else {
    // Se for cashier, só mostra Dashboard e Snack Bar
    if (user?.role === 'cashier') {
      generalItems.push({
        title: 'Dashboard',
        url: '/',
        icon: IconLayoutDashboard,
      })
      if (permissions.snackBar.access) {
        generalItems.push({
          title: 'Snack Bar',
          url: '/snack-bar',
          icon: IconIceCream,
        })
      }
    } else {
      generalItems.push({
        title: 'Dashboard',
        url: '/',
        icon: IconLayoutDashboard,
      })
      generalItems.push({
        title: 'Inscrições',
        url: '/registrations',
        icon: IconFileDescription,
      })
      generalItems.push({
        title: 'Campistas',
        url: '/campers',
        icon: IconTent,
      })
      if (permissions.staff?.viewList) {
        generalItems.push({
          title: 'Staff',
          url: '/staff',
          icon: IconUsersGroup,
        })
      }
      // Only show Users menu item for superadmin and admin roles
      if (user?.role === 'superadmin' || user?.role === 'admin') {
        generalItems.push({
          title: 'Utilizadores',
          url: '/users',
          icon: IconUsers,
        })
      }
      generalItems.push({
        title: 'Acampamentos',
        url: '/camps',
        icon: IconCampfire,
      })
      if (permissions.snackBar.access) {
        generalItems.push({
          title: 'Snack Bar',
          url: '/snack-bar',
          icon: IconIceCream,
        })
      }
      generalItems.push({
        title: 'Integrações',
        url: '/integrations',
        icon: IconWebhook,
      })
    }
  }

  return {
    user: {
      name: user?.user?.name ?? user?.email ?? 'User',
      email: user?.email ?? '',
      avatar: '/avatars/shadcn.jpg',
    },
    teams,
    isLoading,
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
  }
}
