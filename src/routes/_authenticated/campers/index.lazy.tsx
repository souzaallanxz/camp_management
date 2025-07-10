import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/campers/')({
  component: () =>
    import('@/features/campers').then((mod) => <mod.default />),
}) 