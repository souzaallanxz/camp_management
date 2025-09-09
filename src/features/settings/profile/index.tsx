import ContentSection from '../components/content-section'
import { ProfileForm } from './profile-form'
import { useTranslation } from '@/i18n'

export default function SettingsProfile() {
  const { t } = useTranslation()
  
  return (
    <ContentSection
      title={t('profile.title')}
      desc={t('profile.personalInfo')}
    >
      <ProfileForm />
    </ContentSection>
  )
}
