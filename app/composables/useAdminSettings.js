/**
 * Admin System Settings Composable
 * CRUD operations for System Settings management
 */

// API Endpoints
const ENDPOINTS = {
  LIST: '/v1/admin/system-settings',
  UPDATE: '/v1/admin/system-settings',
  GET: (key) => `/v1/admin/system-settings/${key}`,
  UPDATE_KEY: (key) => `/v1/admin/system-settings/${key}`
}

export const useAdminSettings = () => {
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
  const fetchWithRetry = async (url, options = {}, isRetry = false) => {
    try {
      const response = await fetch(`${baseURL}${url}`, {
        ...options,
        headers: buildHeaders(options.includeContentType || false)
      })
      
      if (!response.ok) {
        if (response.status === 401 && !isRetry) {
          console.log('🔄 Got 401, attempting token refresh...')
          const refreshed = await refreshToken()
          if (refreshed) {
            return await fetchWithRetry(url, options, true)
          }
        }
        const errorData = await response.json().catch(() => ({}))
        throw { status: response.status, data: errorData }
      }
      
      return await response.json()
    } catch (err) {
      console.error('Fetch error:', err)
      throw err
    }
  }

  /**
   * Get all system settings
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const getSettings = async () => {
    try {
      console.log('📡 Fetching system settings...')
      const response = await fetchWithRetry(ENDPOINTS.LIST)
      
      if (response?.success) {
        return { success: true, data: response.data || {} }
      }
      return { success: false, error: response?.message || 'Gagal memuat pengaturan' }
    } catch (err) {
      console.error('Get settings error:', err)
      return { success: false, error: err.data?.message || 'Gagal memuat pengaturan' }
    }
  }

  /**
   * Update system settings (bulk update)
   * @param {Array} settings - Array of { key, value } objects
   */
  const updateSettings = async (settings) => {
    try {
      console.log('✏️ Updating settings:', settings)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE, {
        method: 'PUT',
        includeContentType: true,
        body: JSON.stringify({ settings })
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Pengaturan berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui pengaturan' }
    } catch (err) {
      console.error('Update settings error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui pengaturan' }
    }
  }

  /**
   * Update single setting by key
   * @param {string} key - Setting key
   * @param {string} value - New value
   */
  const updateSetting = async (key, value) => {
    try {
      console.log('✏️ Updating setting:', key, value)
      const response = await fetchWithRetry(ENDPOINTS.UPDATE_KEY(key), {
        method: 'PUT',
        includeContentType: true,
        body: JSON.stringify({ value })
      })
      
      if (response?.success) {
        return { success: true, data: response.data, message: response.message || 'Pengaturan berhasil diperbarui' }
      }
      return { success: false, error: response?.message || 'Gagal memperbarui pengaturan' }
    } catch (err) {
      console.error('Update setting error:', err)
      return { success: false, error: err.data?.message || 'Gagal memperbarui pengaturan' }
    }
  }

  return {
    getSettings,
    updateSettings,
    updateSetting
  }
}
