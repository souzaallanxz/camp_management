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
import { columns, type RegistrationWithActions } from './components/registrations-columns'
import { RegistrationDialogsProvider } from './context/registration-dialogs-context'
import { Actions } from './components/registrations-columns'

function RegistrationsContent() {
  const { data: registrations = [], refetch, isLoading, error } = useQuery({
    queryKey: ['registrations'],
    queryFn: getRegistrations,
  })

  // Função personalizada para refetch
  const handleRefetch = () => {
    refetch();
  }

  const { openCreateDialog } = useRegistrationDialogs()

  const registrationsWithActions = registrations.map((registration) => ({
    ...registration,
    actions: <Actions registration={registration} onRegistrationUpdated={handleRefetch} />,
    onRegistrationUpdated: handleRefetch
  })) as unknown as RegistrationWithActions[]

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
          <div>
            <Button onClick={openCreateDialog}>
              <IconPlus className='mr-2 h-4 w-4' />
              Nova Inscrição
            </Button>
          </div>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          {isLoading ? (
            <div className="text-center p-4">A carregar inscrições...</div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">Erro ao carregar inscrições: {error.message}</div>
          ) : (
            <RegistrationsTable data={registrationsWithActions} columns={columns} />
          )}
        </div>
      </Main>

      <RegistrationDialogs
        onRegistrationDeleted={handleRefetch}
        onRegistrationUpdated={handleRefetch}
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