import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { CamperWithBalance } from '@/features/snack-bar/data/schema'

interface CamperComboboxProps {
  value: string
  onValueChange: (value: string) => void
  campers: CamperWithBalance[]
}

export function CamperCombobox({ value, onValueChange, campers }: CamperComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedCamper = campers?.find((camper) => camper.id === value)

  // Filtrar por nome OU form_id
  const filteredCampers = campers?.filter((camper) => {
    const searchLower = search.toLowerCase()
    return (
      camper.name.toLowerCase().includes(searchLower) ||
      (camper.form_id && camper.form_id.toLowerCase().includes(searchLower))
    )
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? `${selectedCamper?.name}${selectedCamper?.form_id ? ` (${selectedCamper.form_id})` : ''}` : 'Selecione um campista...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Procurar campista por nome ou form_id..." className="h-9" value={search} onValueChange={setSearch} />
          <CommandEmpty>Nenhum campista encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredCampers?.map((camper) => (
              <CommandItem
                key={camper.id}
                value={`${camper.name}${camper.form_id ? ` (${camper.form_id})` : ''}`}
                onSelect={() => {
                  onValueChange(camper.id)
                  setOpen(false)
                }}
                className="py-2"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === camper.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {camper.name}
                {camper.form_id && (
                  <span className="ml-2 text-xs text-muted-foreground">({camper.form_id})</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 