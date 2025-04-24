import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconMailPlus, IconSend } from '@tabler/icons-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { userTypes } from '../data/data'
import { createUserWithInvitation } from '../services/user-service'
import { UserRole } from '../data/schema'

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  email: z
    .string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Email is invalid.' }),
  role: z.enum(['superadmin', 'admin', 'contributor', 'cashier', 'manager'] as const),
})
type UserInviteForm = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserAdded?: () => void
}

export function UsersInviteDialog({ open, onOpenChange, onUserAdded }: Props) {
  const form = useForm<UserInviteForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      firstName: '',
      lastName: '',
      email: '',
      role: 'contributor' as UserRole
    },
  })

  const onSubmit = async (values: UserInviteForm) => {
    try {
      const { firstName, lastName, email, role } = values;
      await createUserWithInvitation({ firstName, lastName, email, role })
      
      toast({
        title: 'User invited',
        description: `Invitation email has been sent to ${values.email}`,
      })
      
      if (onUserAdded) {
        onUserAdded()
      }
      
      form.reset()
      onOpenChange(false)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to invite user. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          form.reset()
        }
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle className='flex items-center gap-2'>
            <IconMailPlus /> Invite New User
          </DialogTitle>
          <DialogDescription>
            Invite a new user to your team. An invitation email will be sent to set up their password.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='user-invite-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder='John' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Doe' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='john.doe@example.com'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a role' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className='flex items-center gap-2'>
                            {type.icon && <type.icon size={16} />}
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className='gap-y-2'>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button type='submit' form='user-invite-form'>
            Invite User <IconSend className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
