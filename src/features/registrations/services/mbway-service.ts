import { env } from '@/env'

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
    try {
      // Remove any non-digit characters and ensure it's a Portuguese number
      const cleanNumber = data.mobileNumber.replace(/\D/g, '')
      const formattedMobileNumber = `351#${cleanNumber}`

      // Ensure orderId is a string and has max 15 chars
      const formattedOrderId = String(data.orderId).slice(0, 15)

      console.log('Enviando requisição MB Way:', {
        mobileNumber: formattedMobileNumber,
        amount: data.amount.toFixed(2),
        orderId: formattedOrderId,
      })

      const response = await fetch('https://api.ifthenpay.com/spg/payment/mbway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mbWayKey: env.VITE_MBWAY_KEY,
          orderId: formattedOrderId,
          amount: data.amount.toFixed(2), // Ensure amount is formatted with 2 decimal places
          mobileNumber: formattedMobileNumber,
          description: data.description,
        }),
      })

      console.log('Status da resposta MB Way:', response.status)

      const responseText = await response.text()
      console.log('Resposta MB Way (texto):', responseText)

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
    } catch (error) {
      console.error('Erro no serviço MB Way:', error)
      throw error // Propagate the original error instead of creating a new one
    }
  }
} 