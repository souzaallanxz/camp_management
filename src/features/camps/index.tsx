import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { DataTable } from '@/components/ui/data-table'
import { columns } from './components/columns'
import { useCamps } from './hooks/use-camps'
import { CampDialogsProvider } from './context/camp-dialogs-context'
import { CampDialogs } from './components/camp-dialogs'
import { useCampDialogs } from './context/camp-dialogs-context'

function CampsContent() {
  const { data: camps, isLoading } = useCamps()
  const { onOpenEdit } = useCampDialogs()

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-2 flex items-center justify-between space-y-2 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Acampamentos</h2>
            <p className="text-muted-foreground">
              Gerencie os acampamentos do sistema
            </p>
          </div>
          <Button onClick={() => onOpenEdit(null)}>
            <IconPlus className="mr-2 h-4 w-4" />
            Novo Acampamento
          </Button>
        </div>

        <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
          <DataTable
            columns={columns}
            data={camps ?? []}
            isLoading={isLoading}
            searchField="name"
          />
        </div>
      </Main>

      <CampDialogs />
    </>
  )
}

export default function CampsPage() {
  return (
    <CampDialogsProvider>
      <CampsContent />
    </CampDialogsProvider>
  )
} 