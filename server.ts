import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Resend } from 'resend'

// Load environment variables
dotenv.config()

const app = express()

// Enable CORS
app.use(cors())

// Parse JSON request bodies
app.use(express.json())

// Inicializa o SDK do Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY)

// Rota para envio de email usando o SDK oficial
app.post('/api/send-email', async (req, res) => {
  try {
    if (!process.env.VITE_RESEND_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: { 
          name: 'configuration_error', 
          message: 'Resend API key not configured' 
        } 
      })
    }
    
    const { from, to, subject, html, text } = req.body
    
    // Usa o SDK oficial do Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text
    })
    
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          name: 'resend_error', 
          message: error.message 
        } 
      })
    }
    
    return res.json({ 
      success: true, 
      data
    })
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending email:', error)
    
    return res.status(500).json({ 
      success: false, 
      error: { 
        name: 'server_error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      } 
    })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.info(`Server running on http://localhost:${PORT}`)
}) 