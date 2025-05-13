import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Camper, updateCamperSchema } from '../data/schema'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'
import { camperService } from '../services/camper-service'

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

  useEffect(() => {
    async function loadCamper() {
      if (!camperId) return

      setLoading(true)
      try {
        const data = await camperService.findById(camperId)
        setCamper(data)
        setFormData(data)
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

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: date
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
                <label htmlFor="date_of_birth">Date of Birth</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.date_of_birth && 'text-muted-foreground'
                      )}
                      disabled={!isEditing}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date_of_birth ? (
                        format(new Date(formData.date_of_birth), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <label htmlFor="id_number">ID Number</label>
                <Input
                  id="id_number"
                  name="id_number"
                  value={formData.id_number || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="sns_number">SNS Number</label>
                <Input
                  id="sns_number"
                  name="sns_number"
                  value={formData.sns_number || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="dietary_restrictions">Dietary Restrictions</label>
                <Textarea
                  id="dietary_restrictions"
                  name="dietary_restrictions"
                  value={formData.dietary_restrictions || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="guardian_name">Guardian Name</label>
                <Input
                  id="guardian_name"
                  name="guardian_name"
                  value={formData.guardian_name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="guardian_email">Guardian Email</label>
                <Input
                  id="guardian_email"
                  name="guardian_email"
                  type="email"
                  value={formData.guardian_email || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="guardian_phone">Guardian Phone</label>
                <Input
                  id="guardian_phone"
                  name="guardian_phone"
                  value={formData.guardian_phone || ''}
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
        </div>
      </SheetContent>
    </Sheet>
  )
} 