import { createLazyFileRoute } from '@tanstack/react-router'
import { IntegrationsFeature } from '@/features/integrations'

export const Route = createLazyFileRoute('/_authenticated/integrations/')({
  component: IntegrationsFeature,
}) 