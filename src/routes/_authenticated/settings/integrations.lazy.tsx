import { createLazyFileRoute } from '@tanstack/react-router'
import IntegrationsSettings from '@/features/settings/integrations'

export const Route = createLazyFileRoute('/_authenticated/settings/integrations')({
  component: IntegrationsSettings
}) 