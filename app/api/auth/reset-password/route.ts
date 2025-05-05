import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { env } from '@/env'

const pool = new neon({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    // Find user with valid reset token
    const userResult = await pool.query(
      `SELECT id FROM public.users 
       WHERE reset_token = $1 
       AND reset_token_expires > NOW()`,
      [token]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    const user = userResult.rows[0]

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update password and clear reset token
    await pool.query(
      `UPDATE public.users 
       SET password_hash = $1, 
           reset_token = NULL, 
           reset_token_expires = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 