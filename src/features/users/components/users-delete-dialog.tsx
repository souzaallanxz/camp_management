'use client'

import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { User } from '../data/schema'
import { deleteUser } from '../services/user-service'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserDeleted?: () => void
  user?: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  onUserDeleted,
  user,
}: Props) {
  if (!user) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deleteUser(user.id)
      toast({
        title: 'User deleted',
        description: `The user ${user.firstName} ${user.lastName} has been deleted successfully.`,
      })
      
      if (onUserDeleted) {
        onUserDeleted()
      }
      
      onOpenChange(false)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the user{' '}
            <strong>
              {user.firstName} {user.lastName}
            </strong>{' '}
            with email <strong>{user.email}</strong>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
