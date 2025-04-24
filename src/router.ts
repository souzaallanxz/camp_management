import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

// Create a new query client
const queryClient = new QueryClient()

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
} 