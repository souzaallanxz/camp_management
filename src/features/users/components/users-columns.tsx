import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import LongText from '@/components/long-text'
import { userTypes, userStatuses } from '../data/data'
import { User } from '../data/schema'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate') ||
          false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'firstName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='First Name' />
    ),
    cell: ({ row }) => {
      const firstName = row.getValue('firstName') as string
      return <LongText className='max-w-36'>{firstName || '-'}</LongText>
    },
    filterFn: (row, id, value) => {
      const firstName = row.getValue('firstName') as string
      const lastName = row.getValue('lastName') as string
      const email = row.getValue('email') as string
      const searchValue = value.toLowerCase()
      return (
        firstName?.toLowerCase().includes(searchValue) ||
        lastName?.toLowerCase().includes(searchValue) ||
        email?.toLowerCase().includes(searchValue)
      )
    },
  },
  {
    accessorKey: 'lastName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Last Name' />
    ),
    cell: ({ row }) => {
      const lastName = row.getValue('lastName') as string
      return <LongText className='max-w-36'>{lastName || '-'}</LongText>
    },
    filterFn: (row, id, value) => {
      const firstName = row.getValue('firstName') as string
      const lastName = row.getValue('lastName') as string
      const email = row.getValue('email') as string
      const searchValue = value.toLowerCase()
      return (
        firstName?.toLowerCase().includes(searchValue) ||
        lastName?.toLowerCase().includes(searchValue) ||
        email?.toLowerCase().includes(searchValue)
      )
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Email' />
    ),
    cell: ({ row }) => (
      <div className='w-fit text-nowrap'>{row.getValue('email')}</div>
    ),
    filterFn: (row, id, value) => {
      const firstName = row.getValue('firstName') as string
      const lastName = row.getValue('lastName') as string
      const email = row.getValue('email') as string
      const searchValue = value.toLowerCase()
      return (
        firstName?.toLowerCase().includes(searchValue) ||
        lastName?.toLowerCase().includes(searchValue) ||
        email?.toLowerCase().includes(searchValue)
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = userStatuses.find(
        (status) => status.value === row.getValue('status')
      )

      if (!status) {
        return null
      }

      return (
        <div className='flex w-[100px] items-center'>
          {status.icon && (
            <status.icon className='mr-2 h-4 w-4 text-muted-foreground' />
          )}
          <span>{status.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Role' />
    ),
    cell: ({ row }) => {
      const { role } = row.original
      const userType = userTypes.find(({ value }) => value === role)

      if (!userType) {
        return null
      }

      return (
        <div className='flex gap-x-2 items-center'>
          {userType.icon && (
            <userType.icon size={16} className='text-muted-foreground' />
          )}
          <span className='capitalize text-sm'>{row.getValue('role')}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions user={row.original} />,
  },
]
