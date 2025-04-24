import { Button } from '@/components/ui/button'
import { IconUserPlus } from '@tabler/icons-react'
import { useUsersDialogs } from '../context/users-context'

export function UsersPrimaryButtons() {
  const { openInviteDialog } = useUsersDialogs()

  return (
    <div className='flex items-center gap-2'>
      <Button onClick={openInviteDialog}>
        <IconUserPlus className='mr-2 h-4 w-4' />
        Adicionar Usuário
      </Button>
    </div>
  )
}
