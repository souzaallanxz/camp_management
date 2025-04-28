import { sqlNeon } from '@/lib/sql-neon'
import bcrypt from 'bcryptjs'

interface SetupPasswordParams {
  token: string
  password: string
}

export async function setupPassword({ token, password }: SetupPasswordParams) {
  // Check if user exists and is invited
  const userResult = await sqlNeon`
    SELECT id, status
    FROM public.users
    WHERE reset_password_token = ${token}::text
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
      reset_password_token = NULL,
      updated_at = NOW()
    WHERE id = ${user.id}::uuid
  `
} 