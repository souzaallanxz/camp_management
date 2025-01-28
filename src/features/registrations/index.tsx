import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { columns } from './components/registrations-columns'
import { RegistrationsTable } from './components/registrations-table'
import { RegistrationDetails } from './components/registration-details'
import { useRegistrations } from './hooks/use-registrations'
import { RegistrationDialogsProvider } from './context/registration-dialogs-context'
import { RegistrationDialogs } from './components/registration-dialogs'
import { Registration } from './data/schema'
import { useRegistrationDialogs } from './context/registration-dialogs-context'

function RegistrationsContent() {
  const { data: registrations, isLoading, refetch } = useRegistrations()
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null)
  const { openCreateDialog } = useRegistrationDialogs()

  const registrationsWithActions = registrations?.map((registration: Registration) => ({
    ...registration,
    onView: (id: string) => setSelectedRegistrationId(id)
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
            <h2 className='text-2xl font-bold tracking-tight'>Registrations</h2>
            <p className='text-muted-foreground'>
              Manage your camp registrations and payments here.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <IconPlus className='mr-2 h-4 w-4' />
            New Registration
          </Button>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          <RegistrationsTable
            data={registrationsWithActions || []}
            columns={columns}
          />
        </div>
      </Main>

      <RegistrationDetails
        registrationId={selectedRegistrationId}
        onOpenChange={(open) => !open && setSelectedRegistrationId(null)}
      />

      <RegistrationDialogs
        onRegistrationCreated={refetch}
        onRegistrationDeleted={refetch}
      />
    </>
  )
}

export default function Registrations() {
  return (
    <RegistrationDialogsProvider>
      <RegistrationsContent />
    </RegistrationDialogsProvider>
  )
} 