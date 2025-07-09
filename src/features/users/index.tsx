import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { columns } from './components/users-columns'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersTable } from './components/users-table'
import UsersProvider from './context/users-context'
import { getUsers } from './services/user-service'

function UsersContent() {
  const { data: users = [], refetch, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
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
              Gere os utilizadores e as suas permissões na plataforma.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          {isLoading ? (
            <div className="text-center p-4">Carregando utilizadores...</div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">Erro ao carregar utilizadores: {error instanceof Error ? error.message : 'Erro desconhecido'}</div>
          ) : (
            <UsersTable data={users} columns={columns} />
          )}
        </div>
      </Main>

      <UsersDialogs onUserUpdated={handleRefetch} />
    </>
  )
}

export default function UsersPage() {
  const permissions = useTeamPermissions()
  const navigate = useNavigate()
  useEffect(() => {
    if (!(permissions && (permissions.dashboard && permissions.dashboard.viewOverview))) {
      navigate({ to: '/' })
    }
  }, [permissions, navigate])
  if (!(permissions && (permissions.dashboard && permissions.dashboard.viewOverview))) return null

  return (
    <UsersProvider>
      <UsersContent />
    </UsersProvider>
  )
}
