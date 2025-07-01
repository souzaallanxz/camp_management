import {
  IconLayoutDashboard,
  IconSettings,
  IconTool,
  IconPalette,
  IconNotification,
  IconBrowserCheck,
  IconUserCog,
  IconFileDescription,
  IconTent,
  IconCampfire,
  IconIceCream,
  IconUsers,
  IconWebhook,
  IconBuildingCommunity,
  IconCreditCard,
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
  const { teams: dbTeams, isLoading } = useTeamData()
  const permissions = useTeamPermissions()

  const teams = dbTeams.map(team => ({
    name: team.name,
    logo: Command,
    plan: team.tier === 'premium' ? 'Premium' : 'Free',
  }))

  const generalItems: NavItem[] = [
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
  ]

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

  // Add Integrations to the menu
  generalItems.push({
    title: 'Integrações',
    url: '/integrations',
    icon: IconWebhook,
  })

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
                title: 'Conta',
                url: '/settings/account',
                icon: IconTool,
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
