import { HTMLAttributes, useState, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { emailService } from '@/services/email.service'
import { forgotPassword } from '@/features/auth/auth-service'
import { useTranslation } from '@/i18n'

type ForgotFormProps = HTMLAttributes<HTMLDivElement>

export function ForgotForm({ className, ...props }: ForgotFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const formSchema = useMemo(() => z.object({
    email: z
      .string()
      .min(1, { message: t('validation.required') })
      .email({ message: t('validation.email') }),
  }), [t])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    
    try {
      setRecoveryEmail(data.email)
      await forgotPassword(data.email)
      toast.success(t('auth.passwordResetSent'))
      setEmailSent(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('errors.general')
      setError(errorMessage)
      toast.error(t('auth.passwordResetError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium">{t('auth.emailSent')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('auth.recoveryInstructionsSent')}
            <br />
            <span className="font-medium">{recoveryEmail}</span>
          </p>
        </div>
        
        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertTitle>{t('auth.checkInbox')}</AlertTitle>
          <AlertDescription className="text-blue-700">
            {t('auth.checkSpamFolder')}
          </AlertDescription>
        </Alert>

        {emailService.isInDemoMode && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>{t('auth.demoMode')}</AlertTitle>
            <AlertDescription className="text-amber-700">
              {t('auth.demoModeDescription')}
              <br />
              <span className="text-xs">{t('auth.demoModeConsole')}</span>
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            form.reset()
            setEmailSent(false)
          }}
        >
          {t('auth.backToForm')}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)} {...props}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.email')}</FormLabel>
                <FormControl>
                  <Input placeholder='nome@exemplo.com' type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className='w-full' disabled={isLoading}>
            {isLoading ? t('auth.sending') : t('auth.sendRecoveryLink')}
          </Button>
        </form>
      </Form>
      
      {emailService.isInDemoMode && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">{t('auth.demoMode')}</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            {t('auth.demoModeEmailDescription')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
