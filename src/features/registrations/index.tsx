import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { registrationService } from './services/registration-service'
import { RegistrationsTable } from './components/registrations-table'
import { RegistrationDialogs } from './components/registration-dialogs'
import { useRegistrationDialogs } from './context/registration-dialogs-context'
import { columns, type RegistrationWithActions } from './components/registrations-columns'
import { RegistrationDialogsProvider } from './context/registration-dialogs-context'
import { Actions } from './components/registrations-columns'
import { Registration } from './data/schema'

// Interface para mapear a resposta da API
interface ApiRegistration {
  id: string;
  camp_id?: string;
  camp_name?: string;
  camper_name?: string;
  camper_email?: string;
  name?: string;
  email?: string;
  contact?: string;
  status?: string;
  onboarding_status?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  form_id?: string;
  total_paid?: number | string;
  camp_price?: number | string;
  [key: string]: unknown;
}

function RegistrationsContent() {
  const { data: registrationsData = [], refetch, isLoading, error } = useQuery({
    queryKey: ['registrations'],
    queryFn: async () => {
      const data = await registrationService.findAll() as unknown as ApiRegistration[];
      console.log('API Response:', data); // Log da resposta completa
      // Analisando o primeiro item para debug
      if (data.length > 0) {
        console.log('First registration:', {
          id: data[0].id,
          total_paid: data[0].total_paid,
          camp_price: data[0].camp_price,
          status: data[0].status
        });
      }
      // Adicionando propriedades necessárias para compatibilidade com o tipo Registration do schema
      return data.map(reg => {
        const totalPaid = Number(reg.total_paid || 0);
        const campPrice = Number(reg.camp_price || 0);
        console.log(`Registration ${reg.id}: total_paid=${totalPaid}, camp_price=${campPrice}, status=${reg.status}`);
        return {
          ...reg,
          camp: null,
          camper: null,
          total_paid: totalPaid,
          camp_price: campPrice
        };
      }) as Registration[];
    }
  })

  // Função personalizada para refetch
  const handleRefetch = () => {
    refetch();
  }

  const { openCreateDialog } = useRegistrationDialogs()

  const registrationsWithActions = registrationsData.map((registration) => ({
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