import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCamps } from '@/features/camps/hooks/use-camps'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const { data: camps = [] } = useCamps()

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input
          placeholder='Filtrar por nome...'
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        <Select
          value={(table.getColumn('camp')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) => {
            table.getColumn('camp')?.setFilterValue(value === 'all' ? '' : value)
          }}
        >
          <SelectTrigger className='h-8 w-[180px]'>
            <SelectValue placeholder='Filtrar por acampamento' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Todos os acampamentos</SelectItem>
            {camps.map((camp) => (
              <SelectItem key={camp.id} value={camp.name}>
                {camp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Limpar
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
} 