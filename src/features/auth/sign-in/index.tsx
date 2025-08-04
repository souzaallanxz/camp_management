import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import CampImage from '@/assets/camp.jpg'
import Logo from '@/assets/logo.png'
import { UserAuthForm } from './components/user-auth-form'
import { useAuth } from '../auth-context'
import { useTranslation } from '@/i18n'


export default function SignIn() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className='container relative grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='relative hidden h-full flex-col bg-muted text-white dark:border-r lg:flex overflow-hidden'>
        <div className='absolute inset-0 bg-zinc-900/70 z-10' />
        <img
          src={CampImage}
          className='absolute inset-0 w-full h-full object-cover'
          alt='Campfire by the lake'
        />

        <div className='relative z-20 pt-6 px-10'>
          <div className='flex items-center'>
            <img
              src={Logo}
              alt="Campy Logo"
              className='h-40 w-auto'
            />
          </div>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          <div className='flex flex-col space-y-2 text-left'>
            <h1 className='text-2xl font-semibold tracking-tight'>{t('auth.signIn')}</h1>
            <p className='text-sm text-muted-foreground'>
              {t('auth.loginToAccount')}
            </p>
          </div>
          <UserAuthForm />
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('auth.termsAgreement')}{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('common.terms')}
            </a>{' '}
            {t('common.and')}{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('common.privacy')}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
