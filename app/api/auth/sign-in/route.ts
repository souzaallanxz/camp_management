import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

// Create database connection
const sql = neon(process.env.DATABASE_URL)

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    try {
      // Find user by email
      const userResult = await sql`
        SELECT id, email, name, password_hash, team_id 
        FROM public.users 
        WHERE email = ${email}
      `

      const user = userResult[0]

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
      const { password_hash: _, ...userWithoutPassword } = user

      return NextResponse.json({
        user: userWithoutPassword,
        session: {
          user: userWithoutPassword,
          token: user.id // Using user ID as token for now
        }
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { 
          error: 'Database error',
          message: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in sign-in:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        database_url_set: !!process.env.DATABASE_URL
      },
      { status: 500 }
    )
  }
} 