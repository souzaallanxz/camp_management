import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useMemo } from 'react'
import { type CamperWithActions } from './campers-table'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  data: TData[]
}

export function DataTableToolbar<TData>({
  table,
  data,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Extrair acampamentos únicos dos dados recebidos
  const campFilters = useMemo(() => {
    const tableData = data as CamperWithActions[];
    const uniqueCamps = Array.from(new Set(tableData.map(item => item.camp_name).filter(Boolean)));
    return uniqueCamps.map(campName => ({
      label: campName,
      value: campName
    }))
  }, [data])

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        <Input
          placeholder='Filtrar por nome...'
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        <div className='flex gap-x-2'>
          <DataTableFacetedFilter
            column={table.getColumn('camp_name')}
            title='Acampamento'
            options={campFilters}
          />
        </div>
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