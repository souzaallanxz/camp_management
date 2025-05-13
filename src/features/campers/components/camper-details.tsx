import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Camper, updateCamperSchema } from '../data/schema'
import { Separator } from '@/components/ui/separator'
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
        </div>
      </SheetContent>
    </Sheet>
  )
} 