/**
 * Polys (Klinik/Poli) Composable
 * Fetches list of polys/clinics from backend API
 * Used in staff app for poly selection and management
 */

// Constants
const CACHE_KEY = 'polys_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const usePolys = () => {
  const { baseURL } = useApi()
  
  // State
  const polys = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  /**
   * Fetch polys from API with caching
   */
  const fetchPolys = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = getCachedPolys()
      if (cached) {
        polys.value = cached
        return { success: true, data: cached }
      }
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/v1/customer/info/polys', {
        baseURL,
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response?.success && response?.data) {
        polys.value = response.data
        
        // Cache the result
        cachePolys(response.data)
        
        return {
          success: true,
          data: response.data
        }
      }
      
      throw new Error(response?.message || 'Failed to fetch polys')
    } catch (err) {
      console.error('Error fetching polys:', err)
      error.value = err.message || 'Gagal memuat data poli'
      
      return {
        success: false,
        error: error.value
      }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Get poly by ID
   */
  const getPolyById = (polyId) => {
    return polys.value.find(poly => poly.id === polyId) || null
  }
  
  /**
   * Get poly by code
   */
  const getPolyByCode = (code) => {
    return polys.value.find(poly => poly.code === code) || null
  }
  
  /**
   * Get active polys only
   */
  const getActivePolys = computed(() => {
    return polys.value.filter(poly => poly.is_active)
  })
  
  /**
   * Check if poly is open today
   */
  const isPolyOpenToday = (polyId) => {
    const poly = getPolyById(polyId)
    if (!poly || !poly.service_hours) return false
    
    const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayOfWeek = today === 0 ? 7 : today // Convert to 1-7 format
    
    return poly.service_hours.some(
      hour => hour.day_of_week === dayOfWeek && hour.is_active
    )
  }
  
  /**
   * Get service hours for today
   */
  const getTodayServiceHours = (polyId) => {
    const poly = getPolyById(polyId)
    if (!poly || !poly.service_hours) return null
    
    const today = new Date().getDay()
    const dayOfWeek = today === 0 ? 7 : today
    
    return poly.service_hours.find(
      hour => hour.day_of_week === dayOfWeek && hour.is_active
    ) || null
  }
  
  // Cache helpers
  const getCachedPolys = () => {
    if (process.client) {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const now = Date.now()
        
        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
          return data
        }
      }
    }
    return null
  }
  
  const cachePolys = (data) => {
    if (process.client) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    }
  }
  
  const clearCache = () => {
    if (process.client) {
      localStorage.removeItem(CACHE_KEY)
    }
  }
  
  return {
    // State
    polys,
    loading,
    error,
    
    // Computed
    activePolys: getActivePolys,
    
    // Methods
    fetchPolys,
    getPolyById,
    getPolyByCode,
    isPolyOpenToday,
    getTodayServiceHours,
    clearCache
  }
}
