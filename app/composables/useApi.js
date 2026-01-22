/**
 * API Configuration Composable
 * Centralized API configuration for the application
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  
  // Base URL for API calls
  const baseURL = config.public.apiBase || 'https://hospital-queue-api.codewithdanu.my.id/api'
  
  return {
    baseURL
  }
}
