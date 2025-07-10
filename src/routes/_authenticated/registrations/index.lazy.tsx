import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/registrations/')({
  component: () =>
    import('@/features/registrations').then((mod) => <mod.default />),
})
