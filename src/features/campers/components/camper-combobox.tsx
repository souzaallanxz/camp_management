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
import type { PersonWithBalance } from '@/features/snack-bar/data/schema'

interface CamperComboboxProps {
  value: string
  onValueChange: (value: string) => void
  campers: PersonWithBalance[]
}

export function CamperCombobox({ value, onValueChange, campers }: CamperComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedPerson = campers?.find((person) => person.id === value)

  // Filtrar por nome OU form_id
  const filteredPeople = campers?.filter((person) => {
    const searchLower = search.toLowerCase()
    const nameMatch = person.name.toLowerCase().includes(searchLower)
    const formIdMatch = 'form_id' in person && person.form_id && person.form_id.toLowerCase().includes(searchLower)
    return nameMatch || formIdMatch
  })

  const getDisplayName = (person: PersonWithBalance) => {
    const baseName = person.name
    const formId = 'form_id' in person ? person.form_id : null
    const type = person.type === 'staff' ? ' (Staff)' : ''
    return `${baseName}${formId ? ` (${formId})` : ''}${type}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? getDisplayName(selectedPerson!) : 'Selecione um campista ou staff...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Procurar por nome ou form_id..." className="h-9" value={search} onValueChange={setSearch} />
          <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredPeople?.map((person) => (
              <CommandItem
                key={person.id}
                value={getDisplayName(person)}
                onSelect={() => {
                  onValueChange(person.id)
                  setOpen(false)
                }}
                className="py-2"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === person.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {person.name}
                {'form_id' in person && person.form_id && (
                  <span className="ml-2 text-xs text-muted-foreground">({person.form_id})</span>
                )}
                {person.type === 'staff' && (
                  <span className="ml-2 text-xs text-blue-600 font-medium">(Staff)</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 