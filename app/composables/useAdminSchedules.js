/**
 * Admin Schedules Composable
 * CRUD operations for Schedule management
 * Note: GET list is done through doctors endpoint (schedules are nested)
 */

// API Endpoints
const ENDPOINTS = {
  CREATE: '/v1/admin/schedules',
  UPDATE: (id) => `/v1/admin/schedules/${id}`,
  DELETE: (id) => `/v1/admin/schedules/${id}`
}

export const useAdminSchedules = () => {
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
   */
  const fetchWithRetry = async (url, options, isRetry = false) => {
    try {
      return await $fetch(url, {
        baseURL,
        ...options,
        headers: buildHeaders(options.includeContentType || false)
      })
    } catch (err) {
      if (err.status === 401 && !isRetry) {
        console.log('🔄 Got 401, attempting token refresh...')
        const refreshed = await refreshToken()
        if (refreshed) {
          return await fetchWithRetry(url, options, true)
        }
      }
      throw err
    }
  }

  /**
   * Get day name from day number
   * @param {number} day - Day of week (1-7, Monday-Sunday)
   */
  const getDayName = (day) => {
    const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    return days[day] || ''
  }

  /**
   * Create new schedule
   * @param {Object} data - Schedule data { doctor_id, day_of_week, start_time, end_time, max_quota }
   */
  const createSchedule = async (data) => {
    try {
      console.log('➕ Creating schedule:', data)
      const response = await fetchWithRetry(ENDPOINTS.CREATE, {
        method: 'POST',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Jadwal berhasil ditambahkan' }
      }
      return { success: false, error: response?.message || 'Gagal menambah jadwal' }
    } catch (err) {
      console.error('Create schedule error:', err)
      return { success: false, error: err.data?.message || 'Gagal menambah jadwal' }
    }
  }

  /**
   * Update schedule
   * @param {string} id - Schedule ID
   * @param {Object} data - Schedule data to update
   */
  const updateSchedule = async (id, data) => {
    try {
      console.log('✏️ Updating schedule:', id, data)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Jadwal berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui jadwal' }
    } catch (err) {
      console.error('Update schedule error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui jadwal' }
    }
  }

  /**
   * Delete schedule
   * @param {string} id - Schedule ID
   */
  const deleteSchedule = async (id) => {
    try {
      console.log('🗑️ Deleting schedule:', id)
      const response = await fetchWithRetry(ENDPOINTS.DELETE(id), {
        method: 'DELETE'
      })
      
      if (response?.success) {
        return { success: true, message: response.message || 'Jadwal berhasil dihapus' }
      }
      return { success: false, error: response?.message || 'Gagal menghapus jadwal' }
    } catch (err) {
      console.error('Delete schedule error:', err)
      return { success: false, error: err.data?.message || 'Gagal menghapus jadwal' }
    }
  }

  return {
    getDayName,
    createSchedule,
    updateSchedule,
    deleteSchedule
  }
}
