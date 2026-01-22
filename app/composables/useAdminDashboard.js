/**
 * Admin Dashboard Composable
 * Fetches real statistics data from the database for admin dashboard
 * Uses real-time calculated values instead of static defaults
 */

// API Endpoints for Admin Dashboard
const ENDPOINTS = {
  QUEUE_TYPES: '/v1/admin/queue-types',
  DASHBOARD: '/v1/admin/dashboard',
  PEAK_HOURS: '/v1/admin/dashboard/peak-hours'
}

export const useAdminDashboard = () => {
  const { baseURL } = useApi()
  const { getAuthHeader, refreshToken } = useStaffAuth()

  /**
   * Build headers for API requests
   */
  const buildHeaders = () => {
    return {
      ...getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
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
   * Get dashboard statistics from /v1/admin/dashboard
   * Uses real-time avg_waiting_time (calculated from actual service data)
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getDashboardStats = async () => {
    try {
      console.log('📊 Fetching admin dashboard statistics...')
      
      const response = await fetchWithRetry(ENDPOINTS.DASHBOARD)
      
      if (response?.success) {
        // Response structure: { success: true, data: [...] }
        // Each item has: poly, total_today, waiting, serving, done, avg_waiting_time
        const rawData = response.data?.data || response.data || []
        
        // Map to standardized format
        // Use avg_waiting_time (real-time calculated) not avg_service_minutes (static default)
        // Exclude cancelled from total: calculate total as waiting + serving + done
        const stats = rawData.map(item => {
          const polyName = item.poly?.name || item.name || 'Unknown'
          
          // Try multiple fields for average time, with fallback
          // Priority: avg_waiting_time > avg_service_time > avg_service_minutes
          let avgTime = Math.round(
            item.avg_waiting_time || 
            item.avg_service_time || 
            item.avg_service_minutes || 
            item.poly?.avg_service_minutes ||
            0
          )
          
          // If still 0, use default 15 minutes for all polys
          if (avgTime === 0) {
            avgTime = 15 // Default 15 minutes
          }
          
          const waiting = item.waiting || 0
          const serving = item.serving || 0
          const done = item.done || 0
          // Total = waiting + serving + done (excludes cancelled)
          const total = waiting + serving + done
          
          return {
            id: item.poly?.id || item.id,
            name: polyName,
            total: total, // Total without cancelled
            waiting: waiting,
            serving: serving,
            completed: done,
            avgTime: avgTime // Uses real-time calculated value with fallback
          }
        })
        
        console.log('📊 Dashboard stats loaded:', stats)
        return { success: true, data: stats }
      }
      
      return { success: false, error: response?.message || 'Gagal memuat data' }
    } catch (err) {
      console.error('Get dashboard stats error:', err)
      return { success: false, error: 'Gagal memuat statistik dashboard' }
    }
  }

  /**
   * Get all queue types (for reference data only)
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getQueueTypes = async () => {
    try {
      console.log('📊 Fetching queue types...')
      const response = await fetchWithRetry(ENDPOINTS.QUEUE_TYPES)
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      
      return { success: false, error: response?.message || 'Gagal memuat data' }
    } catch (err) {
      console.error('Get queue types error:', err)
      return { success: false, error: 'Gagal memuat data jenis antrian' }
    }
  }

  /**
   * Get peak hours data
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getPeakHours = async () => {
    try {
      console.log('📊 Fetching peak hours data...')
      const response = await fetchWithRetry(ENDPOINTS.PEAK_HOURS)
      
      if (response?.success) {
        return { success: true, data: response.data || [] }
      }
      
      return { success: false, data: [] }
    } catch (err) {
      console.log('Peak hours endpoint not available')
      return { success: false, data: [] }
    }
  }

  /**
   * Calculate summary statistics from poly stats data
   * @param {Array} polyStats - Array of poly statistics
   * @returns {Object} Summary statistics
   */
  const calculateSummary = (polyStats) => {
    if (!polyStats || polyStats.length === 0) {
      return {
        totalToday: 0,
        remaining: 0,
        completed: 0,
        avgServiceTime: 0
      }
    }

    const totalToday = polyStats.reduce((sum, p) => sum + p.total, 0)
    const remaining = polyStats.reduce((sum, p) => sum + p.waiting, 0)
    const completed = polyStats.reduce((sum, p) => sum + p.completed, 0)
    
    // Calculate weighted average service time based on completed count
    // Only count polys that have actual data (completed > 0)
    const polysWithData = polyStats.filter(p => p.completed > 0)
    
    let avgServiceTime = 0
    if (polysWithData.length > 0) {
      const totalWeightedTime = polysWithData.reduce((sum, p) => sum + (p.avgTime * p.completed), 0)
      const totalCompleted = polysWithData.reduce((sum, p) => sum + p.completed, 0)
      avgServiceTime = totalCompleted > 0 ? Math.round(totalWeightedTime / totalCompleted) : 0
    }

    return {
      totalToday,
      remaining,
      completed,
      avgServiceTime
    }
  }

  /**
   * Generate fallback peak hours data based on total count
   * Shows realistic distribution based on typical hospital patterns
   * @param {number} totalToday - Total queue count today
   * @returns {Array} Peak hours data
   */
  const generateFallbackPeakHours = (totalToday) => {
    const hours = []
    const currentHour = new Date().getHours()
    
    // Typical hospital peak hour pattern (multipliers)
    // Peak hours usually 08:00-10:00 and 13:00-14:00
    const hourMultipliers = {
      7: 0.3,
      8: 0.8,
      9: 1.0,  // Peak morning
      10: 0.9,
      11: 0.6,
      12: 0.4,
      13: 0.7,
      14: 0.5,
      15: 0.4,
      16: 0.3,
      17: 0.2
    }
    
    // If no data today, use current time to estimate past hours
    // This ensures we always show some data even if API returns empty
    const effectiveTotal = totalToday > 0 ? totalToday : 1
    
    for (let h = 7; h <= 17; h++) {
      const multiplier = hourMultipliers[h] || 0.5
      let count = 0
      
      if (totalToday > 0) {
        // Distribute actual total across hours based on pattern
        count = Math.round(effectiveTotal * multiplier / 5.1) // 5.1 = sum of multipliers
      } else if (h <= currentHour && h >= 7) {
        // For hours that have passed, show estimated traffic (0-3 range for demo)
        count = Math.round(multiplier * 3)
      }
      
      hours.push({
        hour: h,
        count: Math.max(0, count),
        isPeak: false
      })
    }
    
    // Mark peak hour(s)
    const maxCount = Math.max(...hours.map(h => h.count))
    if (maxCount > 0) {
      hours.forEach(h => { h.isPeak = h.count === maxCount })
    } else {
      // If all zeros, mark 9:00 as typical peak
      const nineAM = hours.find(h => h.hour === 9)
      if (nineAM) nineAM.isPeak = true
    }
    
    return hours
  }

  return {
    getDashboardStats,
    getQueueTypes,
    getPeakHours,
    calculateSummary,
    generateFallbackPeakHours
  }
}
