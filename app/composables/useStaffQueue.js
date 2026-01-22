/**
 * Staff Queue Management Composable
 * Handles queue operations: call next, skip, recall, start service, finish service
 * 
 * API Endpoints:
 * - GET    /v1/staff/queue/today           - Get today's queue list
 * - POST   /v1/staff/queue/call-next       - Call next ticket (requires queue_type_id)
 * - POST   /v1/staff/queue/{id}/skip       - Skip current ticket
 * - POST   /v1/staff/queue/{id}/recall     - Recall ticket
 * - POST   /v1/staff/queue/{id}/start-service  - Start serving
 * - POST   /v1/staff/queue/{id}/finish-service - Finish serving
 */

// API Endpoints Constants
const ENDPOINTS = {
  TODAY: '/v1/staff/queue/today',
  SKIPPED: '/v1/staff/queue/skipped',
  CALL_NEXT: '/v1/staff/queue/call-next',
  SKIP: (id) => `/v1/staff/queue/${id}/skip`,
  RECALL: (id) => `/v1/staff/queue/${id}/recall`,
  RECALL_SKIPPED: (id) => `/v1/staff/queue/${id}/recall-skipped`,
  START_SERVICE: (id) => `/v1/staff/queue/${id}/start-service`,
  FINISH_SERVICE: (id) => `/v1/staff/queue/${id}/finish-service`,
  STATS: '/v1/staff/dashboard'
}

