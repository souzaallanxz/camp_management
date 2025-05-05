import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { env } from '@/env'
import { Resend } from 'resend'

const pool = new neon({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const resend = new Resend(env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id FROM public.users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ success: true })
    }

    const user = userResult.rows[0]

    // Generate reset token (using a simple UUID for now)
    const resetToken = crypto.randomUUID()

    // Store reset token in database
    await pool.query(
      `UPDATE public.users 
       SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour'
       WHERE id = $2`,
      [resetToken, user.id]
    )

    // Generate reset link
    const resetLink = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

    // Send email
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password recovery error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 