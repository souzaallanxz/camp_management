import { HTMLAttributes, useState } from 'react'
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
import { tokenService } from '@/services/token.service'

type ForgotFormProps = HTMLAttributes<HTMLDivElement>

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Por favor, digite seu e-mail' })
    .email({ message: 'E-mail inválido' }),
})

export function ForgotForm({ className, ...props }: ForgotFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    
    try {
      setRecoveryEmail(data.email)
      
      // Gera um token válido para este email usando o serviço de token
      const token = tokenService.generateToken(data.email)
      
      // URL para redefinição de senha com query parameters codificados
      const resetLink = `${window.location.origin}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(data.email)}`
      
      // Para depuração, mostra o token no console em ambiente de desenvolvimento
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('Token gerado:', token);
        // eslint-disable-next-line no-console
        console.log('Link de recuperação:', resetLink);
      }

      // Envia o email usando a API Resend
      const result = await emailService.sendPasswordRecoveryEmail(data.email, resetLink)
      
      if (result.success) {
        toast.success('Email de recuperação enviado com sucesso!')
        setEmailSent(true)
      } else {
        setError(result.error?.message || 'Falha ao enviar email de recuperação')
        toast.error('Erro ao enviar email. Tente novamente.')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao processar sua solicitação')
      // eslint-disable-next-line no-console
      console.error('Erro no processamento de recuperação de senha:', error)
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
          <h3 className="text-lg font-medium">Email enviado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enviamos instruções de recuperação para
            <br />
            <span className="font-medium">{recoveryEmail}</span>
          </p>
        </div>
        
        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertTitle>Verifique sua caixa de entrada</AlertTitle>
          <AlertDescription className="text-blue-700">
            Verifique também sua pasta de spam caso não encontre o email em alguns minutos.
          </AlertDescription>
        </Alert>

        {emailService.isInDemoMode && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Modo de demonstração</AlertTitle>
            <AlertDescription className="text-amber-700">
              O link de recuperação foi exibido no console do navegador.
              <br />
              <span className="text-xs">Pressione F12 &gt; Console para visualizar</span>
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
          Voltar para o formulário
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='nome@exemplo.com' type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className='w-full' disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
      </Form>
      
      {emailService.isInDemoMode && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Modo de demonstração</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            Neste ambiente, o envio de emails é simulado. O link de recuperação será 
            exibido no console do navegador para testes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
