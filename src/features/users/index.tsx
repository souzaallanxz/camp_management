import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useUser } from '@/features/auth/hooks/use-user'
import { columns } from './components/users-columns'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersTable } from './components/users-table'
import UsersProvider from './context/users-context'
import { getUsers } from './services/user-service'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ReloadIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'

function UsersContent() {
  // Use a stable timestamp for the initial query
  const [timestamp] = useState(() => Date.now())
  
  const { data: users = [], refetch, isLoading, isError } = useQuery({
    queryKey: ['users', timestamp],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 2000
  });

  const handleRefetch = () => {
    refetch();
  };

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
            <h2 className='text-2xl font-bold tracking-tight'>Lista de Usuários</h2>
            <p className='text-muted-foreground'>
              Gerencie os usuários e seus papéis na plataforma.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <div>Não foi possível carregar a lista de usuários. Tente novamente mais tarde.</div>
              <Button variant="outline" size="sm" className="w-fit" onClick={handleRefetch}>
                <ReloadIcon className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="flex flex-col items-center gap-2">
                <ReloadIcon className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Carregando usuários...</p>
              </div>
            </div>
          ) : (
            <UsersTable data={users} columns={columns} />
          )}
        </div>
      </Main>

      <UsersDialogs onUserUpdated={handleRefetch} />
    </>
  )
}

export default function Users() {
  const { role } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (role !== 'superadmin' && role !== 'admin') {
      navigate({ to: '/' })
    }
  }, [role, navigate])

  if (role !== 'superadmin' && role !== 'admin') {
    return null
  }

  return (
    <UsersProvider>
      <UsersContent />
    </UsersProvider>
  )
}
