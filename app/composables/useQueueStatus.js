/**
 * Queue Status Composable
 * Fetches real-time queue status from the backend API
 * NOTE: Disabled for hospital-queue-api.codewithdanu.my.id as endpoint doesn't exist
 */
export const useQueueStatus = () => {
  // Return empty reactive data since endpoint /v1/customer/info/queue-status doesn't exist on this API
  const queueStatus = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  const refresh = async () => {
    // Endpoint doesn't exist on current API, so just return empty
    console.log('⚠️ Queue status endpoint not available on this API')
    return []
  }
  
  return {
    queueStatus,
    loading,
    error,
    refresh
  }
}
