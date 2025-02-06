import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsBilling from '@/features/settings/billing'

export const Route = createLazyFileRoute('/_authenticated/settings/billing')({
  component: SettingsBilling
}) 