import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/registrations/')({
  beforeLoad: () => {
    // Optional: Add any authentication or data loading logic here
  },
}) 