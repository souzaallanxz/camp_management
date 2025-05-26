import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { WebhookIntegrationCard } from './components/webhook-integration-card'

function IntegrationsContent() {
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
            <h2 className='text-2xl font-bold tracking-tight'>Integrações</h2>
            <p className='text-muted-foreground'>
              Gerencie todas as integrações disponíveis no sistema.
            </p>
          </div>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            <WebhookIntegrationCard />
          </div>
        </div>
      </Main>
    </>
  )
}

export function IntegrationsFeature() {
  return <IntegrationsContent />
} 