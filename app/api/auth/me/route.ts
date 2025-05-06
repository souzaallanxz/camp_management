import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

// Create a more robust database connection
const sql = neon({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    // Validate token format
    if (!token || token.length < 10) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      )
    }

    try {
      // Find user by token (which is the user ID)
      const userResult = await sql`
        SELECT id, email, name, team_id, role, created_at, updated_at 
        FROM public.users 
        WHERE id = ${token}::uuid
      `

      const user = userResult[0]

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        team_id: user.team_id,
        role: user.role
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
    // Log the error for debugging
    console.error('Error in /api/auth/me:', error)
    
    // Return a more detailed error response
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