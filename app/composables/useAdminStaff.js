/**
 * Admin Staff Composable
 * CRUD operations for Staff management
 */

// API Endpoints
const ENDPOINTS = {
  LIST: '/v1/admin/staff',
  CREATE: '/v1/admin/staff',
  GET: (id) => `/v1/admin/staff/${id}`,
  UPDATE: (id) => `/v1/admin/staff/${id}`,
  DELETE: (id) => `/v1/admin/staff/${id}`
}

export const useAdminStaff = () => {
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
   * Get all staff
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getStaffList = async () => {
    try {
      console.log('📡 Fetching staff list...')
      const response = await fetchWithRetry(ENDPOINTS.LIST, { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data staff' }
    } catch (err) {
      console.error('Get staff error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data staff' }
    }
  }

  /**
   * Get single staff by ID
   * @param {string} id - Staff ID
   */
  const getStaff = async (id) => {
    try {
      console.log('📡 Fetching staff:', id)
      const response = await fetchWithRetry(ENDPOINTS.GET(id), { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data }
      }
      return { success: false, error: response?.message || 'Gagal memuat data staff' }
    } catch (err) {
      console.error('Get staff error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data staff' }
    }
  }

  /**
   * Create new staff
   * @param {Object} data - Staff data { code, name, username, email, password, poly_id }
   */
  const createStaff = async (data) => {
    try {
      console.log('➕ Creating staff:', data)
      const response = await fetchWithRetry(ENDPOINTS.CREATE, {
        method: 'POST',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Staff berhasil ditambahkan' }
      }
      return { success: false, error: response?.message || 'Gagal menambah staff' }
    } catch (err) {
      console.error('Create staff error:', err)
      return { success: false, error: err.data?.message || 'Gagal menambah staff' }
    }
  }

  /**
   * Update staff
   * @param {string} id - Staff ID
   * @param {Object} data - Staff data to update
   */
  const updateStaff = async (id, data) => {
    try {
      console.log('✏️ Updating staff:', id, data)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Staff berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui staff' }
    } catch (err) {
      console.error('Update staff error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui staff' }
    }
  }

  /**
   * Delete staff
   * @param {string} id - Staff ID
   */
  const deleteStaff = async (id) => {
    try {
      console.log('🗑️ Deleting staff:', id)
      const response = await fetchWithRetry(ENDPOINTS.DELETE(id), {
        method: 'DELETE'
      })
      
      if (response?.success) {
        return { success: true, message: response.message || 'Staff berhasil dihapus' }
      }
      return { success: false, error: response?.message || 'Gagal menghapus staff' }
    } catch (err) {
      console.error('Delete staff error:', err)
      return { success: false, error: err.data?.message || 'Gagal menghapus staff' }
    }
  }

  return {
    getStaffList,
    getStaff,
    createStaff,
    updateStaff,
    deleteStaff
  }
}
