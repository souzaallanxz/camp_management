import CampersPage from '@/features/campers'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/campers/')({
  component: CampersPage,
}) 