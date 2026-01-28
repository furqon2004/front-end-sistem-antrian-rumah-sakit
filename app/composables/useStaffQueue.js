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
  DOCTORS: '/v1/customer/info/doctors', // Use customer endpoint to get doctors with schedules
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
   * Get doctors list for staff's assigned poly (today's schedule)
   * @param {string} polyId - Poly ID to filter doctors
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getDoctorsList = async (polyId = null) => {
    try {
      console.log('👨‍⚕️ Fetching doctors list...')
      
      // Fetch from customer info endpoint (public)
      const response = await $fetch(ENDPOINTS.DOCTORS, {
        baseURL,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (response?.success && response?.data) {
        let doctors = response.data
        
        // Filter by poly if provided
        if (polyId) {
          doctors = doctors.filter(d => d.poly_id === polyId)
        }
        
        // Get today's day of week (1=Mon, ..., 7=Sun)
        const today = new Date().getDay()
        const dayOfWeek = today === 0 ? 7 : today
        
        // Filter doctors who have schedule today and add schedule info
        const doctorsWithTodaySchedule = doctors
          .filter(doc => {
            if (!doc.schedules || !Array.isArray(doc.schedules)) return false
            return doc.schedules.some(s => s.day_of_week === dayOfWeek)
          })
          .map(doc => {
            const todaySchedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
            return {
              id: doc.id,
              name: doc.name,
              specialization: doc.specialization,
              poly_id: doc.poly_id,
              poly_name: doc.poly?.name,
              schedule: todaySchedule ? {
                start_time: todaySchedule.start_time,
                end_time: todaySchedule.end_time,
                max_quota: todaySchedule.max_quota,
                remaining_quota: todaySchedule.remaining_quota
              } : null
            }
          })
        
        console.log(`👨‍⚕️ Found ${doctorsWithTodaySchedule.length} doctors with today's schedule`)
        return { success: true, data: doctorsWithTodaySchedule }
      }
      
      return { success: false, error: 'Failed to fetch doctors' }
    } catch (err) {
      console.error('Get doctors list error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat daftar dokter' }
    }
  }

  /**
   * Call next ticket in queue
   * Requires queue_type_id from existing tickets
   * Optionally accepts doctorId to call next for specific doctor
   * @param {string|null} doctorId - Optional doctor ID to call next for specific doctor
   * @returns {Promise<{success: boolean, data?: Object, message?: string, error?: string}>}
   */
  const callNext = async (doctorId = null) => {
    try {
      const queueTypeId = await getQueueTypeIdFromQueue()
      
      console.log('📞 Calling next for queue_type_id:', queueTypeId, 'doctor_id:', doctorId)

      if (!queueTypeId) {
        return { success: false, error: 'Tidak ada antrian untuk dipanggil' }
      }

      // Build request body with optional doctor_id
      const body = { queue_type_id: queueTypeId }
      if (doctorId) {
        body.doctor_id = doctorId
      }

      const response = await fetchWithRetry(ENDPOINTS.CALL_NEXT, {
        method: 'POST',
        includeContentType: true,
        body: body
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
            // Calculate total_today as waiting + serving + done (excluding cancelled)
            total_today: (statsData.waiting || 0) + (statsData.serving || 0) + (statsData.done || 0),
            waiting: statsData.waiting || 0,
            serving: statsData.serving || 0,
            done: statsData.done || 0,
            avg_waiting_time: Math.round(statsData.avg_waiting_time || 0),
            poly_id: polyData.id || null, // Staff's assigned poly ID
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
    getDoctorsList,
    callNext,
    skipTicket,
    recallTicket,
    recallSkippedTicket,
    startService,
    finishService,
    getDashboardStats
  }
}
