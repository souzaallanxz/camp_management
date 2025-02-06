import { createLazyFileRoute } from '@tanstack/react-router'
import OrganizationSettings from '@/features/settings/organization'

export const Route = createLazyFileRoute('/_authenticated/settings/organization')({
  component: OrganizationSettings
}) 