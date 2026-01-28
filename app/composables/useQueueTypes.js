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

      // Get polys that have service_hours or doctor schedules for today
      const getPolysWithTodaySchedules = () => {
        const polyIds = new Set()
        
        console.log('📋 Checking polys for today (day_of_week:', dayOfWeek, ')')
        
        // First: Check polys with service_hours for today
        polys.forEach(poly => {
          console.log(`  📌 Poly: ${poly.name} (id: ${poly.id})`, {
            is_active: poly.is_active,
            service_hours: poly.service_hours
          })
          
          if (poly.is_active && poly.service_hours && Array.isArray(poly.service_hours)) {
            const todayServiceHour = poly.service_hours.find(sh => sh.day_of_week === dayOfWeek)
            console.log(`    Today's service_hour:`, todayServiceHour)
            
            if (todayServiceHour && todayServiceHour.is_active) {
              polyIds.add(poly.id)
              console.log(`    ✅ Added from poly service_hours`)
            }
          }
        })
        
        // Fallback: Also add polys that have doctor schedules for today
        doctors.forEach(doc => {
          if (doc.schedules && Array.isArray(doc.schedules)) {
            const hasTodaySchedule = doc.schedules.some(s => s.day_of_week === dayOfWeek)
            if (hasTodaySchedule) {
              if (!polyIds.has(doc.poly_id)) {
                console.log(`  ✅ Added poly_id ${doc.poly_id} from doctor ${doc.name} schedule`)
              }
              polyIds.add(doc.poly_id)
            }
          }
        })
        
        console.log('📊 Final poly IDs with today schedule:', [...polyIds])
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
      console.log('📋 Raw queue types from API:', rawQueueTypes.map(qt => ({ name: qt.name, poly_id: qt.poly_id, is_active: qt.is_active })))
      
      const filteredQueueTypes = rawQueueTypes.filter(qt => {
        const isIncluded = polysWithSchedulesToday.has(qt.poly_id)
        console.log(`  🎫 Queue Type: ${qt.name} (poly_id: ${qt.poly_id}) - ${isIncluded ? '✅ INCLUDED' : '❌ EXCLUDED'}`)
        return isIncluded
      })
      
      console.log('📊 Filtered queue types count:', filteredQueueTypes.length)
      
      return filteredQueueTypes
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
