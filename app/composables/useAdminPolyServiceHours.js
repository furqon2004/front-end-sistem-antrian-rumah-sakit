export const useAdminPolyServiceHours = () => {
  const { baseURL } = useApi()
  const { getAuthHeader, refreshToken } = useAdminAuth()

  // API Endpoints
  const ENDPOINT = '/v1/admin/poly-service-hours'

  // Build headers
  const buildHeaders = () => {
    return {
      ...getAuthHeader(),
      'Accept': 'application/json'
    }
  }

  // Fetch Wrapper with Retry
  const fetchWithRetry = async (url, options, isRetry = false) => {
    try {
      return await $fetch(url, {
        baseURL,
        ...options,
        headers: buildHeaders()
      })
    } catch (err) {
      if (err.status === 401 && !isRetry) {
        const refreshed = await refreshToken()
        if (refreshed) {
          return await fetchWithRetry(url, options, true)
        }
      }
      throw err
    }
  }

  // Get service hours for a specific poly
  // Note: The API might require filtering by poly_id if the main endpoint returns all
  // Based on standard REST, we might need to filter client-side or pass query param
  const getServiceHours = async (polyId) => {
    try {
      const response = await fetchWithRetry(ENDPOINT, { method: 'GET' })
      
      if (response?.success) {
        let data = response.data
        // If polyId provided, filter the results
        if (polyId && Array.isArray(data)) {
          data = data.filter(item => item.poly_id === polyId)
        }
        return { success: true, data }
      }
      return { success: false, error: response?.message || 'Gagal memuat jam layanan' }
    } catch (err) {
      console.error('Get service hours error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat jam layanan' }
    }
  }

  // Create service hour
  const createServiceHour = async (data) => {
    try {
      const response = await fetchWithRetry(ENDPOINT, {
        method: 'POST',
        body: data
      })

      if (response?.success) {
        return { success: true, data: response.data, message: 'Jam layanan berhasil ditambahkan' }
      }
      return { success: false, error: response?.message || 'Gagal menambahkan jam layanan' }
    } catch (err) {
      console.error('Create service hour error:', err)
      return { success: false, error: err.data?.message || 'Gagal menambahkan jam layanan' }
    }
  }

  // Update service hour
  const updateServiceHour = async (id, data) => {
    try {
      const response = await fetchWithRetry(`${ENDPOINT}/${id}`, {
        method: 'PUT',
        body: data
      })

      if (response?.success) {
        return { success: true, data: response.data, message: 'Jam layanan berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui jam layanan' }
    } catch (err) {
      console.error('Update service hour error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui jam layanan' }
    }
  }

  // Delete service hour
  const deleteServiceHour = async (id) => {
    try {
      const response = await fetchWithRetry(`${ENDPOINT}/${id}`, {
        method: 'DELETE'
      })

      if (response?.success) {
        return { success: true, message: 'Jam layanan berhasil dihapus' }
      }
      return { success: false, error: response?.message || 'Gagal menghapus jam layanan' }
    } catch (err) {
      console.error('Delete service hour error:', err)
      return { success: false, error: err.data?.message || 'Gagal menghapus jam layanan' }
    }
  }

  return {
    getServiceHours,
    createServiceHour,
    updateServiceHour,
    deleteServiceHour
  }
}
