import { StrictMode } from 'react'

import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { handleServerError } from '@/utils/handle-server-error'
import { toast } from '@/hooks/use-toast'
import { ThemeProvider } from './context/theme-context'
import './index.css'
// Generated Routes
import { routeTree } from './routeTree.gen'

// Criar QueryClient com configurações para evitar cache desnecessário nos endpoints
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Limitar tentativas
        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 1 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403, 408, 429].includes(error.response?.status ?? 0)
        )
      },
      // Configurações padrão para não-dashboard
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 segundos para páginas regulares
      gcTime: 5 * 60 * 1000, // 5 minutos
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Fazer requisições sempre que houver rede
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Ignorar 304
        if (error instanceof AxiosError && error.response?.status === 304) {
          return
        }
        
        handleServerError(error)
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        // Ignorar 304
        if (error.response?.status === 304) {
          return
        }
        
        if (error.response?.status === 401) {
          toast({
            variant: 'destructive',
            title: 'Session expired!',
          })
          useAuthStore.getState().auth.reset()
          router.navigate({ to: '/sign-in' })
        }
        if (error.response?.status === 500) {
          toast({
            variant: 'destructive',
            title: 'Internal Server Error!',
          })
          router.navigate({ to: '/500' })
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
        if (error.response?.status === 408 || error.code === 'ECONNABORTED') {
          toast({
            variant: 'destructive',
            title: 'Falha na conexão',
            description: 'O servidor demorou muito para responder. Tente novamente mais tarde.'
          })
        }
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
