import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { getRegistrations } from './services/registration-service'
import { RegistrationsTable } from './components/registrations-table'
import { RegistrationDialogs } from './components/registration-dialogs'
import { useRegistrationDialogs } from './context/registration-dialogs-context'
import { type Registration } from './data/schema'
import { columns } from './components/registrations-columns'
import { RegistrationDialogsProvider } from './context/registration-dialogs-context'

function RegistrationsContent() {
  const { data: registrations = [], refetch } = useQuery({
    queryKey: ['registrations'],
    queryFn: getRegistrations,
  })

  const { openCreateDialog, openViewDialog, openOnboardDialog, openDeleteDialog } = useRegistrationDialogs()

  const registrationsWithActions = registrations.map((registration: Registration) => ({
    ...registration,
    onView: () => openViewDialog(registration),
    onDelete: () => openDeleteDialog(registration),
    onOnboard: () => {
      if (registration.onboarding_status === 'Onboarded') return
      openOnboardDialog(registration)
    },
    onRegistrationUpdated: () => refetch()
  }))

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2 flex-wrap'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Inscrições</h2>
            <p className='text-muted-foreground'>
              Gerencie todas as inscrições registradas no sistema.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <IconPlus className='mr-2 h-4 w-4' />
            Nova Inscrição
          </Button>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          <RegistrationsTable data={registrationsWithActions} columns={columns} />
        </div>
      </Main>

      <RegistrationDialogs
        onRegistrationDeleted={refetch}
        onRegistrationUpdated={refetch}
      />
    </>
  )
}

export function RegistrationsFeature() {
  return (
    <RegistrationDialogsProvider>
      <RegistrationsContent />
    </RegistrationDialogsProvider>
  )
} 