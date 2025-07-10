import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/integrations/')({
  component: () =>
    import('@/features/integrations').then((mod) => <mod.default />),
}) 