import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { IconDotsVertical, IconEdit, IconMail, IconTrash } from '@tabler/icons-react'
import { User } from '../data/schema'
import { useUsersDialogs } from '../context/users-context'

interface DataTableRowActionsProps {
  user: User
}

export function DataTableRowActions({ user }: DataTableRowActionsProps) {
  const { openEditDialog, openDeleteDialog } = useUsersDialogs()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='data-[state=open]:bg-muted'>
          <IconDotsVertical className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openEditDialog(user)}>
          <IconEdit className='mr-2 h-4 w-4' /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`mailto:${user.email}`)}>
          <IconMail className='mr-2 h-4 w-4' /> Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className='text-destructive focus:text-destructive' 
          onClick={() => openDeleteDialog(user)}
        >
          <IconTrash className='mr-2 h-4 w-4' /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
