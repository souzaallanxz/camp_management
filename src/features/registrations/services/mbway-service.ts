import { api } from '@/lib/api-client'

interface MBWayPaymentRequest {
  mobileNumber: string
  amount: number
  description: string
  orderId: string
  email?: string
}

interface MBWayPaymentResponse {
  Success: boolean
  Message: string
  PaymentStatus: string
  MBWayPaymentId: string
}

export class MBWayService {
  static async requestPayment(data: MBWayPaymentRequest): Promise<MBWayPaymentResponse> {
    // Remove any non-digit characters and ensure it's a Portuguese number
    const cleanNumber = data.mobileNumber.replace(/\D/g, '')
    const formattedMobileNumber = `351#${cleanNumber}`

    // Ensure orderId is a string and has max 15 chars
    const formattedOrderId = String(data.orderId).slice(0, 15)

    // Get MBWay key from integration settings
    let mbWayKey: string
    try {
      const integrationResponse = await api.get('/integrations/mbway')
      if (!integrationResponse.data?.mbway_key || !integrationResponse.data?.is_active) {
        throw new Error('MBWay integration not configured or not active')
      }
      mbWayKey = integrationResponse.data.mbway_key
    } catch (error) {
      // Fallback to environment variable if integration not found
      mbWayKey =
        (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MBWAY_KEY) ||
        (typeof process !== 'undefined' && process.env && process.env.VITE_MBWAY_KEY) ||
        (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_IFTHENPAY_MBWAY_KEY) ||
        (typeof process !== 'undefined' && process.env && process.env.VITE_IFTHENPAY_MBWAY_KEY)

      if (!mbWayKey) {
        throw new Error('MB WAY key não configurada. Configure a integração MBWay nas definições.')
      }
    }

    const response = await fetch('https://api.ifthenpay.com/spg/payment/mbway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mbWayKey,
        orderId: formattedOrderId,
        amount: data.amount.toFixed(2), // Ensure amount is formatted with 2 decimal places
        mobileNumber: formattedMobileNumber,
        description: data.description,
      }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Erro ao processar pagamento MB Way: ${response.status} - ${responseText}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      throw new Error(`Resposta inválida do MB Way: ${responseText}`)
    }

    // Check if result is a string (error message)
    if (typeof result === 'string') {
      throw new Error(`Erro MB Way: ${result}`)
    }

    // Check if result has Success property and it's false
    if (result.Success === false) {
      throw new Error(result.Message || 'Erro ao processar pagamento MB Way')
    }

    return result
  }
}