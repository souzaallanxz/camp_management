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
import { LiquidateSnackbarDialog } from './components/liquidate-snackbar-dialog'
import { toast } from 'sonner'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'
import { type CamperWithActions } from './components/campers-table'
import { camperService } from './services/camper-service'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

function CampersContent() {
  // Query simplificada para buscar campers e seus saldos
  const { data: campers = [], refetch } = useQuery({
    queryKey: ['campers-with-balance'],
    queryFn: async () => {
      try {
        return await camperService.findAllWithSnackbarData();
      } catch {
        // Em caso de erro, retornar array vazio
        return [];
      }
    },
  });

  const { openCreateDialog, selectedCamperId, openEditDialog, closeEditDialog } = useCamperDialogs()
  const [showSnackbarBalanceDialog, setShowSnackbarBalanceDialog] = useState(false)
  const [showLiquidateDialog, setShowLiquidateDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedCamperForBalance, setSelectedCamperForBalance] = useState<string | null>(null)
  const [selectedCamperForLiquidate, setSelectedCamperForLiquidate] = useState<{ id: string; name: string; balance: number } | null>(null)

  const handleLoadCard = (camper: Camper) => {
    if (!camper.registration_id) {
      toast.error('Este campista não tem uma inscrição associada')
      return
    }
    setSelectedCamperForBalance(camper.registration_id)
    setShowSnackbarBalanceDialog(true)
  }

  const handleLiquidateSnackbar = (camper: Camper) => {
    const balance = Number(camper.snack_bar_balance) || 0
    if (balance <= 0) {
      toast.error('Este campista não tem saldo disponível para liquidar')
      return
    }
    
    setSelectedCamperForLiquidate({
      id: camper.id,
      name: camper.name,
      balance: balance
    })
    setShowLiquidateDialog(true)
  }

  // Adicionar as funções de ação para cada campista
  const campersWithActions: CamperWithActions[] = (Array.isArray(campers) ? campers : []).map(camper => ({
    ...camper,
    onEdit: () => openEditDialog(camper.id),
    onLoadCard: () => handleLoadCard(camper),
    onUpgradeClick: () => setShowUpgradeDialog(true),
    onLiquidateSnackbar: () => handleLiquidateSnackbar(camper),
    total_balance: 0,
    totalLoaded: camper.totalLoaded || 0,
    totalSpent: camper.totalSpent || 0
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
      <LiquidateSnackbarDialog
        open={showLiquidateDialog}
        onOpenChange={setShowLiquidateDialog}
        camperId={selectedCamperForLiquidate?.id || ''}
        camperName={selectedCamperForLiquidate?.name || ''}
        currentBalance={selectedCamperForLiquidate?.balance || 0}
        onSuccess={refetch}
      />
    </>
  )
}

export default function CampersPage() {
  const permissions = useTeamPermissions()
  const navigate = useNavigate()
  
  useEffect(() => {
    // Só verificar permissões após carregamento completo
    if (!permissions.isLoading && !permissions.campers.viewList) {
      navigate({ to: '/' })
    }
  }, [permissions, navigate])
  
  // Se ainda está carregando as permissões ou não tem acesso, não mostrar o conteúdo
  if (permissions.isLoading || !permissions.campers.viewList) return null
  
  return (
    <CamperDialogsProvider>
      <CampersContent />
    </CamperDialogsProvider>
  )
} 