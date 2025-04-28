import { createFileRoute } from '@tanstack/react-router'
import SetupPassword from '@/features/auth/setup-password/index'

export const Route = createFileRoute('/(auth)/setup-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    userId: search.userId as string,
  }),
  component: SetupPassword,
}) 