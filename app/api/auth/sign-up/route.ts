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
    const { email, password, name } = await request.json()

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT id FROM public.users WHERE email = $1',
      [email]
    )

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const result = await pool.query(
      `INSERT INTO public.users (id, email, name, password_hash)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, email, name, team_id`,
      [email, name, hashedPassword]
    )

    const user = result.rows[0]

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user,
      session: {
        user,
        token: user.id // Using user ID as token for now
      }
    })
  } catch (error) {
    console.error('Sign up error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 