/**
 * Customer System Settings Composable
 * Fetches system settings for customer-facing pages
 * Settings affect geofence validation and other customer features
 */

// Default settings (fallback if API is unavailable)
const DEFAULT_SETTINGS = {
  GEOFENCE_ENABLED: 'false',
  MAX_DISTANCE_METER: '100',
  HOSPITAL_LAT: '-8.681671377999534',
  HOSPITAL_LNG: '115.23989198137991'
}

// LocalStorage key for caching settings
const SETTINGS_CACHE_KEY = 'hospital_queue_settings'

// Cache for settings to avoid multiple API calls
let settingsCache = null
let settingsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useCustomerSettings = () => {
  // Get baseURL safely - handle case where useApi may not be available yet
  let baseURL = 'https://hospital-queue-api.codewithdanu.my.id/api'
  try {
    const api = useApi()
    if (api?.baseURL) {
      baseURL = api.baseURL
    }
  } catch (e) {
    // Fallback: try to get from runtime config directly
    try {
      const config = useRuntimeConfig()
      baseURL = config.public?.apiBase || baseURL
    } catch (e2) {
      // Use default baseURL
      console.log('Using default API URL')
    }
  }
  
  /**
   * Try to get settings from localStorage
   */
  const getFromLocalStorage = () => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(SETTINGS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        console.log('📦 Settings loaded from localStorage:', parsed)
        return parsed
      }
    } catch (e) {
      console.warn('Failed to read settings from localStorage:', e)
    }
    return null
  }
  
  /**
   * Save settings to localStorage for customer access
   */
  const saveToLocalStorage = (settings) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
      console.log('💾 Settings saved to localStorage')
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e)
    }
  }
  
  /**
   * Fetch system settings from various endpoints
   * Falls back to localStorage then defaults if all fail
   */
  const fetchSettings = async (forceRefresh = false) => {
    // Return cache if valid
    if (!forceRefresh && settingsCache && (Date.now() - settingsCacheTime) < CACHE_DURATION) {
      return settingsCache
    }
    
    console.log('📡 Fetching customer system settings...')
    
    // List of endpoints to try (in order of preference)
    const endpointsToTry = [
      '/v1/customer/info/settings',      // Customer-facing settings endpoint
      '/v1/public/settings',              // Public settings
      '/v1/settings',                     // Generic settings
      '/v1/admin/system-settings'         // Admin endpoint (may work if CORS allows)
    ]
    
    for (const endpoint of endpointsToTry) {
      try {
        const response = await $fetch(endpoint, {
          baseURL,
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
        
        if (response?.success && response?.data) {
          // Parse settings into simple key-value format
          const settings = {}
          const data = response.data
          
          // Handle both formats: { key: { value: "..." } } and { key: "value" }
          Object.keys(data).forEach(key => {
            if (typeof data[key] === 'object' && data[key]?.value !== undefined) {
              settings[key] = data[key].value
            } else {
              settings[key] = data[key]
            }
          })
          
          // Apply defaults for missing keys
          Object.keys(DEFAULT_SETTINGS).forEach(key => {
            if (!settings[key]) {
              settings[key] = DEFAULT_SETTINGS[key]
            }
          })
          
          console.log('✅ Settings loaded from API:', settings)
          settingsCache = settings
          settingsCacheTime = Date.now()
          saveToLocalStorage(settings)
          return settings
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} failed:`, err.message || err)
        continue
      }
    }
    
    // Fallback 1: Try localStorage
    const localSettings = getFromLocalStorage()
    if (localSettings) {
      settingsCache = localSettings
      settingsCacheTime = Date.now()
      return localSettings
    }
    
    // Fallback 2: Use defaults
    console.warn('All settings endpoints failed, using defaults')
    settingsCache = { ...DEFAULT_SETTINGS }
    settingsCacheTime = Date.now()
    return settingsCache
  }
  
  /**
   * Get specific setting value
   */
  const getSetting = async (key, defaultValue = '') => {
    const settings = await fetchSettings()
    return settings[key] || defaultValue
  }
  
  /**
   * Check if geofence validation is enabled
   */
  const isGeofenceEnabled = async () => {
    const settings = await fetchSettings()
    return settings.GEOFENCE_ENABLED === 'true'
  }
  
  /**
   * Get geofence configuration
   */
  const getGeofenceConfig = async () => {
    const settings = await fetchSettings()
    return {
      enabled: settings.GEOFENCE_ENABLED === 'true',
      maxDistance: parseInt(settings.MAX_DISTANCE_METER, 10) || 100,
      hospitalLat: parseFloat(settings.HOSPITAL_LAT) || -8.681671377999534,
      hospitalLng: parseFloat(settings.HOSPITAL_LNG) || 115.23989198137991
    }
  }
  
  /**
   * Clear settings cache (call when admin updates settings)
   */
  const clearCache = () => {
    settingsCache = null
    settingsCacheTime = 0
  }
  
  return {
    fetchSettings,
    getSetting,
    isGeofenceEnabled,
    getGeofenceConfig,
    clearCache,
    DEFAULT_SETTINGS
  }
}
