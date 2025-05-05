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
    const { email, password } = await request.json()

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, name, password_hash, team_id FROM public.users WHERE email = $1',
      [email]
    )

    const user = userResult.rows[0]

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      session: {
        user: userWithoutPassword,
        token: user.id // Using user ID as token for now
      }
    })
  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 