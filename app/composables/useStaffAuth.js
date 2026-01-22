/**
 * Staff Authentication Composable
 * Handles staff login, logout, and JWT token management
 * Uses Singleton pattern for shared state
 * Uses localStorage for persistent login across tabs and page reloads
 */

// Shared State (Singleton Pattern)
// Defined outside the function so all components share the same reactive state
const token = ref(null)
const username = ref(null)
const user = ref(null)
const staff = ref(null)
const poly = ref(null)
const isLoading = ref(false)
const error = ref(null)

export const useStaffAuth = () => {
  const { baseURL } = useApi()
  const router = useRouter()
  
  // Initialize from localStorage (only once if token is missing)
  const initAuth = () => {
    if (process.client && !token.value) {
      console.log('🔄 Init auth: Checking localStorage...')
      const savedToken = localStorage.getItem('staff_token')
      
      if (savedToken) {
        console.log('🔑 Token found in localStorage')
        token.value = savedToken
        username.value = localStorage.getItem('staff_username')
        
        // Safely parse JSON values with try-catch
        try {
          const savedUser = localStorage.getItem('staff_user')
          if (savedUser && savedUser !== 'undefined') {
            user.value = JSON.parse(savedUser)
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse staff_user from localStorage')
          localStorage.removeItem('staff_user')
        }
        
        try {
          const savedStaff = localStorage.getItem('staff_staff')
          if (savedStaff && savedStaff !== 'undefined') {
            staff.value = JSON.parse(savedStaff)
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse staff_staff from localStorage')
          localStorage.removeItem('staff_staff')
        }
        
        try {
          const savedPoly = localStorage.getItem('staff_poly')
          if (savedPoly && savedPoly !== 'undefined') {
            poly.value = JSON.parse(savedPoly)
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse staff_poly from localStorage')
          localStorage.removeItem('staff_poly')
        }
      } else {
        console.log('⚠️ No token found in localStorage')
      }
    }
  }

  // Call init immediately when composable is used
  initAuth()
  
  /**
   * Refresh the access token
   * @returns {Promise<boolean>} true if refresh successful, false otherwise
   */
  const refreshToken = async () => {
    console.log('🔄 Attempting to refresh token...')
    
    const currentToken = token.value || localStorage.getItem('staff_token')
    if (!currentToken) {
      console.warn('⚠️ No token to refresh')
      return false
    }
    
    try {
      const response = await $fetch('/v1/auth/refresh', {
        baseURL,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      })
      
      if (response?.success && response?.data?.access_token) {
        const newToken = response.data.access_token
        
        // Update shared state
        token.value = newToken
        
        // Save to localStorage
        localStorage.setItem('staff_token', newToken)
        
        console.log('✅ Token refreshed successfully')
        return true
      } else {
        console.error('❌ Token refresh failed:', response?.message)
        return false
      }
    } catch (err) {
      console.error('❌ Token refresh error:', err)
      // If refresh fails, clear everything and redirect to login
      token.value = null
      localStorage.removeItem('staff_token')
      return false
    }
  }
  
  const isAuthenticated = computed(() => !!token.value)
  
  /**
   * Login staff member
   */
  const login = async (usernameInput, password) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/v1/auth/login', {
        baseURL,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: {
          username: usernameInput,
          password: password
        }
      })
      
      if (response?.success && response?.data) {
        const { access_token, user: userData } = response.data
        
        // Update shared state
        token.value = access_token
        username.value = usernameInput
        user.value = userData
        staff.value = userData.staff
        poly.value = userData.staff?.poly
        
        // Save to localStorage for persistent login
        localStorage.setItem('staff_token', access_token)
        localStorage.setItem('staff_username', usernameInput)
        localStorage.setItem('staff_user', JSON.stringify(userData))
        localStorage.setItem('staff_staff', JSON.stringify(userData.staff))
        localStorage.setItem('staff_poly', JSON.stringify(userData.staff?.poly))
        
        console.log('✅ Login successful:', {
          user: userData.name,
          poly: userData.staff?.poly?.name,
          token: access_token.substring(0, 10) + '...'
        })
        
        return {
          success: true,
          message: response.message || 'Login successful'
        }
      } else {
        throw new Error(response?.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      error.value = err.data?.message || err.message || 'Login failed'
      
      return {
        success: false,
        error: error.value
      }
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Logout staff member
   */
  const logout = async () => {
    try {
      if (token.value) {
        await $fetch('/v1/auth/logout', {
          baseURL,
          method: 'POST',
          headers: getAuthHeader()
        })
        console.log('✅ Logout successful from server')
      }
    } catch (err) {
      console.error('Logout API error:', err)
      // Continue with local logout anyway
    } finally {
      // Clear shared state
      token.value = null
      username.value = null
      user.value = null
      staff.value = null
      poly.value = null
      
      // Clear localStorage
      localStorage.removeItem('staff_token')
      localStorage.removeItem('staff_username')
      localStorage.removeItem('staff_user')
      localStorage.removeItem('staff_staff')
      localStorage.removeItem('staff_poly')
      
      router.push('/login')
    }
  }
  
  /**
   * Get authorization header
   */
  const getAuthHeader = () => {
    console.log('🔐 getAuthHeader called, token.value:', token.value ? 'EXISTS' : 'NULL')
    
    // Ensure we have latest token
    if (!token.value) {
      console.log('🔄 Token is null, calling initAuth...')
      initAuth()
      console.log('🔄 After initAuth, token.value:', token.value ? 'EXISTS' : 'STILL NULL')
    }
    
    if (!token.value) {
      // Try force read from localStorage as fallback
      if (process.client) {
        const savedToken = localStorage.getItem('staff_token')
        console.log('🔍 Fallback check localStorage:', savedToken ? 'FOUND' : 'NOT FOUND')
        if (savedToken) {
          token.value = savedToken
          return { 'Authorization': `Bearer ${savedToken}` }
        }
      }
      console.warn('⚠️ No auth token available for header')
      return {}
    }
    
    console.log('✅ Returning auth header with token')
    return {
      'Authorization': `Bearer ${token.value}`
    }
  }
  
  return {
    // Export shared state
    token,
    username,
    user,
    staff,
    poly,
    isAuthenticated,
    isLoading,
    error,
    
    // Methods
    login,
    logout,
    getAuthHeader,
    refreshToken
  }
}
