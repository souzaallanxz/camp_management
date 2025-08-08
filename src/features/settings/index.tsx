import { Outlet } from '@tanstack/react-router'
import {
  IconBrowserCheck,
  IconNotification,
  IconPalette,
  IconUser,
  IconCreditCard,
  IconBuildingCommunity,
  IconPlug,
} from '@tabler/icons-react'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import SidebarNav from './components/sidebar-nav'
import { useUser } from '@/features/auth/hooks/use-user'

export default function Settings() {
  const { role } = useUser()

  const sidebarNavItems = [
    {
      title: 'Perfil',
      icon: <IconUser size={18} />,
      href: '/settings',
    },
    ...(role === 'superadmin' || role === 'admin'
      ? [
          {
            title: 'Organização',
            icon: <IconBuildingCommunity size={18} />,
            href: '/settings/organization',
          },
          {
            title: 'Faturação',
            icon: <IconCreditCard size={18} />,
            href: '/settings/billing',
          },
          {
            title: 'Integrações',
            icon: <IconPlug size={18} />,
            href: '/settings/integrations',
          },
        ]
      : []),
    {
      title: 'Aparência',
      icon: <IconPalette size={18} />,
      href: '/settings/appearance',
    },
    {
      title: 'Notificações',
      icon: <IconNotification size={18} />,
      href: '/settings/notifications',
      disabled: true,
    },
    {
      title: 'Ecrãs',
      icon: <IconBrowserCheck size={18} />,
      href: '/settings/display',
      disabled: true,
    },
  ]

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Definições
          </h1>
          <p className='text-muted-foreground'>
            Gerir as suas definições e preferências.
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 md:space-y-2 overflow-hidden lg:flex-row lg:space-x-12 lg:space-y-0'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full p-1 pr-4 overflow-y-hidden'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
