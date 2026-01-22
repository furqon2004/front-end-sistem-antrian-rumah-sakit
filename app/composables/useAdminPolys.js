/**
 * Admin Polys Composable
 * CRUD operations for Poliklinik (Poly) management
 */

// API Endpoints
const ENDPOINTS = {
  LIST: '/v1/admin/polys',
  CREATE: '/v1/admin/polys',
  GET: (id) => `/v1/admin/polys/${id}`,
  UPDATE: (id) => `/v1/admin/polys/${id}`,
  DELETE: (id) => `/v1/admin/polys/${id}`
}

export const useAdminPolys = () => {
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
   * Get all polys
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getPolys = async () => {
    try {
      console.log('📡 Fetching polys list...')
      const response = await fetchWithRetry(ENDPOINTS.LIST, { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data poli' }
    } catch (err) {
      console.error('Get polys error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data poli' }
    }
  }

  /**
   * Get single poly by ID
   * @param {string} id - Poly ID
   */
  const getPoly = async (id) => {
    try {
      console.log('📡 Fetching poly:', id)
      const response = await fetchWithRetry(ENDPOINTS.GET(id), { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data }
      }
      return { success: false, error: response?.message || 'Gagal memuat data poli' }
    } catch (err) {
      console.error('Get poly error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data poli' }
    }
  }

  /**
   * Create new poly
   * @param {Object} data - Poly data { code, name, location, is_active }
   */
  const createPoly = async (data) => {
    try {
      console.log('➕ Creating poly:', data)
      const response = await fetchWithRetry(ENDPOINTS.CREATE, {
        method: 'POST',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Poli berhasil ditambahkan' }
      }
      return { success: false, error: response?.message || 'Gagal menambah poli' }
    } catch (err) {
      console.error('Create poly error:', err)
      return { success: false, error: err.data?.message || 'Gagal menambah poli' }
    }
  }

  /**
   * Update poly
   * @param {string} id - Poly ID
   * @param {Object} data - Poly data to update
   */
  const updatePoly = async (id, data) => {
    try {
      console.log('✏️ Updating poly:', id, data)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Poli berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui poli' }
    } catch (err) {
      console.error('Update poly error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui poli' }
    }
  }

  /**
   * Delete poly
   * @param {string} id - Poly ID
   */
  const deletePoly = async (id) => {
    try {
      console.log('🗑️ Deleting poly:', id)
      const response = await fetchWithRetry(ENDPOINTS.DELETE(id), {
        method: 'DELETE'
      })
      
      if (response?.success) {
        return { success: true, message: response.message || 'Poli berhasil dihapus' }
      }
      return { success: false, error: response?.message || 'Gagal menghapus poli' }
    } catch (err) {
      console.error('Delete poly error:', err)
      return { success: false, error: err.data?.message || 'Gagal menghapus poli' }
    }
  }

  return {
    getPolys,
    getPoly,
    createPoly,
    updatePoly,
    deletePoly
  }
}
