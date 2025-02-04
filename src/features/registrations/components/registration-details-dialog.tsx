import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable } from '@/components/ui/data-table'
import { columns } from './payments-columns'
import { Registration, Payment } from '../data/schema'
import { getPaymentsByRegistrationId } from '../services/payment-service'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { PaymentForm } from './payment-form'

const statusStyles = {
  paid: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
  partial: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
  unpaid: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
}

interface RegistrationDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registration: Registration | null
  onRegistrationUpdated: () => void
}

export function RegistrationDetailsSheet({
  open,
  onOpenChange,
  registration,
  onRegistrationUpdated,
}: RegistrationDetailsSheetProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const loadPayments = async () => {
    if (!registration) return
    try {
      const paymentsData = await getPaymentsByRegistrationId(registration.id)
      setPayments(paymentsData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payments'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      })
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!registration) {
        setLoading(false)
        return
      }

      try {
        const paymentsData = await getPaymentsByRegistrationId(registration.id)
        setPayments(paymentsData)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load payments'
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [registration, toast])

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  const handlePaymentSuccess = async () => {
    setShowPaymentForm(false)
    await loadPayments()
    if (typeof onRegistrationUpdated === 'function') {
      onRegistrationUpdated()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes da Inscrição</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading...</p>
          </div>
        ) : !registration ? (
          <div className="flex items-center justify-center h-full">
            <p>Inscrição não encontrada</p>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">Informações Pessoais</h3>
              <div className="text-sm text-muted-foreground">
                Visualize as informações da inscrição e o histórico de pagamentos.
              </div>
            </div>
            <Separator />

            <div className="grid gap-4 text-sm">
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Nome</span>
                <span className="col-span-3">{registration.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Email</span>
                <span className="col-span-3">{registration.email}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Contato</span>
                <span className="col-span-3">{registration.contact}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Acampamento</span>
                <span className="col-span-3">{registration.camp?.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">ID do Formulário</span>
                <span className="col-span-3">{registration.form_id || '-'}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Estado</span>
                <span className="col-span-3">
                  <Badge className={cn(statusStyles[registration.status])}>
                    {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Criado em</span>
                <span className="col-span-3">
                  {new Date(registration.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">Informações de Pagamento</h3>
              <div className="text-sm text-muted-foreground">
                Visualize e gerencie os pagamentos para esta inscrição.
              </div>
            </div>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Pago</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                </div>
                <Button
                  onClick={() => setShowPaymentForm(true)}
                  className="h-8"
                >
                  <IconPlus className="mr-2 h-4 w-4" />
                  Adicionar Pagamento
                </Button>
              </div>

              <DataTable data={payments} columns={columns} />
            </div>

            {showPaymentForm && (
              <PaymentForm
                registrationId={registration.id}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPaymentForm(false)}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
} 