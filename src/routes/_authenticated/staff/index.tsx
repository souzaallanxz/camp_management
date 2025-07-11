import { createFileRoute } from '@tanstack/react-router'
import { StaffFeature } from '@/features/staff'

export const Route = createFileRoute('/_authenticated/staff/')({
  component: StaffFeature,
}) 