import { createLazyFileRoute } from '@tanstack/react-router'
import { RegistrationsFeature } from '@/features/registrations'

export const Route = createLazyFileRoute('/_authenticated/registrations/')({
  component: RegistrationsFeature,
})
