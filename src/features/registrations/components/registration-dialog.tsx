import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createRegistration } from '../services/registration-service'
import { createPayment } from '../services/payment-service'
import { PaymentMethod } from '../data/schema'
import { useNavigate } from '@tanstack/react-router'

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistrationCreated: () => void
}

export function RegistrationDialog({
  open,
  onOpenChange,
  onRegistrationCreated,
}: RegistrationDialogProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    camp: '',
    form_id: '',
  })
  const [paymentData, setPaymentData] = useState({
    payment_method: 'MB Way' as PaymentMethod,
    amount: '',
    payment_link: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPaymentData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePaymentMethodChange = (value: PaymentMethod) => {
    setPaymentData((prev) => ({
      ...prev,
      payment_method: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create registration first
      const registration = await createRegistration({
        ...formData,
        form_id: formData.form_id || null,
      })

      console.log('Registration created successfully:', registration)

      try {
        // Then create the initial payment
        const paymentToCreate = {
          registration_id: registration.id,
          payment_date: new Date().toISOString(),
          payment_method: paymentData.payment_method,
          amount: Number(paymentData.amount),
          payment_link: paymentData.payment_link || null,
        }

        console.log('Attempting to create payment:', paymentToCreate)

        const payment = await createPayment(paymentToCreate)
        console.log('Payment created successfully:', payment)

        toast({
          description: 'Inscrição e pagamento criados com sucesso',
        })
      } catch (paymentError) {
        console.error('Error creating payment:', paymentError)
        
        // Even if payment fails, the registration was created
        toast({
          variant: 'destructive',
          title: 'Aviso',
          description: 'Inscrição criada, mas houve um erro ao registrar o pagamento.',
        })
      }

      onRegistrationCreated()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        contact: '',
        camp: '',
        form_id: '',
      })
      setPaymentData({
        payment_method: 'MB Way' as PaymentMethod,
        amount: '',
        payment_link: '',
      })
    } catch (error) {
      console.error('Full error details:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro desconhecido ao criar inscrição'
      
      if (errorMessage.includes('autenticado')) {
        toast({
          variant: 'destructive',
          title: 'Erro de Autenticação',
          description: 'Sessão expirada. Redirecionando para o login...',
        })
        setTimeout(() => {
          navigate({ to: '/sign-in' })
        }, 2000)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: errorMessage,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Inscrição</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact">Contacto</Label>
              <Input
                id="contact"
                name="contact"
                value={formData.contact}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="camp">Campo</Label>
              <Input
                id="camp"
                name="camp"
                value={formData.camp}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="form_id">ID do Formulário</Label>
              <Input
                id="form_id"
                name="form_id"
                value={formData.form_id}
                onChange={handleInputChange}
              />
            </div>

            {/* Payment Section */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Informação de Pagamento</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment_method">Método de Pagamento</Label>
                  <Select
                    value={paymentData.payment_method}
                    onValueChange={handlePaymentMethodChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MB Way">MB Way</SelectItem>
                      <SelectItem value="Transferência Bancária">
                        Transferência Bancária
                      </SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentData.amount}
                    onChange={handlePaymentInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payment_link">Link de Pagamento</Label>
                  <Input
                    id="payment_link"
                    name="payment_link"
                    value={paymentData.payment_link}
                    onChange={handlePaymentInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'A criar...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 