import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { sqlNeon } from '@/lib/sql-neon'
import bcrypt from 'bcryptjs'

export function SetupPassword() {
  const navigate = useNavigate()
  const { userId } = useSearch({ from: '/setup-password' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>Link inválido ou expirado</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                O link de definição de senha é inválido ou expirado. Por favor, solicite um novo convite.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate passwords
      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres')
      }

      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem')
      }

      // Check if user exists and is invited
      const userResult = await sqlNeon`
        SELECT id, status
        FROM public.users
        WHERE id = ${userId}::uuid
      `

      const user = userResult[0]

      if (!user) {
        throw new Error('Usuário não encontrado')
      }

      if (user.status !== 'invited') {
        throw new Error('Este usuário já definiu sua senha')
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      // Update user password and status
      await sqlNeon`
        UPDATE public.users
        SET 
          password_hash = ${hashedPassword}::text,
          status = 'active',
          updated_at = NOW()
        WHERE id = ${userId}::uuid
      `

      // Redirect to login
      navigate({ to: '/sign-in' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao definir senha')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Definir Senha</CardTitle>
          <CardDescription>
            Defina sua senha para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Definindo senha...' : 'Definir Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 