export const useStaffQueue = () => {
  const { baseURL } = useApi()
  const { getAuthHeader, refreshToken } = useStaffAuth()
  
  /**
   * Build headers for API requests
   */
  const buildHeaders = (includeContentType = false) => {
    const headers = {
      ...getAuthHeader(),
      'Accept': 'application/json'
    }
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  /**
   * Fetch with auto-retry on 401 Unauthorized
   * Automatically refreshes token and retries the request once
   */
  const fetchWithRetry = async (url, options, isRetry = false) => {
    try {
      return await $fetch(url, {
        baseURL,
        ...options,
        headers: buildHeaders(options.includeContentType || false)
      })
    } catch (err) {
      // If 401 Unauthorized and not already retrying, refresh token and retry
      if (err.status === 401 && !isRetry) {
        console.log('🔄 Got 401, attempting token refresh...')
        const refreshed = await refreshToken()
        
        if (refreshed) {
          console.log('✅ Token refreshed, retrying request...')
          return await fetchWithRetry(url, options, true)
        } else {
          console.log('❌ Token refresh failed, throwing original error')
        }
      }
      throw err
    }
  }

  /**
   * Get today's queue list for staff's assigned poly
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getQueueList = async () => {
    try {
      console.log('📡 Fetching queue list...')

      const response = await fetchWithRetry(ENDPOINTS.TODAY, {
        method: 'GET'
      })
      
      if (response?.success) {
        let queueList = []
        
        // Handle different response structures
        if (Array.isArray(response.data)) {
          queueList = response.data
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Backend may return object with queue IDs as keys
          queueList = Object.values(response.data).flat()
        }
        
        return { success: true, data: queueList }
      }
      
      return { success: false, error: response?.message || 'Failed to fetch queue list' }
    } catch (err) {
      console.error('Get queue list error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat daftar antrian' }
    }
  }

  /**
   * Get skipped queue list
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getSkippedQueue = async () => {
    try {
      console.log('📡 Fetching skipped queue...')

      const response = await fetchWithRetry(ENDPOINTS.SKIPPED, {
        method: 'GET'
      })
      
      if (response?.success) {
        let skippedList = []
        
        if (Array.isArray(response.data)) {
          skippedList = response.data
        } else if (typeof response.data === 'object' && response.data !== null) {
          skippedList = Object.values(response.data).flat()
        }
        
        return { success: true, data: skippedList }
      }
      
      return { success: false, error: response?.message || 'Failed to fetch skipped queue' }
    } catch (err) {
      console.error('Get skipped queue error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat daftar antrian terlewat' }
    }
  }
  
  /**
   * Get queue_type_id from waiting tickets
   * @returns {Promise<string|null>}
   */
  const getQueueTypeIdFromQueue = async () => {
    const result = await getQueueList()
    if (result.success && result.data.length > 0) {
      return result.data[0].queue_type_id
    }
    return null
  }

  /**
   * Call next ticket in queue
   * Requires queue_type_id from existing tickets
   * @returns {Promise<{success: boolean, data?: Object, message?: string, error?: string}>}
   */
  const callNext = async () => {
    try {
      const queueTypeId = await getQueueTypeIdFromQueue()
      
      console.log('📞 Calling next for queue_type_id:', queueTypeId)

      if (!queueTypeId) {
        return { success: false, error: 'Tidak ada antrian untuk dipanggil' }
      }

      const response = await fetchWithRetry(ENDPOINTS.CALL_NEXT, {
        method: 'POST',
        includeContentType: true,
        body: { queue_type_id: queueTypeId }
      })
      
      if (response?.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Nomor berhasil dipanggil'
        }
      }
      
      return { success: false, error: response?.message || 'Gagal memanggil nomor' }
    } catch (err) {
      console.error('Call next error:', err)
      if (err.data) console.error('Error details:', err.data)
      return {
        success: false,
        error: err.data?.message || err.message || 'Gagal memanggil nomor berikutnya'
      }
    }
  }
  
  /**
   * Skip current ticket
   * Skipped ticket goes to the back of the queue
   * @param {string} ticketId - Ticket ID to skip
   */
  const skipTicket = async (ticketId) => {
    try {
      console.log('⏭️ Skipping ticket:', ticketId)
      
      const response = await fetchWithRetry(ENDPOINTS.SKIP(ticketId), {
        method: 'POST'
      })
      
      if (response?.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Nomor berhasil dilewati'
        }
      }
      
      return { success: false, error: response?.message || 'Gagal melewati nomor' }
    } catch (err) {
      console.error('Skip ticket error:', err)
      return { success: false, error: err.data?.message || 'Gagal melewati nomor' }
    }
  }
  
  /**
   * Recall ticket - call the same ticket again
   * @param {string} ticketId - Ticket ID to recall
   */
  const recallTicket = async (ticketId) => {
    try {
      console.log('🔄 Recalling ticket:', ticketId)
      
      const response = await fetchWithRetry(ENDPOINTS.RECALL(ticketId), {
        method: 'POST'
      })
      
      if (response?.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Nomor berhasil dipanggil ulang'
        }
      }
      
      return { success: false, error: response?.message || 'Gagal memanggil ulang' }
    } catch (err) {
      console.error('Recall ticket error:', err)
      // Log detailed error from backend
      if (err.data) {
        console.error('❌ Recall error details:', JSON.stringify(err.data, null, 2))
      }
      return { success: false, error: err.data?.message || 'Gagal memanggil ulang nomor' }
    }
  }
  
  /**
   * Start service for ticket
   * Changes status from CALLED to SERVING
   * @param {string} ticketId - Ticket ID to start service
   */
  const startService = async (ticketId) => {
    try {
      console.log('▶️ Starting service for ticket:', ticketId)
      
      const response = await fetchWithRetry(ENDPOINTS.START_SERVICE(ticketId), {
        method: 'POST'
      })
      
      if (response?.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Mulai melayani pasien'
        }
      }
      
      return { success: false, error: response?.message || 'Gagal memulai layanan' }
    } catch (err) {
      console.error('Start service error:', err)
      if (err.data) {
        console.error('❌ Start service error details:', JSON.stringify(err.data, null, 2))
      }
      return { success: false, error: err.data?.message || 'Gagal memulai layanan' }
    }
  }
  
  /**
   * Finish/Complete service for ticket
   * Changes status from SERVING to DONE
   * @param {string} ticketId - Ticket ID to complete
   */
  const finishService = async (ticketId) => {
    try {
      console.log('✅ Finishing service for ticket:', ticketId)
      
      const response = await fetchWithRetry(ENDPOINTS.FINISH_SERVICE(ticketId), {
        method: 'POST'
      })
      
      if (response?.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Layanan selesai'
        }
      }
      
      return { success: false, error: response?.message || 'Gagal menyelesaikan layanan' }
    } catch (err) {
      console.error('Finish service error:', err)
      return { success: false, error: err.data?.message || 'Gagal menyelesaikan layanan' }
    }
  }
  
  /**
   * Recall a skipped ticket - changes status from SKIPPED to WAITING
   * Adds ticket to the bottom of the waiting queue
   * @param {string} ticketId - Ticket ID to recall
   */
  const recallSkippedTicket = async (ticketId) => {
    try {
      console.log('🔄 Recalling skipped ticket:', ticketId)
      
      const response = await fetchWithRetry(ENDPOINTS.RECALL_SKIPPED(ticketId), {
        method: 'POST'
      })
      
      if (response?.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Nomor berhasil dikembalikan ke antrian'
        }
      }
      
      return { success: false, error: response?.message || 'Gagal mengembalikan ke antrian' }
    } catch (err) {
      console.error('Recall skipped ticket error:', err)
      if (err.data) {
        console.error('❌ Recall skipped error details:', JSON.stringify(err.data, null, 2))
      }
      return { success: false, error: err.data?.message || 'Gagal mengembalikan nomor ke antrian' }
    }
  }

  /**
   * Get dashboard statistics
   */
  const getDashboardStats = async () => {
    try {
      console.log('📊 Fetching dashboard stats...')
      const response = await fetchWithRetry(ENDPOINTS.STATS, { method: 'GET' })
      
      if (response?.success) {
        // Parse complex structure from API
        // Structure: { staff: { poly: {...} }, dashboard: [ { total_today, waiting, ... } ] }
        const rawData = response.data
        const statsData = rawData.dashboard?.[0] || {}
        const polyData = rawData.staff?.poly || {}
        
        return { 
          success: true, 
          data: {
            total_today: statsData.total_today || 0,
            waiting: statsData.waiting || 0,
            serving: statsData.serving || 0,
            done: statsData.done || 0,
            avg_waiting_time: Math.round(statsData.avg_waiting_time || 0),
            poly_name: polyData.name || 'Poli',
            poly_status: polyData.is_active ? 'active' : 'inactive'
          }
        }
      }
      
      return { success: false, error: response?.message || 'Gagal memuat statistik' }
    } catch (err) {
      console.error('Get stats error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat statistik' }
    }
  }
  
  return {
    getQueueList,
    getSkippedQueue,
    callNext,
    skipTicket,
    recallTicket,
    recallSkippedTicket,
    startService,
    finishService,
    getDashboardStats
  }
}
