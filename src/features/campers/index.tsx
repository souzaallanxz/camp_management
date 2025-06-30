import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { type Camper } from './data/schema'
import { CampersTable } from './components/campers-table'
import { CamperDialogs } from './components/camper-dialogs'
import { CamperDialogsProvider, useCamperDialogs } from './context/camper-dialogs-context'
import { CamperDetails } from './components/camper-details'
import { useState } from 'react'
import { CamperSnackbarBalanceDialog } from './components/camper-snackbar-balance-dialog'
import { toast } from 'sonner'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'
import { type CamperWithActions } from './components/campers-table'
import { camperService } from './services/camper-service'

function CampersContent() {
  // Query simplificada para buscar campers e seus saldos
  const { data: campers = [], refetch } = useQuery({
    queryKey: ['campers-with-balance'],
    queryFn: async () => {
      try {
        return await camperService.findAll();
      } catch {
        // Em caso de erro, retornar array vazio
        return [];
      }
    },
  });

  const { openCreateDialog, selectedCamperId, openEditDialog, closeEditDialog } = useCamperDialogs()
  const [showSnackbarBalanceDialog, setShowSnackbarBalanceDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedCamperForBalance, setSelectedCamperForBalance] = useState<string | null>(null)

  const handleLoadCard = (camper: Camper) => {
    if (!camper.registration_id) {
      toast.error('Este campista não tem uma inscrição associada')
      return
    }
    setSelectedCamperForBalance(camper.registration_id)
    setShowSnackbarBalanceDialog(true)
  }

  // Adicionar as funções de ação para cada campista
  const campersWithActions: CamperWithActions[] = (Array.isArray(campers) ? campers : []).map(camper => ({
    ...camper,
    onEdit: () => openEditDialog(camper.id),
    onLoadCard: () => handleLoadCard(camper),
    onUpgradeClick: () => setShowUpgradeDialog(true),
    total_balance: camper.total_balance || 0
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
            <h2 className='text-2xl font-bold tracking-tight'>Campistas</h2>
            <p className='text-muted-foreground'>
              Gere todos os campistas registrados na plataforma.
            </p>
          </div>
          <Button 
            onClick={openCreateDialog} 
            disabled={true}
            title="Funcionalidade temporariamente indisponível"
          >
            <IconPlus className='mr-2 h-4 w-4' />
            Novo Campista
          </Button>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          <CampersTable data={campersWithActions} />
        </div>
      </Main>

      <CamperDialogs onCamperCreated={refetch} />
      <CamperDetails
        camperId={selectedCamperId}
        onOpenChange={(open) => !open && closeEditDialog()}
        onSuccess={refetch}
      />
      <CamperSnackbarBalanceDialog
        open={showSnackbarBalanceDialog}
        onOpenChange={setShowSnackbarBalanceDialog}
        camperId={selectedCamperForBalance || ''}
        onSuccess={refetch}
      />
      <TierUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </>
  )
}

export function CampersFeature() {
  return (
    <CamperDialogsProvider>
      <CampersContent />
    </CamperDialogsProvider>
  )
} 