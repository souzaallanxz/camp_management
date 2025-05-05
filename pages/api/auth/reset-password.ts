import { NextApiRequest, NextApiResponse } from 'next'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { env } from '@/env'

const sql = neon(env.DATABASE_URL)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token, password } = req.body

    // Find user with valid reset token
    const userResult = await sql`
      SELECT id FROM public.users 
      WHERE reset_token = ${token} 
      AND reset_token_expires > NOW()
    `

    if (userResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    const user = userResult[0]

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update password and clear reset token
    await sql`
      UPDATE public.users 
      SET password_hash = ${hashedPassword}, 
          reset_token = NULL, 
          reset_token_expires = NULL 
      WHERE id = ${user.id}
    `

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 