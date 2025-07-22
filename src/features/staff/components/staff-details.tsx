import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Staff, updateStaffSchema } from '../data/schema'
import { Separator } from '@/components/ui/separator'
import { staffService } from '../services/staff-service'
import { DataTable } from '@/components/ui/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useCamps } from '@/features/camps/hooks/use-camps'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

interface StaffDetailsProps {
  staffId: string | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function StaffDetails({ staffId, onOpenChange, onSuccess }: StaffDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [formData, setFormData] = useState<Partial<Staff>>({})
  const [snackbarBalanceRecords, setSnackbarBalanceRecords] = useState<SnackbarBalanceRecord[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalLoaded, setTotalLoaded] = useState(0)
  const [totalLiquidated, setTotalLiquidated] = useState(0)
  const { data: camps, isLoading: isLoadingCamps } = useCamps()

  useEffect(() => {
    async function loadStaff() {
      if (!staffId) return

      setLoading(true)
      try {
        const data = await staffService.findById(staffId)
        
        if (data) {
          setStaff(data)
          setFormData({
            name: data.name,
            email: data.email,
            phone: data.phone,
            camp_id: data.camp_id,
          })
          
          // Load snackbar data
          const [balanceRecords, total, loaded, liquidated] = await Promise.all([
            staffService.getSnackbarBalanceRecords(staffId),
            staffService.getSnackbarTotalSpent(staffId),
            staffService.getSnackbarTotalLoaded(staffId),
            staffService.getSnackbarTotalLiquidated(staffId)
          ])
          
          setSnackbarBalanceRecords(balanceRecords)
          setTotalSpent(total)
          setTotalLoaded(loaded)
          setTotalLiquidated(liquidated)
        }
        
        setIsEditing(true)
      } catch {
        toast.error('Failed to load staff details')
      } finally {
        setLoading(false)
      }
    }

    loadStaff()
  }, [staffId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCampChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      camp_id: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staff) return

    setLoading(true)
    try {
      const validatedData = updateStaffSchema.parse(formData)
      
      const updatedStaff = await staffService.update(staff.id, validatedData)
      
      if (updatedStaff) {
        setStaff({ ...staff, ...updatedStaff })
        toast.success('Staff member updated successfully')
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error('Failed to update staff member')
      }
    } catch {
      toast.error('Failed to update staff member')
    } finally {
      setLoading(false)
    }
  }

  if (!staffId) return null

  return (
    <Sheet open={!!staffId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Detalhes do Staff</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        <div className="overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="name">Nome</label>
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
                <label htmlFor="phone">Telefone</label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="camp_id">Acampamento</label>
                <Select
                  onValueChange={handleCampChange}
                  value={formData.camp_id || ''}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um acampamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCamps ? (
                      <SelectItem value="loading" disabled>
                        Carregando acampamentos...
                      </SelectItem>
                    ) : camps && camps.length > 0 ? (
                      camps.map((camp) => (
                        <SelectItem key={camp.id} value={camp.id}>
                          {camp.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhum acampamento encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
                Visualize o histórico de carregamentos de cartão de snackbar deste membro do staff.
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
                    <p className={`text-2xl font-bold ${(totalLoaded - totalSpent - totalLiquidated) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(totalLoaded - totalSpent - totalLiquidated)}
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