import { HTMLAttributes, useState, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { useAuth } from '../../auth-context'
import { toast } from '@/hooks/use-toast'
import { useCurrentTeam } from '@/features/teams/hooks/use-current-team'
import { useTranslation } from '@/i18n'

type UserAuthFormProps = HTMLAttributes<HTMLDivElement>

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const { t } = useTranslation()
  const { signIn, refetchUser } = useAuth()
  const { mutate: refetchTeam } = useCurrentTeam()
  const navigate = useNavigate()
  const search = useSearch({ from: '/(auth)/sign-in' })
  const [isLoading, setIsLoading] = useState(false)

  const formSchema = useMemo(() => z.object({
    email: z
      .string()
      .min(1, { message: t('validation.required') })
      .email({ message: t('validation.email') }),
    password: z
      .string()
      .min(1, {
        message: t('validation.required'),
      })
      .min(7, {
        message: t('auth.passwordTooShort'),
      }),
  }), [t])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      await signIn(data as { email: string; password: string })
      await refetchUser() // <-- Aguarda usuário atualizado
      await refetchTeam() // <-- Aguarda team atualizado
      navigate({ to: search.redirect ?? '/' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('auth.invalidCredentials'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid gap-2'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input placeholder='nome@exemplo.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <div className='flex items-center justify-between'>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <Link
                      to='/forgot-password'
                      className='text-sm font-medium text-muted-foreground hover:opacity-75'
                    >
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className='mt-2' disabled={isLoading}>
              {t('auth.signIn')}
            </Button>

            <div className='relative my-2'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-background px-2 text-muted-foreground'>
                  {t('auth.dontHaveAccount')}
                </span>
              </div>
            </div>

            <Button
              variant='outline'
              className='w-full'
              type='button'
              onClick={() => navigate({ to: '/sign-up' })}
            >
              {t('auth.createAccount')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
