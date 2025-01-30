import { serve } from 'https://deno.fresh.dev/std@v1/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  mobileNumber: string
  amount: string
  description: string
  orderId: string
  email?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mobileNumber, amount, description, orderId, email } = await req.json() as RequestBody

    // Validate orderId length
    if (orderId.length > 15) {
      throw new Error('OrderId must not exceed 15 characters')
    }

    // Validate description length
    if (description && description.length > 100) {
      throw new Error('Description must not exceed 100 characters')
    }

    // Validate email length
    if (email && email.length > 100) {
      throw new Error('Email must not exceed 100 characters')
    }

    const response = await fetch('https://mbway.ifthenpay.com/api/mbway/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mbWayKey: Deno.env.get('MBWAY_KEY'),
        orderId,
        amount,
        mobileNumber,
        description,
        ...(email && { email }),
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 