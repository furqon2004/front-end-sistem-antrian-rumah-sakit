/**
 * Queue Types Composable
 * Fetches queue types data from the backend API
 */
/**
 * Queue Types Composable
 * Fetches queue types data, merges with service hours (Polys) and quotas (Doctors)
 */
export const useQueueTypes = () => {
  const { baseURL } = useApi()
  
  const { data: queueTypes, pending: loading, error, refresh } = useAsyncData('queue-types-enhanced', async () => {
    try {
      // Fetch all required data in parallel with error handling (allSettled)
      const [queueTypesResult, polysResult, doctorsResult] = await Promise.allSettled([
        $fetch('/v1/customer/info/queue-types', { baseURL }),
        $fetch('/v1/customer/info/polys', { baseURL }),
        $fetch('/v1/customer/info/doctors', { baseURL })
      ])

      // Extract data safely
      const rawQueueTypes = queueTypesResult.status === 'fulfilled' && queueTypesResult.value?.data 
        ? queueTypesResult.value.data 
        : []
        
      const polys = polysResult.status === 'fulfilled' && polysResult.value?.data 
        ? polysResult.value.data 
        : []
        
      const doctors = doctorsResult.status === 'fulfilled' && doctorsResult.value?.data 
        ? doctorsResult.value.data 
        : []

      // If main queue types failed, throw error
      if (queueTypesResult.status === 'rejected') {
        throw queueTypesResult.reason
      }
      
      // Helper to calculating today's quota for a poly
      // filtered by today's day of week - using remaining_quota from doctor schedules
      const today = new Date().getDay()
      const dayOfWeek = today === 0 ? 7 : today

      // Get polys that have doctors with schedules for today
      const getPolysWithTodaySchedules = () => {
        if (!doctors.length) return new Set()
        
        const polyIds = new Set()
        doctors.forEach(doc => {
          if (doc.schedules && Array.isArray(doc.schedules)) {
            const hasTodaySchedule = doc.schedules.some(s => s.day_of_week === dayOfWeek)
            if (hasTodaySchedule) {
              polyIds.add(doc.poly_id)
            }
          }
        })
        return polyIds
      }
      
      const polysWithSchedulesToday = getPolysWithTodaySchedules()

      const getPolyQuotaInfo = (polyId) => {
        try {
          if (!doctors.length) return { maxQuota: 0, remainingQuota: 0 }
          
          const activeDoctors = doctors.filter(d => d.poly_id === polyId)
          let totalMaxQuota = 0
          let totalRemainingQuota = 0
          
          activeDoctors.forEach(doc => {
             if (doc.schedules && Array.isArray(doc.schedules)) {
               const todaySchedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
               if (todaySchedule) {
                 totalMaxQuota += (todaySchedule.max_quota || 0)
                 // Use remaining_quota from API which decreases when patient checks out
                 totalRemainingQuota += (todaySchedule.remaining_quota !== undefined 
                   ? todaySchedule.remaining_quota 
                   : todaySchedule.max_quota || 0)
               }
             }
          })
          return { maxQuota: totalMaxQuota, remainingQuota: totalRemainingQuota }
        } catch (e) {
          return { maxQuota: 0, remainingQuota: 0 }
        }
      }

      // Helper to get service hours for a poly from doctor schedules
      const getPolyServiceHours = (polyId) => {
        try {
          // First try from polys data
          const poly = polys.find(p => p.id === polyId)
          if (poly) {
            // Try to find schedule for today
            if (poly.service_hours && Array.isArray(poly.service_hours)) {
              const todayHours = poly.service_hours.find(h => h.day_of_week === dayOfWeek)
              if (todayHours) return todayHours
            }
            
            if (poly.schedules && Array.isArray(poly.schedules)) {
               const todaySch = poly.schedules.find(s => s.day_of_week === dayOfWeek)
               if (todaySch) return todaySch
            }
          }
          
          // Fallback: Try to get from doctor schedules
          const activeDoctors = doctors.filter(d => d.poly_id === polyId)
          for (const doc of activeDoctors) {
            if (doc.schedules && Array.isArray(doc.schedules)) {
              const todaySchedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
              if (todaySchedule) {
                return {
                  open_time: todaySchedule.start_time,
                  close_time: todaySchedule.end_time,
                  day_of_week: dayOfWeek,
                  is_active: true
                }
              }
            }
          }
          
          return null
        } catch (e) {
          return null
        }
      }

      // Filter queue types to only show polys with doctor schedules today
      // Then merge data into queue types
      return rawQueueTypes
        .filter(qt => {
          // Only show if poly has doctor schedules for today
          return polysWithSchedulesToday.has(qt.poly_id)
        })
        .map(qt => {
          const polyId = qt.poly_id
          const serviceHour = getPolyServiceHours(polyId)
          const quotaInfo = getPolyQuotaInfo(polyId)
          
          // Use remaining_quota from schedules directly
          const todayCount = quotaInfo.maxQuota - quotaInfo.remainingQuota
          
          return {
            ...qt,
            service_hours: serviceHour, // { open_time: "08:00", close_time: "16:00", ... }
            quota: quotaInfo.maxQuota,
            remaining_quota: quotaInfo.remainingQuota,
            today_count: todayCount
          }
        })

    } catch (err) {
      console.error('Failed to fetch enhanced queue types:', err)
      throw err
    }
  }, {
    // Cache options (optional)
    watch: false
  })
  
  return {
    queueTypes,
    loading,
    error,
    refresh
  }
}
