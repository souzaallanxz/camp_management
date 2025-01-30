import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable } from '@/components/ui/data-table'
import { columns } from './payments-columns'
import { Registration, Payment } from '../data/schema'
import { getRegistrationById } from '../services/registration-service'
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

interface RegistrationDetailsProps {
  registrationId: string | null
  onOpenChange: (open: boolean) => void
}

export function RegistrationDetails({ registrationId, onOpenChange }: RegistrationDetailsProps) {
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const loadPayments = async () => {
    if (!registrationId) return
    try {
      const paymentsData = await getPaymentsByRegistrationId(registrationId)
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
      if (!registrationId) {
        setLoading(false)
        return
      }

      try {
        const [registrationData, paymentsData] = await Promise.all([
          getRegistrationById(registrationId),
          getPaymentsByRegistrationId(registrationId)
        ])
        
        setRegistration(registrationData)
        setPayments(paymentsData)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load registration details'
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
  }, [registrationId, toast])

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  const handlePaymentSuccess = async () => {
    setShowPaymentForm(false)
    await loadPayments()
  }

  return (
    <Sheet open={!!registrationId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registration Details</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading...</p>
          </div>
        ) : !registration ? (
          <div className="flex items-center justify-center h-full">
            <p>Registration not found</p>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">Personal Information</h3>
              <div className="text-sm text-muted-foreground">
                View registration information and payment history.
              </div>
            </div>
            <Separator />

            <div className="grid gap-4 text-sm">
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Name</span>
                <span className="col-span-3">{registration.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Email</span>
                <span className="col-span-3">{registration.email}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Contact</span>
                <span className="col-span-3">{registration.contact}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Camp</span>
                <span className="col-span-3">{registration.camp?.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Status</span>
                <span className="col-span-3">
                  <Badge className={cn(statusStyles[registration.status])}>
                    {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-medium">Created At</span>
                <span className="col-span-3">
                  {new Date(registration.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium leading-none">Payment History</h3>
                  <div className="text-sm text-muted-foreground">
                    View payment details and history.
                  </div>
                </div>
                <Button
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  variant="outline"
                  size="sm"
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  New Payment
                </Button>
              </div>
            </div>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium whitespace-nowrap">Total Amount Paid</span>
                <span className="font-bold">{formatCurrency(totalPaid)}</span>
              </div>

              <DataTable data={payments} columns={columns} />

              {showPaymentForm && registrationId && (
                <>
                  <Separator />
                  <div className="pt-4">
                    <div className="text-sm font-medium mb-4">New Payment</div>
                    <PaymentForm
                      registrationId={registrationId}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setShowPaymentForm(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
} 