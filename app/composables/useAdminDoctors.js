/**
 * Admin Doctors Composable
 * CRUD operations for Doctor management
 */

// API Endpoints
const ENDPOINTS = {
  LIST: '/v1/admin/doctors',
  CREATE: '/v1/admin/doctors',
  GET: (id) => `/v1/admin/doctors/${id}`,
  UPDATE: (id) => `/v1/admin/doctors/${id}`,
  DELETE: (id) => `/v1/admin/doctors/${id}`
}

export const useAdminDoctors = () => {
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
   * Get all doctors
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getDoctors = async () => {
    try {
      console.log('📡 Fetching doctors list...')
      const response = await fetchWithRetry(ENDPOINTS.LIST, { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data dokter' }
    } catch (err) {
      console.error('Get doctors error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data dokter' }
    }
  }

  /**
   * Get single doctor by ID
   * @param {string} id - Doctor ID
   */
  const getDoctor = async (id) => {
    try {
      console.log('📡 Fetching doctor:', id)
      const response = await fetchWithRetry(ENDPOINTS.GET(id), { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data }
      }
      return { success: false, error: response?.message || 'Gagal memuat data dokter' }
    } catch (err) {
      console.error('Get doctor error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data dokter' }
    }
  }

  /**
   * Create new doctor
   * @param {Object} data - Doctor data { poly_id, name, sip_number, specialization }
   */
  const createDoctor = async (data) => {
    try {
      console.log('➕ Creating doctor:', data)
      const response = await fetchWithRetry(ENDPOINTS.CREATE, {
        method: 'POST',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Dokter berhasil ditambahkan' }
      }
      return { success: false, error: response?.message || 'Gagal menambah dokter' }
    } catch (err) {
      console.error('Create doctor error:', err)
      return { success: false, error: err.data?.message || 'Gagal menambah dokter' }
    }
  }

  /**
   * Update doctor
   * @param {string} id - Doctor ID
   * @param {Object} data - Doctor data to update
   */
  const updateDoctor = async (id, data) => {
    try {
      console.log('✏️ Updating doctor:', id, data)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Dokter berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui dokter' }
    } catch (err) {
      console.error('Update doctor error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui dokter' }
    }
  }

  /**
   * Delete doctor
   * @param {string} id - Doctor ID
   */
  const deleteDoctor = async (id) => {
    try {
      console.log('🗑️ Deleting doctor:', id)
      const response = await fetchWithRetry(ENDPOINTS.DELETE(id), {
        method: 'DELETE'
      })
      
      if (response?.success) {
        return { success: true, message: response.message || 'Dokter berhasil dihapus' }
      }
      return { success: false, error: response?.message || 'Gagal menghapus dokter' }
    } catch (err) {
      console.error('Delete doctor error:', err)
      return { success: false, error: err.data?.message || 'Gagal menghapus dokter' }
    }
  }

  return {
    getDoctors,
    getDoctor,
    createDoctor,
    updateDoctor,
    deleteDoctor
  }
}
