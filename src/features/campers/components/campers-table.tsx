import { useState, useMemo } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type Camper } from '../data/schema'
import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { columns as defaultColumns } from './campers-columns'

export interface CamperWithActions extends Camper {
  onEdit?: (camper: Camper) => void
  onLoadCard?: (camper: Camper) => void
  total_balance: number
}

interface DataTableProps {
  data: CamperWithActions[]
}

export function CampersTable({ data }: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Extrair acampamentos únicos dos dados
  const campFilters = useMemo(() => {
    const uniqueCamps = Array.from(new Set(data.map(item => {
      const camp = item.camp;
      if (typeof camp === 'object' && camp && typeof camp === 'object' && 'name' in camp) {
        return (camp as { name: string }).name;
      }
      return camp;
    }).filter(Boolean)))
    return uniqueCamps.map(campName => ({
      label: campName,
      value: campName
    }))
  }, [data])

  const table = useReactTable({
    data,
    columns: defaultColumns as ColumnDef<CamperWithActions, unknown>[],
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId)
      if (value == null) return false
      
      const searchValue = filterValue.toLowerCase()
      const stringValue = String(value).toLowerCase()
      
      return stringValue.includes(searchValue)
    },
  })

  return (
    <div className='space-y-4'>
      <DataTableToolbar 
        table={table} 
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        filters={[
          {
            column: 'camp',
            title: 'Acampamento',
            options: campFilters
          }
        ]}
      />
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={defaultColumns.length}
                  className='h-24 text-center'
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
} 