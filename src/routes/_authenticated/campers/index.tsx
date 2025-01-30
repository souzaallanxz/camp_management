import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/campers/')({
  component: () =>
    import('@/features/campers').then((mod) => <mod.CampersFeature />),
}) 