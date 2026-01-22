/**
 * Admin Reports Composable
 * Fetch reports data from various endpoints
 */

// API Endpoints
const ENDPOINTS = {
  STATISTICS: '/v1/admin/reports/statistics',
  BUSIEST_POLYS: '/v1/admin/reports/busiest-polys',
  BUSIEST_HOURS: '/v1/admin/reports/busiest-hours',
  DAILY_COUNT: '/v1/admin/reports/daily-count',
  WAITING_TIME_TREND: '/v1/admin/reports/waiting-time-trend'
}

export const useAdminReports = () => {
  const { baseURL } = useApi()
  const { getAuthHeader, refreshToken } = useStaffAuth()

  /**
   * Build headers for API requests
   */
  const buildHeaders = () => {
    return {
      ...getAuthHeader(),
      'Accept': 'application/json'
    }
  }

  /**
   * Fetch with auto-retry on 401 Unauthorized
   */
  const fetchWithRetry = async (url, options = {}, isRetry = false) => {
    try {
      const response = await fetch(`${baseURL}${url}`, {
        ...options,
        headers: buildHeaders()
      })
      
      if (!response.ok) {
        if (response.status === 401 && !isRetry) {
          console.log('🔄 Got 401, attempting token refresh...')
          const refreshed = await refreshToken()
          if (refreshed) {
            return await fetchWithRetry(url, options, true)
          }
        }
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (err) {
      console.error('Fetch error:', err)
      throw err
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  const formatDate = (date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Get statistics report
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const getStatistics = async (startDate, endDate) => {
    try {
      console.log('📊 Fetching statistics report...')
      const params = `?start_date=${startDate}&end_date=${endDate}`
      const response = await fetchWithRetry(`${ENDPOINTS.STATISTICS}${params}`)
      
      if (response?.success) {
        return { success: true, data: response.data }
      }
      return { success: false, error: response?.message || 'Gagal memuat statistik' }
    } catch (err) {
      console.error('Get statistics error:', err)
      return { success: false, error: 'Gagal memuat statistik' }
    }
  }

  /**
   * Get busiest polys report
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const getBusiestPolys = async (startDate, endDate) => {
    try {
      console.log('📊 Fetching busiest polys report...')
      const params = `?start_date=${startDate}&end_date=${endDate}`
      const response = await fetchWithRetry(`${ENDPOINTS.BUSIEST_POLYS}${params}`)
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data poli tersibuk' }
    } catch (err) {
      console.error('Get busiest polys error:', err)
      return { success: false, error: 'Gagal memuat data poli tersibuk' }
    }
  }

  /**
   * Get busiest hours report
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const getBusiestHours = async (startDate, endDate) => {
    try {
      console.log('📊 Fetching busiest hours report...')
      const params = `?start_date=${startDate}&end_date=${endDate}`
      const response = await fetchWithRetry(`${ENDPOINTS.BUSIEST_HOURS}${params}`)
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data jam tersibuk' }
    } catch (err) {
      console.error('Get busiest hours error:', err)
      return { success: false, error: 'Gagal memuat data jam tersibuk' }
    }
  }

  /**
   * Get daily count report
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const getDailyCount = async (startDate, endDate) => {
    try {
      console.log('📊 Fetching daily count report...')
      const params = `?start_date=${startDate}&end_date=${endDate}`
      const response = await fetchWithRetry(`${ENDPOINTS.DAILY_COUNT}${params}`)
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat data harian' }
    } catch (err) {
      console.error('Get daily count error:', err)
      return { success: false, error: 'Gagal memuat data harian' }
    }
  }

  /**
   * Get waiting time trend report
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const getWaitingTimeTrend = async (startDate, endDate) => {
    try {
      console.log('📊 Fetching waiting time trend report...')
      const params = `?start_date=${startDate}&end_date=${endDate}`
      const response = await fetchWithRetry(`${ENDPOINTS.WAITING_TIME_TREND}${params}`)
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      return { success: false, error: response?.message || 'Gagal memuat tren waktu tunggu' }
    } catch (err) {
      console.error('Get waiting time trend error:', err)
      return { success: false, error: 'Gagal memuat tren waktu tunggu' }
    }
  }

  /**
   * Get all reports at once
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const getAllReports = async (startDate, endDate) => {
    const [statistics, busiestPolys, busiestHours, dailyCount, waitingTimeTrend] = await Promise.all([
      getStatistics(startDate, endDate),
      getBusiestPolys(startDate, endDate),
      getBusiestHours(startDate, endDate),
      getDailyCount(startDate, endDate),
      getWaitingTimeTrend(startDate, endDate)
    ])

    return {
      statistics,
      busiestPolys,
      busiestHours,
      dailyCount,
      waitingTimeTrend
    }
  }

  return {
    formatDate,
    getStatistics,
    getBusiestPolys,
    getBusiestHours,
    getDailyCount,
    getWaitingTimeTrend,
    getAllReports
  }
}
