import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/staff/')({
  component: () =>
    import('@/features/staff').then((mod) => <mod.default />),
}) 