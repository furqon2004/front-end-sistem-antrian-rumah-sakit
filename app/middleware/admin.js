/**
 * Admin Authentication Middleware
 * Checks if user is authenticated AND has admin role
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // Only run on client-side
  if (process.server) return

  const token = localStorage.getItem('staff_token')
  const userStr = localStorage.getItem('staff_user')
  
  if (!token || !userStr) {
    console.log('🔒 Admin middleware: No token, redirecting to login')
    return navigateTo('/login')
  }

  try {
    const user = JSON.parse(userStr)
    
    // Check if user has admin role
    // Admin users should have admin property or role === 'admin'
    const isAdmin = user.admin || user.role === 'admin' || user.is_admin
    
    if (!isAdmin) {
      console.log('🔒 Admin middleware: User is not admin, redirecting')
      return navigateTo('/staff/dashboard')
    }
    
    console.log('✅ Admin middleware: User is admin, access granted')
  } catch (error) {
    console.error('Admin middleware error:', error)
    return navigateTo('/login')
  }
})

