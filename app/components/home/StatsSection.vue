<script setup>
import { ref, onMounted } from 'vue'
import StatCard from '@/components/home/StatCard.vue'
import { Users, Stethoscope, Activity, Clock } from 'lucide-vue-next'

// Stats data - will be fetched from API
const stats = ref({
  completedPatientsToday: 0, // Only DONE status patients
  waitingQueueCount: 0, // Patients currently waiting
  activeDoctors: 0,
  activePolys: 0
})
const loading = ref(true)



// Fetch stats from API
const fetchStats = async () => {
  try {
    const { baseURL } = useApi()
    
    let totalCompletedToday = 0
    let waitingCount = 0
    
    // Try staff dashboard first - this has the done/completed counts
    // Uses ALL polys data, not just staff's assigned poly
    const staffToken = localStorage.getItem('staff_token')
    
    if (staffToken) {
      try {
        const staffResponse = await fetch(`${baseURL}/v1/staff/dashboard`, {
          headers: {
            'Authorization': `Bearer ${staffToken}`,
            'Accept': 'application/json'
          }
        })
        
        if (staffResponse.ok) {
          const result = await staffResponse.json()
          if (result.success && result.data) {
            const dashboardItems = result.data.dashboard || []
            // Sum up DONE count from ALL polys for total completed today
            totalCompletedToday = dashboardItems.reduce((sum, item) => sum + (item.done || 0), 0)
            waitingCount = dashboardItems.reduce((sum, item) => sum + (item.waiting || 0), 0)
            console.log('📊 Got stats from staff dashboard (all polys):', { totalCompletedToday, waitingCount })
          }
        }
      } catch (e) {
        console.log('Staff dashboard not accessible:', e.message)
      }
    }
    
    // Fallback to dedicated endpoint if available
    if (totalCompletedToday === 0) {
      try {
        const completedResponse = await fetch(`${baseURL}/v1/customer/info/total-completed`)
        if (completedResponse.ok) {
          const result = await completedResponse.json()
          if (result.success && result.data) {
            totalCompletedToday = result.data.total_completed || 0
            console.log('📊 Got total completed from dedicated API:', totalCompletedToday)
          }
        }
      } catch (e) {
        console.log('Total completed endpoint not accessible:', e.message)
      }
    }

    // Store for later use
    const publicStats = {
      completedToday: totalCompletedToday,
      waitingCount: waitingCount
    }

    // 2. Logic merged into step 3 below for efficiency and correctness
    // (Active Polys calculation moved to use the new doctor data fetch)

    // 3. Fetch queue types for stats (total patients, avg wait)
    // 3. Main Public Logic: Fetch doctors to calculate active stats and fallbacks
    // We derive Active Doctors, Active Polys, and Waiting Queue from here
    let activeDoctorsCount = 0
    let activePolysCount = 0
    
    try {
      const doctorsResult = await $fetch(`${baseURL}/v1/customer/info/doctors`).catch(() => null)
      
      if (doctorsResult?.data) {
        const doctorsData = doctorsResult.data
        
        // Get today's day of week (1=Mon, ..., 7=Sun)
        const today = new Date().getDay()
        const dayOfWeek = today === 0 ? 7 : today
        
        // A. Calculate Active Doctors
        activeDoctorsCount = doctorsData.filter(doc => {
          if (!doc.schedules || !Array.isArray(doc.schedules)) return false
          return doc.schedules.some(sch => sch.day_of_week === dayOfWeek && (!sch.is_active || sch.is_active === true))
        }).length
        
        // B. Calculate Active Polys (Set of IDs)
        const activePolyIds = new Set()
        const activePolyDoctors = [] // Keep track of doctors in active polys for quota calc
        
        doctorsData.forEach(doc => {
           if (doc.schedules && Array.isArray(doc.schedules)) {
             const schedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
             if (schedule) {
               activePolyIds.add(doc.poly_id)
               activePolyDoctors.push({ doc, schedule })
             }
           }
        })
        
        activePolysCount = activePolyIds.size
        
        // C. Brute Force Waiting Count & Derived Done Count
        let totalBooked = 0
        
        // C1. Calculate Total Registered (Booked) from Quotas first
        activePolyDoctors.forEach(({ schedule }) => {
           const max = schedule.max_quota || 0
           const remaining = schedule.remaining_quota !== undefined ? schedule.remaining_quota : max
           totalBooked += Math.max(0, max - remaining)
        })
        console.log('📊 Total Booked (Registered) based on quota:', totalBooked)

        if (activePolyIds.size > 0) {
           console.log(`🔄 Fetching active tickets for ${activePolyIds.size} polys...`)
           
           // Strategy 1: List Endpoint
           let foundDataViaList = false
           try {
             const listResponse = await $fetch(`${baseURL}/v1/customer/queue-types`).catch(() => null)
             if (listResponse?.data && Array.isArray(listResponse.data)) {
                // ... (existing logic) ...
                const listStats = listResponse.data.reduce((acc, curr) => {
                   // Only count if this queue type belongs to an active poly
                   // (Optional match: if (activePolyIds.has(curr.poly_id)) ...)
                   const wait = curr.waiting_count || curr.current_queue_count || 
                                (curr.active_queue ? curr.active_queue.filter(t => ['WAITING', 'CALLED', 'SERVING'].includes(t.status)).length : 0)
                   return acc + wait
                }, 0)
                
                if (listStats > 0) {
                   waitingCount = listStats
                   if (totalBooked >= waitingCount) {
                      totalCompletedToday = totalBooked - waitingCount
                   }
                   foundDataViaList = true
                   console.log('✅ Found stats via List Endpoint:', waitingCount)
                }
             }
           } catch (e) { console.log('List endpoint failed', e) }

           // Strategy 2: Brute Force Detailed Fetch
           if (!foundDataViaList) {
             try {
               // CRITICAL FIX: Map active PolyIDs to QueueTypeIDs first!
               // We need QueueTypeID to fetch detailed /v1/customer/queue-types/:id
               const queueInfos = await $fetch(`${baseURL}/v1/customer/info/queue-types`).catch(() => ({ data: [] }))
               const allQueueTypes = queueInfos?.data || []
               
               // Find queue types that match our active poly IDs
               const targetQueueTypeIds = allQueueTypes
                 .filter(qt => activePolyIds.has(qt.poly_id))
                 .map(qt => qt.id) // Use QueueType ID, not Poly ID
               
               if (targetQueueTypeIds.length > 0) {
                   console.log('🔄 Fetching details for Queue IDs:', targetQueueTypeIds)
                   const detailPromises = targetQueueTypeIds.map(qtId => 
                      $fetch(`${baseURL}/v1/customer/queue-types/${qtId}`).catch(() => null)
                   )
                   
                   const details = await Promise.all(detailPromises)
                   let exactWaiting = 0
                   let hasRealData = false
                   
                   details.forEach(detail => {
                     if (detail?.success && detail?.data) {
                       const activeQ = detail.data.active_queue || detail.data.queues || []
                       const count = activeQ.filter(t => ['WAITING', 'CALLED', 'SERVING'].includes(t.status)).length
                       exactWaiting += count
                       hasRealData = true
                       console.log(`  🏥 Queue active tickets: ${count}`)
                     }
                   })
                   
                   if (hasRealData) {
                      waitingCount = exactWaiting
                   }
               }
            } catch (err) {
              console.error('Brute force stats failed:', err)
           }
        }
        
        // Final derivation: If we have booked count, derive completed from waiting
        // This runs if we didn't get a direct "completed" count from staff dashboard or dedicated API
        if (totalCompletedToday === 0 && totalBooked > 0) {
           // Ensure waitingCount is valid (it defaults to 0 if no queues found, which is correct -> all completed)
           if (waitingCount <= totalBooked) {
              totalCompletedToday = totalBooked - waitingCount
           } else {
              // Should not happen, but if waiting > booked, then completed = 0?
              // Or maybe booked is inconsistent. Keep 0 or clamp?
              totalCompletedToday = 0
           }
           console.log(`📊 Derived Completed: ${totalCompletedToday} (Booked: ${totalBooked} - Waiting: ${waitingCount})`)
        }
      }
    }
    } catch (e) {
      console.error('Error fetching doctors:', e)
    }
    
    // Combine data - use only public API data for consistency across all platforms
    // Combine data - use only public API data for consistency across all platforms
    stats.value = {
      completedPatientsToday: totalCompletedToday,
      waitingQueueCount: waitingCount, // Uses correct local var updated by brute force
      activeDoctors: activeDoctorsCount,
      activePolys: activePolysCount
    }
    
  } catch (error) {
    console.error('Error fetching stats:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 pb-20">
    <div class="grid md:grid-cols-4 gap-6">
      <StatCard 
        :icon="Users" 
        label="Total Pasien Selesai Hari Ini" 
        :value="loading ? '...' : stats.completedPatientsToday.toString()"
      />
      <StatCard 
        :icon="Clock" 
        label="Total Antrian Menunggu" 
        :value="loading ? '...' : stats.waitingQueueCount.toString()"
      />
      <StatCard 
        :icon="Stethoscope" 
        label="Dokter Bertugas" 
        :value="loading ? '...' : stats.activeDoctors.toString()"
      />
      <StatCard 
        :icon="Activity" 
        label="Poli Aktif" 
        :value="loading ? '...' : stats.activePolys.toString()"
      />
    </div>
  </section>
</template>
