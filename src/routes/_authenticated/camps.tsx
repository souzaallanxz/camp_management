import { createFileRoute } from '@tanstack/react-router'
import CampsPage from '@/features/camps'

export const Route = createFileRoute('/_authenticated/camps')({
  component: CampsPage,
}) 