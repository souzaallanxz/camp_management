import {
  IconLayoutDashboard,
  IconSettings,
  IconTool,
  IconPalette,
  IconNotification,
  IconBrowserCheck,
  IconHelp,
  IconUserCog,
  IconFileDescription,
  IconTent,
  IconCampfire,
  IconIceCream,
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
      name: 'Palavra da Vida',
      logo: Command,
      plan: 'Standard Plan',
    },
  ],
  navGroups: [
    {
      title: 'General',
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
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: IconSettings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: IconUserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: IconTool,
            },
            {
              title: 'Appearance',
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
    {
      title: 'Acampamentos',
      url: '/camps',
      icon: IconCampfire,
    },
  ]

  if (permissions.snackBar.access) {
    generalItems.push({
      title: 'Snack Bar',
      url: '/snack-bar',
      icon: IconIceCream,
    })
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
        title: 'General',
        items: generalItems,
      },
      {
        title: 'Other',
        items: [
          {
            title: 'Settings',
            icon: IconSettings,
            items: [
              {
                title: 'Profile',
                url: '/settings',
                icon: IconUserCog,
              },
              {
                title: 'Account',
                url: '/settings/account',
                icon: IconTool,
              },
              {
                title: 'Appearance',
                url: '/settings/appearance',
                icon: IconPalette,
              },
              {
                title: 'Notifications',
                url: '/settings/notifications',
                icon: IconNotification,
              },
              {
                title: 'Display',
                url: '/settings/display',
                icon: IconBrowserCheck,
              },
            ],
          },
        ],
      },
    ],
  }
}
