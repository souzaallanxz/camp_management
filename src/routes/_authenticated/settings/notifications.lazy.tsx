import { createLazyFileRoute, redirect } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/settings/notifications')({
  component: () => {
    throw redirect({ to: '/settings' })
  },
})
