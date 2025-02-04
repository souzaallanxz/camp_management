import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { teamService } from '../services/team-service'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Team name is required' }),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  isOnboarding?: boolean
}

export function CreateTeamDialog({ open, onOpenChange, onSuccess, isOnboarding = false }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true)
      await teamService.createTeam(data)
      toast({
        title: 'Success',
        description: 'Team created successfully',
      })
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create team. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    // If it's onboarding and trying to close, prevent it
    if (isOnboarding && !newOpen) {
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            {isOnboarding 
              ? 'Welcome! Please create a team for your organization to get started.'
              : 'Create a new team for your organization.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter team name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-end space-x-2'>
              {!isOnboarding && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              )}
              <Button type='submit' disabled={isLoading}>
                Create Team
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 