import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/db'
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
import { getCurrentUser } from '@/features/auth/auth-service'

function CampersContent() {
  // Query simplificada para buscar campers e seus saldos
  const { data: campers = [], refetch } = useQuery({
    queryKey: ['campers-with-balance'],
    queryFn: async () => {
      try {
        // Get the current user's team ID
        const user = await getCurrentUser();
        
        if (!user || !user.team_id) {
          return [];
        }

        // Buscar campers com SQL, filtrando pelo team_id
        const result = await db.query(`
          SELECT 
            c.*,
            COALESCE(
              (SELECT SUM(sb.amount) 
               FROM snackbar_balance sb 
               WHERE sb.registration_id = c.registration_id
               GROUP BY sb.registration_id), 
              0
            ) as total_balance
          FROM campers c
          JOIN registrations r ON c.registration_id = r.id
          JOIN camps camp ON r.camp_id = camp.id
          WHERE camp.team_id = $1
          ORDER BY c.created_at DESC
        `, [user.team_id]);

        if (!result.data || !Array.isArray(result.data)) {
          return [];
        }

        // Converter para o formato esperado pela tabela
        return result.data.map(camper => ({
          id: camper.id,
          name: camper.name,
          email: camper.email,
          contact: camper.contact,
          registration_id: camper.registration_id,
          form_id: camper.form_id,
          camp: camper.camp,
          additional_notes: camper.additional_notes,
          created_at: camper.created_at,
          updated_at: camper.updated_at,
          id_number: camper.id_number,
          sns_number: camper.sns_number,
          date_of_birth: camper.date_of_birth,
          dietary_restrictions: camper.dietary_restrictions,
          guardian_name: camper.guardian_name,
          guardian_email: camper.guardian_email,
          guardian_phone: camper.guardian_phone,
          total_balance: Number(camper.total_balance) || 0
        }));
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
              Gerencie todos os campistas registrados no sistema.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
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