import { useQuery } from '@tanstack/react-query'
import { camperService } from '../services/camper-service'

export function useCampers() {
  return useQuery({
    queryKey: ['campers'],
    queryFn: () => camperService.findAll(),
  })
} 