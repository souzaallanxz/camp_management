import { createLazyFileRoute, redirect } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/settings/display')({
  component: () => {
    throw redirect({ to: '/settings' })
  },
})
