import { NextApiRequest, NextApiResponse } from 'next'
import { neon } from '@neondatabase/serverless'
import { env } from '@/env'
import { Resend } from 'resend'

const sql = neon(env.DATABASE_URL)
const resend = new Resend(env.RESEND_API_KEY)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    // Check if user exists
    const userResult = await sql`
      SELECT id FROM public.users WHERE email = ${email}
    `

    if (userResult.length === 0) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.status(200).json({ success: true })
    }

    const user = userResult[0]

    // Generate reset token (using a simple UUID for now)
    const resetToken = crypto.randomUUID()

    // Store reset token in database
    await sql`
      UPDATE public.users 
      SET reset_token = ${resetToken}, reset_token_expires = NOW() + INTERVAL '1 hour'
      WHERE id = ${user.id}
    `

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

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Password recovery error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 