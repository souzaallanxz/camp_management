import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle } from 'lucide-react'
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
import { useNavigate, useSearch } from '@tanstack/react-router'

type SetupPasswordFormProps = HTMLAttributes<HTMLDivElement>

const formSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'A senha deve ter pelo menos 8 caracteres' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

// For production, directly use the correct API URL
const API_BASE_URL = 'https://campmanagement.vercel.app/api';

export function SetupPasswordForm({ className, ...props }: SetupPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [passwordSet, setPasswordSet] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const search = useSearch({ from: '/(auth)/setup-password' })
  const { token } = search
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit({ password }: z.infer<typeof formSchema>) {
    if (!token) {
      setError('Token de convite não encontrado')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // Chama o backend para definir a senha usando o token
      const response = await fetch(`${API_BASE_URL}/users/setup-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao definir senha');
      }

      toast.success('Senha definida com sucesso!')
      setPasswordSet(true)
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        navigate({ to: '/sign-in' })
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao definir senha')
      // eslint-disable-next-line no-console
      console.error('Erro ao definir senha:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Link inválido</AlertTitle>
          <AlertDescription>
            O link de definição de senha é inválido ou expirou.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate({ to: '/sign-in' })}
        >
          Voltar para o login
        </Button>
      </div>
    )
  }

  if (passwordSet) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium">Senha definida</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sua senha foi definida com sucesso!
            <br />
            Você será redirecionado para a página de login.
          </p>
        </div>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Digite sua nova senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Confirme sua nova senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Definindo senha...' : 'Definir senha'}
          </Button>
        </form>
      </Form>
    </div>
  )
} 