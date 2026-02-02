/**
 * API Configuration Composable
 * Centralized API configuration for the application
 * 
 * Uses Nitro proxy to avoid CORS issues:
 * - All requests to /api/** are proxied to the backend API
 * - This works both locally and in production (Vercel)
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  
  // Base URL for API calls - uses proxy path
  // Nitro will proxy /api/** to https://hospital-queue-api.codewithdanu.my.id/api/**
  // Force use of /api proxy path to avoid CORS issues
  // This ignores any environment variables that might set full URL erroneously
  const baseURL = '/api'
  
  return {
    baseURL
  }
}
