import ContentSection from '../components/content-section'
import { ProfileForm } from './profile-form'

export default function SettingsProfile() {
  return (
    <ContentSection
      title='Perfil'
      desc='Esta informação é usada para identificar o seu perfil na plataforma.'
    >
      <ProfileForm />
    </ContentSection>
  )
}
