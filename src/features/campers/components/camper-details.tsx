import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Camper, updateCamperSchema } from '../data/schema'
import { supabase } from '@/lib/supabase'
import { Separator } from '@/components/ui/separator'

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
        const { data, error } = await supabase
          .from('campers')
          .select('*')
          .eq('id', camperId)
          .single()

        if (error) {
          toast.error('Failed to load camper details')
          return
        }

        setCamper(data)
        setFormData(data)
        setIsEditing(true)
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

    try {
      const validatedData = updateCamperSchema.parse(formData)

      const { error } = await supabase
        .from('campers')
        .update(validatedData)
        .eq('id', camper.id)

      if (error) throw error

      setCamper({ ...camper, ...validatedData })
      toast.success('Camper updated successfully')
      onSuccess?.()
      onOpenChange(false)
    } catch {
      toast.error('Failed to update camper')
    }
  }

  return (
    <Sheet open={!!camperId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Camper Details</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading...</p>
          </div>
        ) : !camper ? (
          <div className="flex items-center justify-center h-full">
            <p>Camper not found</p>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">Personal Information</h3>
              <div className="text-sm text-muted-foreground">
                View and edit camper information.
              </div>
            </div>
            <Separator />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 text-sm">
                <div className="grid grid-cols-4 items-center">
                  <label htmlFor="form_id" className="font-medium">Form ID</label>
                  <div className="col-span-3">
                    {isEditing ? (
                      <Input
                        id="form_id"
                        name="form_id"
                        value={formData.form_id || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <span>{camper.form_id}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center">
                  <label htmlFor="name" className="font-medium">Name</label>
                  <div className="col-span-3">
                    {isEditing ? (
                      <Input
                        id="name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <span>{camper.name}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center">
                  <label htmlFor="email" className="font-medium">Email</label>
                  <div className="col-span-3">
                    {isEditing ? (
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <span>{camper.email}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center">
                  <label htmlFor="contact" className="font-medium">Contact</label>
                  <div className="col-span-3">
                    {isEditing ? (
                      <Input
                        id="contact"
                        name="contact"
                        value={formData.contact || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <span>{camper.contact}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center">
                  <label htmlFor="camp" className="font-medium">Camp</label>
                  <div className="col-span-3">
                    {isEditing ? (
                      <Input
                        id="camp"
                        name="camp"
                        value={formData.camp || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <span>{camper.camp}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start">
                  <label htmlFor="additional_notes" className="font-medium">Notes</label>
                  <div className="col-span-3">
                    {isEditing ? (
                      <Textarea
                        id="additional_notes"
                        name="additional_notes"
                        value={formData.additional_notes || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{camper.additional_notes}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center">
                  <span className="font-medium">Created At</span>
                  <span className="col-span-3">
                    {new Date(camper.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
} 