import ContentSection from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export default function SettingsAppearance() {
  return (
    <ContentSection
      title='Aparência'
      desc='Personalize a aparência da aplicação. O tema escolhido será mantido mesmo após sair da aplicação.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
