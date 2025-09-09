import { HTMLAttributes, useState, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { toast } from '@/components/ui/use-toast'
import { useTranslation } from '@/i18n'

type SignUpFormProps = HTMLAttributes<HTMLDivElement>

export function SignUpForm({ className, ...props }: SignUpFormProps) {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const formSchema = useMemo(() => z
    .object({
      name: z
        .string()
        .min(1, { message: t('validation.required') }),
      email: z
        .string()
        .min(1, { message: t('validation.required') })
        .email({ message: t('validation.email') }),
      password: z
        .string()
        .min(1, { message: t('validation.required') })
        .min(7, { message: t('auth.passwordTooShort') }),
      confirmPassword: z.string().min(1, { message: t('validation.required') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    }), [t])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      await signUp({
        email: data.email,
        password: data.password,
        name: data.name,
      })
      navigate({ to: '/' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('auth.accountCreationError'),
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
              name='name'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>{t('auth.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder={t('auth.passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder={t('auth.confirmPasswordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className='mt-2' disabled={isLoading}>
              {t('auth.signUp')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
