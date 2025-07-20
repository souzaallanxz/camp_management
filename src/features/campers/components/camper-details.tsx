import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Camper, updateCamperSchema } from '../data/schema'
import { Separator } from '@/components/ui/separator'
import { camperService } from '../services/camper-service'
import { DataTable } from '@/components/ui/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface SnackbarBalanceRecord {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

const snackbarBalanceColumns: ColumnDef<SnackbarBalanceRecord>[] = [
  {
    accessorKey: 'created_at',
    header: 'Data',
    size: 180,
    cell: ({ row }) => format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm'),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Valor</div>,
    size: 100,
    cell: ({ row }) => {
      const amount = row.original.amount
      const formattedAmount = typeof amount === 'number' 
        ? amount.toFixed(2) 
        : parseFloat(String(amount))?.toFixed(2) || '0.00'
      
      return (
        <div className="text-right tabular-nums font-medium">
          € {formattedAmount}
        </div>
      )
    },
  },
  {
    accessorKey: 'payment_method',
    header: 'Método de Pagamento',
    size: 150,
    cell: ({ row }) => {
      const paymentMethod = row.original.payment_method
      
      return (
        <div className="flex items-center">
          <span className="text-sm">{paymentMethod}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'payment_status',
    header: 'Status',
    size: 100,
    cell: ({ row }) => {
      const paymentStatus = row.original.payment_status
      
      return (
        <div className="flex items-center">
          {paymentStatus === 'confirmed' ? (
            <Badge variant="default" className="text-xs">
              Confirmado
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Pendente
            </Badge>
          )}
        </div>
      )
    },
  },
]

interface CamperDetailsProps {
  camperId: string | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CamperDetails({ camperId, onOpenChange, onSuccess }: CamperDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [camper, setCamper] = useState<Camper | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [formData, setFormData] = useState<Partial<Camper>>({})
  const [snackbarBalanceRecords, setSnackbarBalanceRecords] = useState<SnackbarBalanceRecord[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalLoaded, setTotalLoaded] = useState(0)

  useEffect(() => {
    async function loadCamper() {
      if (!camperId) return

      setLoading(true)
      try {
        const [data, balanceRecords, total, loaded] = await Promise.all([
          camperService.findById(camperId),
          camperService.getSnackbarBalanceRecords(camperId),
          camperService.getSnackbarTotalSpent(camperId),
          camperService.getSnackbarTotalLoaded(camperId)
        ])
        
        setCamper(data)
        setFormData(data)
        setSnackbarBalanceRecords(balanceRecords)
        setTotalSpent(total)
        setTotalLoaded(loaded)
        setIsEditing(true)
      } catch {
        toast.error('Failed to load camper details')
      } finally {
        setLoading(false)
      }
    }

    loadCamper()
  }, [camperId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!camper) return

    setLoading(true)
    try {
      const validatedData = updateCamperSchema.parse(formData)
      
      const updatedCamper = await camperService.update(camper.id, validatedData)
      
      setCamper({ ...camper, ...updatedCamper })
      toast.success('Camper updated successfully')
      onSuccess?.()
      onOpenChange(false)
    } catch {
      toast.error('Failed to update camper')
    } finally {
      setLoading(false)
    }
  }

  if (!camperId) return null

  return (
    <Sheet open={!!camperId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Camper Details</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        <div className="overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="name">Name</label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="contact">Contact</label>
                <Input
                  id="contact"
                  name="contact"
                  value={formData.contact || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="camp">Camp</label>
                <Input
                  id="camp"
                  name="camp"
                  value={formData.camp || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="snack_bar_balance">Snack Bar Balance</label>
                <Input
                  id="snack_bar_balance"
                  name="snack_bar_balance"
                  type="number"
                  value={formData.snack_bar_balance || 0}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="additional_notes">Additional Notes</label>
                <Textarea
                  id="additional_notes"
                  name="additional_notes"
                  value={formData.additional_notes || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              {isEditing && (
                <Button type="submit" disabled={loading}>
                  Save Changes
                </Button>
              )}
            </div>
          </form>

          {/* Snackbar Transactions Section */}
          <div className="mt-8">
            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">Histórico de Carregamentos Snackbar</h3>
              <div className="text-sm text-muted-foreground">
                Visualize o histórico de carregamentos de cartão de snackbar deste campista.
              </div>
            </div>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-4 w-full">
                  <div>
                    <p className="text-sm font-medium">Total Carregado</p>
                    <p className="text-2xl font-bold text-black">{formatCurrency(totalLoaded)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Gasto</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Saldo Disponível</p>
                    <p className={`text-2xl font-bold ${(totalLoaded - totalSpent) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(totalLoaded - totalSpent)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[400px] overflow-auto">
                <DataTable 
                  columns={snackbarBalanceColumns} 
                  data={snackbarBalanceRecords}
                  emptyMessage="Sem carregamentos para exibir"
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 