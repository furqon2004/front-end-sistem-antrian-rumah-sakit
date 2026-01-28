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
                 console.log(`📊 Doctor ${doc.name} (poly_id: ${polyId}) schedule:`, {
                   max_quota: todaySchedule.max_quota,
                   remaining_quota: todaySchedule.remaining_quota,
                   day_of_week: todaySchedule.day_of_week
                 })
                 totalMaxQuota += (todaySchedule.max_quota || 0)
                 // Use remaining_quota from API which decreases when patient checks out
                 totalRemainingQuota += (todaySchedule.remaining_quota !== undefined 
                   ? todaySchedule.remaining_quota 
                   : todaySchedule.max_quota || 0)
               }
             }
          })
          
          console.log(`📈 Poly ${polyId} Total Quota:`, { maxQuota: totalMaxQuota, remainingQuota: totalRemainingQuota })
          return { maxQuota: totalMaxQuota, remainingQuota: totalRemainingQuota }
        } catch (e) {
          return { maxQuota: 0, remainingQuota: 0 }
        }
      }

      // Helper to get service hours for a poly from doctor schedules
      const getPolyServiceHours = (polyId) => {
        try {
          // STRATEGY: Prioritize Doctor Schedules
          // If any doctor has a schedule today, use the combined range (Earliest Open - Latest Close)
          // Fallback to Poly Service Hours only if no doctors are scheduled
          
          const activeDoctors = doctors.filter(d => d.poly_id === polyId)
          const todaysSchedules = []
          
          // Collect all schedules for today
          activeDoctors.forEach(doc => {
            if (doc.schedules && Array.isArray(doc.schedules)) {
              const todaySchedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
              if (todaySchedule) {
                todaysSchedules.push(todaySchedule)
              }
            }
          })
          
          // If we have doctor schedules, calculate min-max range
          if (todaysSchedules.length > 0) {
            // Sort by start_time to find earliest
            todaysSchedules.sort((a, b) => a.start_time.localeCompare(b.start_time))
            const earliestOpen = todaysSchedules[0].start_time
            
            // Sort by end_time to find latest
            todaysSchedules.sort((a, b) => b.end_time.localeCompare(a.end_time))
            const latestClose = todaysSchedules[0].end_time
            
            console.log(`  🕒 Poly ${polyId} Hours (from ${todaysSchedules.length} docs): ${earliestOpen} - ${latestClose}`)
            
            return {
              open_time: earliestOpen,
              close_time: latestClose,
              day_of_week: dayOfWeek,
              is_active: true,
              source: 'doctor_schedules'
            }
          }

          // Fallback: Try from polys data (static hours)
          const poly = polys.find(p => p.id === polyId)
          if (poly) {
            if (poly.service_hours && Array.isArray(poly.service_hours)) {
              const todayHours = poly.service_hours.find(h => h.day_of_week === dayOfWeek)
              if (todayHours) {
                 console.log(`  CLOCK Poly ${polyId} Hours (static): ${todayHours.open_time} - ${todayHours.close_time}`)
                 return { ...todayHours, source: 'poly_static' }
              }
            }
            
            // Legacy format fallback
            if (poly.schedules && Array.isArray(poly.schedules)) {
               const todaySch = poly.schedules.find(s => s.day_of_week === dayOfWeek)
               if (todaySch) return todaySch
            }
          }
          
          return null
        } catch (e) {
          console.error('Error calculating service hours:', e)
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
          
          // Get doctors available TODAY for this poly
          const availableDoctors = doctors
            .filter(doc => doc.poly_id === polyId)
            .filter(doc => {
              if (!doc.schedules || !Array.isArray(doc.schedules)) return false
              return doc.schedules.some(s => s.day_of_week === dayOfWeek)
            })
            .map(doc => {
              const todaySchedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
              return {
                id: doc.id,
                name: doc.name,
                specialization: doc.specialization,
                schedule: todaySchedule ? {
                  start_time: todaySchedule.start_time,
                  end_time: todaySchedule.end_time,
                  max_quota: todaySchedule.max_quota,
                  remaining_quota: todaySchedule.remaining_quota
                } : null
              }
            })
          
          console.log(`👨‍⚕️ Poly ${polyId} has ${availableDoctors.length} doctors today:`, 
            availableDoctors.map(d => d.name))
          
          // Use remaining_quota from schedules directly
          const todayCount = quotaInfo.maxQuota - quotaInfo.remainingQuota
          
          return {
            ...qt,
            service_hours: serviceHour, // { open_time: "08:00", close_time: "16:00", ... }
            quota: quotaInfo.maxQuota,
            remaining_quota: quotaInfo.remainingQuota,
            today_count: todayCount,
            available_doctors: availableDoctors // NEW: list of doctors for this poly today
          }
        })

    } catch (err) {
      console.error('Failed to fetch enhanced queue types:', err)
      throw err
    }
  }, {
    // Disable caching to always fetch fresh data
    // This ensures admin changes (schedules, polys, etc.) are immediately reflected
    watch: false,
    getCachedData: () => undefined // Force fresh fetch every time
  })
  
  return {
    queueTypes,
    loading,
    error,
    refresh
  }
}
