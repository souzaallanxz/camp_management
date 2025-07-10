import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { type Staff } from './data/schema'
import { StaffTable } from './components/staff-table'
import { StaffDialogs } from './components/staff-dialogs'
import { StaffDialogsProvider, useStaffDialogs } from './context/staff-dialogs-context'
import { StaffDetails } from './components/staff-details'
import { useState } from 'react'
import { StaffSnackbarBalanceDialog } from './components/staff-snackbar-balance-dialog'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'
import { type StaffWithActions } from './components/staff-table'
import { staffService } from './services/staff-service'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'


function StaffContent() {
  const permissions = useTeamPermissions()
  
  // Query simplificada para buscar staff e seus saldos
  const { data: staff = [], refetch } = useQuery({
    queryKey: ['staff-with-balance'],
    queryFn: async () => {
      try {
        return await staffService.findAll();
      } catch {
        // Em caso de erro, retornar array vazio
        return [];
      }
    },
  });

  const { openCreateDialog, selectedStaffId, openEditDialog, closeEditDialog } = useStaffDialogs()
  const [showSnackbarBalanceDialog, setShowSnackbarBalanceDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedStaffForBalance, setSelectedStaffForBalance] = useState<string | null>(null)

  const handleLoadCard = (staff: Staff) => {
    setSelectedStaffForBalance(staff.id)
    setShowSnackbarBalanceDialog(true)
  }

  // Adicionar as funções de ação para cada membro do staff
  const staffWithActions: StaffWithActions[] = (Array.isArray(staff) ? staff : []).map(staffMember => ({
    ...staffMember,
    onEdit: () => openEditDialog(staffMember.id),
    onLoadCard: () => handleLoadCard(staffMember),
    onUpgradeClick: () => setShowUpgradeDialog(true),
    total_balance: staffMember.total_balance || 0
  }));

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
            <h2 className='text-2xl font-bold tracking-tight'>Staff</h2>
            <p className='text-muted-foreground'>
              Gere todos os membros do staff registrados na plataforma.
            </p>
          </div>
          <Button 
            onClick={openCreateDialog}
            disabled={!permissions.staff?.create}
          >
            <IconPlus className='mr-2 h-4 w-4' />
            Novo Membro do Staff
          </Button>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          <StaffTable data={staffWithActions} />
        </div>
      </Main>

      <StaffDialogs onStaffCreated={refetch} />
      <StaffDetails
        staffId={selectedStaffId}
        onOpenChange={(open) => !open && closeEditDialog()}
        onSuccess={refetch}
      />
      <StaffSnackbarBalanceDialog
        open={showSnackbarBalanceDialog}
        onOpenChange={setShowSnackbarBalanceDialog}
        staffId={selectedStaffForBalance || ''}
        onSuccess={refetch}
      />
      <TierUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </>
  )
}

export default function StaffPage() {
  const permissions = useTeamPermissions()
  
  // Se ainda está carregando as permissões ou não tem acesso, não mostrar o conteúdo
  if (permissions.isLoading || !permissions.staff?.viewList) return null
  
  return (
    <StaffDialogsProvider>
      <StaffContent />
    </StaffDialogsProvider>
  )
} 