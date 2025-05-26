import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/integrations/')({
  beforeLoad: () => {
    // Optional: Add any authentication or data loading logic here
  },
}) 