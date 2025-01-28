import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Registration, Payment } from '../data/schema'
import { getPaymentsByRegistrationId } from '../services/payment-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface RegistrationDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registration: Registration | null
}

export function RegistrationDetailsDialog({
  open,
  onOpenChange,
  registration,
}: RegistrationDetailsDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    if (registration && open) {
      getPaymentsByRegistrationId(registration.id)
        .then(setPayments)
        .catch(console.error)
    }
  }, [registration, open])

  if (!registration) return null

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Registration Details</DialogTitle>
        </DialogHeader>

        <div className='grid gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-2'>
              <div>
                <span className='font-semibold'>Name:</span> {registration.name}
              </div>
              <div>
                <span className='font-semibold'>Email:</span> {registration.email}
              </div>
              <div>
                <span className='font-semibold'>Contact:</span> {registration.contact}
              </div>
              <div>
                <span className='font-semibold'>Camp:</span> {registration.camp}
              </div>
              {registration.form_id && (
                <div>
                  <span className='font-semibold'>Form ID:</span> {registration.form_id}
                </div>
              )}
              <div>
                <span className='font-semibold'>Created At:</span>{' '}
                {new Date(registration.created_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className='flex items-center justify-between border-b pb-2 last:border-0'
                  >
                    <div>
                      <div className='font-medium'>{payment.payment_method}</div>
                      <div className='text-sm text-muted-foreground'>
                        {new Date(payment.payment_date).toLocaleString()}
                      </div>
                    </div>
                    <div className='font-medium'>{formatCurrency(payment.amount)}</div>
                  </div>
                ))}

                <div className='flex items-center justify-between pt-2 font-semibold'>
                  <div>Total Paid</div>
                  <div>{formatCurrency(totalPaid)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 