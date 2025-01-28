import { createLazyFileRoute } from '@tanstack/react-router'
import Registrations from '@/features/registrations'

export const Route = createLazyFileRoute('/_authenticated/registrations/')({
  component: Registrations,
})
