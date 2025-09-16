// Configuração centralizada de URLs da API
export const API_URLS = {
  // URL base da API
  BASE: import.meta.env.DEV 
    ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    : 'https://api.campy.pt/api',
  
  // URLs específicas
  HEALTH: import.meta.env.DEV 
    ? 'http://localhost:3001/api/health'
    : 'https://api.campy.pt/api/health',
    
  EMAIL: import.meta.env.DEV 
    ? 'http://localhost:3001/api/send-email'
    : 'https://api.campy.pt/api/send-email',
} as const

// Helper para construir URLs da API
export function buildApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  // Remove /api prefix if present
  const finalPath = cleanPath.startsWith('api/') ? cleanPath.slice(4) : cleanPath
  
  return `${API_URLS.BASE}/${finalPath}`
}

// Constantes de ambiente
export const IS_DEVELOPMENT = import.meta.env.DEV
export const IS_PRODUCTION = !import.meta.env.DEV 