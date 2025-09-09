import ContentSection from '../components/content-section'
import { IntegrationsForm } from './integrations-form'

export default function SettingsIntegrations() {
  return (
    <ContentSection
      title='Integrações'
      desc='Configure as suas integrações externas e chaves de API.'
    >
      <IntegrationsForm />
    </ContentSection>
  )
} 