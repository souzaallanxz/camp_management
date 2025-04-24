import { HTMLAttributes, useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { tokenService } from '@/services/token.service'
import { authService } from '@/services/auth.service'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Check, AlertCircle, InfoIcon } from 'lucide-react'

type ResetPasswordFormProps = HTMLAttributes<HTMLDivElement>

const formSchema = z
  .object({
    password: z.string().min(8, {
      message: 'A senha deve ter pelo menos 8 caracteres.'
    })
    .regex(/[A-Z]/, {
      message: 'A senha deve conter pelo menos uma letra maiúscula.'
    })
    .regex(/[a-z]/, {
      message: 'A senha deve conter pelo menos uma letra minúscula.'
    })
    .regex(/[0-9]/, {
      message: 'A senha deve conter pelo menos um número.'
    }),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword']
  });

export function ResetPasswordForm({ className, ...props }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{token?: string, email?: string}>({})
  const [manualResetMode, setManualResetMode] = useState(false)
  const search = useSearch({ from: '/(auth)/reset-password' })
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)
  const navigate = useNavigate()
  
  useEffect(() => {
    // Debug: mostrar os parâmetros da URL no console
    // eslint-disable-next-line no-console
    console.log('Parâmetros da URL:', search);
    
    const token = search.token as string;
    const email = search.email as string;
    
    // Armazena para depuração
    setDebugInfo({ token, email });
    
    if (token && email) {
      try {
        // eslint-disable-next-line no-console
        console.log(`Tentando validar token para ${email}`);
        // eslint-disable-next-line no-console
        console.log(`Token a ser validado: ${token}`);
        
        // Limpa possíveis caracteres extras que possam ter sido adicionados à URL
        const cleanToken = token.trim();
        
        const isValid = tokenService.validateToken(cleanToken, email);
        setIsTokenValid(isValid);
        
        if (!isValid) {
          // eslint-disable-next-line no-console
          console.error('Token inválido ou expirado');
          toast.error('Link de redefinição de senha inválido ou expirado.');
        } else {
          // eslint-disable-next-line no-console
          console.log('Token validado com sucesso');
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Erro ao validar token:', error);
        setIsTokenValid(false);
        toast.error('Erro ao validar o token de redefinição.');
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('Parâmetros de redefinição incompletos. Token:', token, 'Email:', email);
      setIsTokenValid(false);
      toast.error('Parâmetros de redefinição de senha incompletos.');
    }
  }, [search]);
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const token = search.token ? (search.token as string).trim() : '';
    const email = search.email as string;
    
    if ((!token || !email || !isTokenValid) && !manualResetMode) {
      toast.error('Link de redefinição de senha inválido ou expirado.')
      return
    }

    setIsLoading(true)

    try {
      // Atualiza a senha no serviço de autenticação (agora é assíncrono)
      const success = await authService.resetPassword(email, values.password);
      
      if (success) {
        // Invalida o token após o uso (apenas se não estiver em modo manual)
        if (token && !manualResetMode) {
          tokenService.invalidateToken(token);
        }
        
        toast.success('Senha redefinida com sucesso!');
        setResetComplete(true);
        
        // eslint-disable-next-line no-console
        console.log('Senha atualizada para o email:', email);
      } else {
        throw new Error('Falha ao redefinir a senha');
      }
    } catch (error) {
      toast.error('Erro ao redefinir a senha. Tente novamente.')
      // eslint-disable-next-line no-console
      console.error('Erro ao redefinir a senha:', error)
      form.setError('root', { 
        message: 'Ocorreu um erro ao redefinir a senha. Tente novamente.' 
      });
    } finally {
      setIsLoading(false)
    }
  }

  // Função para habilitar o reset manual com o email
  function enableManualReset() {
    setManualResetMode(true);
    setIsTokenValid(true);
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      {resetComplete ? (
        <div className="space-y-4">
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>Senha redefinida com sucesso!</AlertTitle>
            <AlertDescription>
              Sua senha foi alterada. Você já pode fazer login com sua nova senha.
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={() => navigate({ to: '/sign-in' })}
            className="w-full"
          >
            Ir para o login
          </Button>
        </div>
      ) : isTokenValid === false && !manualResetMode ? (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Link inválido ou expirado</AlertTitle>
            <AlertDescription>
              Este link de redefinição de senha é inválido ou expirou. Por favor, solicite um novo link de redefinição.
            </AlertDescription>
          </Alert>
          
          {import.meta.env.DEV && (
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle>Informações de depuração</AlertTitle>
              <AlertDescription className="text-xs font-mono">
                <p>Email: {debugInfo.email || 'não encontrado'}</p>
                <p>Token: {debugInfo.token ? `${debugInfo.token.substring(0, 10)}...` : 'não encontrado'}</p>
                <p>Verifique o console para mais detalhes.</p>
              </AlertDescription>
            </Alert>
          )}
          
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <InfoIcon className="h-4 w-4 text-amber-600" />
            <AlertTitle>Problemas com o link?</AlertTitle>
            <AlertDescription>
              Se você continua tendo problemas com o link, pode tentar redefinir sua senha diretamente usando seu email.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => navigate({ to: '/forgot-password' })}
              variant="outline"
            >
              Solicitar novo link
            </Button>
            
            <Button
              onClick={enableManualReset}
              variant="default"
            >
              Redefinir sem token
            </Button>
          </div>
        </div>
      ) : (
        <>
          {manualResetMode && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <InfoIcon className="h-4 w-4 text-blue-600" />
              <AlertTitle>Redefinição manual</AlertTitle>
              <AlertDescription>
                Digite sua nova senha abaixo para continuar.
                {debugInfo.email && (
                  <div className="mt-1 text-sm">
                    Email de recuperação: <span className="font-medium">{debugInfo.email}</span>
                  </div>
                )}
              </AlertDescription>
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
                      <Input placeholder="********" type="password" {...field} />
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
                    <FormLabel>Confirme a nova senha</FormLabel>
                    <FormControl>
                      <Input placeholder="********" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Processando...' : 'Redefinir senha'}
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  )
} 