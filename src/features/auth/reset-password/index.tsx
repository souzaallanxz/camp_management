import { Link } from '@tanstack/react-router'
import CampImage from '@/assets/camp.jpg'
import Logo from '@/assets/logo.png'
import { ResetPasswordForm } from './components/reset-password-form'

export default function ResetPassword() {
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
            <h1 className='text-2xl font-semibold tracking-tight'>
              Redefinir senha
            </h1>
            <p className='text-sm text-muted-foreground'>
              Digite sua nova senha abaixo
            </p>
          </div>
          <ResetPasswordForm />
          <p className='px-8 text-center text-sm text-muted-foreground'>
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 