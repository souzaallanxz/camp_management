import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/toaster'
import GeneralError from '@/features/errors/general-error'
import NotFoundError from '@/features/errors/not-found-error'
import { AuthProvider } from '@/features/auth/auth-context'
import { lazy, Suspense } from 'react'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => ({
    default: ReactQueryDevtools,
  }))
)

const TanStackRouterDevtools = lazy(() =>
  import('@tanstack/react-router-devtools').then(({ TanStackRouterDevtools }) => ({
    default: TanStackRouterDevtools,
  }))
)

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    return (
      <AuthProvider>
        <Outlet />
        <Toaster />
        {import.meta.env.MODE === 'development' && (
          <Suspense>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </Suspense>
        )}
      </AuthProvider>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
