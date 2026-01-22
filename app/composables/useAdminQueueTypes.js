/**
 * Admin Queue Types Composable
 * CRUD operations for Queue Types (Jenis Antrian) management
 */

// API Endpoints
const ENDPOINTS = {
  LIST: '/v1/admin/queue-types',
  CREATE: '/v1/admin/queue-types',
  GET: (id) => `/v1/admin/queue-types/${id}`,
  UPDATE: (id) => `/v1/admin/queue-types/${id}`,
  DELETE: (id) => `/v1/admin/queue-types/${id}`
}

export const useAdminQueueTypes = () => {
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
   * Get all queue types
   */
  const getQueueTypes = async () => {
    try {
      console.log('📡 Fetching queue types list...')
      const response = await fetchWithRetry(ENDPOINTS.LIST, { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data jenis antrian' }
    } catch (err) {
      console.error('Get queue types error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data jenis antrian' }
    }
  }

  /**
   * Get single queue type by ID
   */
  const getQueueType = async (id) => {
    try {
      console.log('📡 Fetching queue type:', id)
      const response = await fetchWithRetry(ENDPOINTS.GET(id), { method: 'GET' })
      
      if (response?.success) {
        return { success: true, data: response.data }
      }
      return { success: false, error: response?.message || 'Gagal memuat data jenis antrian' }
    } catch (err) {
      console.error('Get queue type error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat data jenis antrian' }
    }
  }

  /**
   * Create new queue type
   * @param {Object} data - { name, code_prefix, poly_id, service_unit, avg_service_minutes, is_active }
   */
  const createQueueType = async (data) => {
    try {
      console.log('➕ Creating queue type:', data)
      const response = await fetchWithRetry(ENDPOINTS.CREATE, {
        method: 'POST',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Jenis antrian berhasil ditambahkan' }
      }
      return { success: false, error: response?.message || 'Gagal menambah jenis antrian' }
    } catch (err) {
      console.error('Create queue type error:', err)
      return { success: false, error: err.data?.message || 'Gagal menambah jenis antrian' }
    }
  }

  /**
   * Update queue type
   */
  const updateQueueType = async (id, data) => {
    try {
      console.log('✏️ Updating queue type:', id, data)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        includeContentType: true,
        body: data
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Jenis antrian berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui jenis antrian' }
    } catch (err) {
      console.error('Update queue type error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui jenis antrian' }
    }
  }

  /**
   * Delete queue type
   */
  const deleteQueueType = async (id) => {
    try {
      console.log('🗑️ Deleting queue type:', id)
      const response = await fetchWithRetry(ENDPOINTS.DELETE(id), {
        method: 'DELETE'
      })
      
      if (response?.success) {
        return { success: true, message: response.message || 'Jenis antrian berhasil dihapus' }
      }
      return { success: false, error: response?.message || 'Gagal menghapus jenis antrian' }
    } catch (err) {
      console.error('Delete queue type error:', err)
      return { success: false, error: err.data?.message || 'Gagal menghapus jenis antrian' }
    }
  }

  return {
    getQueueTypes,
    getQueueType,
    createQueueType,
    updateQueueType,
    deleteQueueType
  }
}
