import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
import { snackBarService } from '@/features/snack-bar/services/snack-bar-service'

interface CamperComboboxProps {
  value: string
  onValueChange: (value: string) => void
}

export function CamperCombobox({ value, onValueChange }: CamperComboboxProps) {
  const [open, setOpen] = useState(false)

  const { data: campers = [] } = useQuery({
    queryKey: ['current-camp-campers'],
    queryFn: () => snackBarService.getCampers(),
  })

  const selectedCamper = campers?.find((camper) => camper.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? selectedCamper?.name : 'Selecione um campista...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Procurar campista..." className="h-9" />
          <CommandEmpty>Nenhum campista encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {campers?.map((camper) => (
              <CommandItem
                key={camper.id}
                value={camper.name}
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
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 