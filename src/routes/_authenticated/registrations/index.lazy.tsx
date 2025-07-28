import { createLazyFileRoute } from '@tanstack/react-router'
import RegistrationsPage from '@/features/registrations'

export const Route = createLazyFileRoute('/_authenticated/registrations/')({
  component: RegistrationsPage,
})
