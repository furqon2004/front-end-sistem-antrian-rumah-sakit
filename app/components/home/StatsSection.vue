<script setup>
import { ref, onMounted } from 'vue'
import StatCard from '@/components/home/StatCard.vue'
import { Users, Clock, Stethoscope, Activity } from 'lucide-vue-next'

// Stats data - will be fetched from API
const stats = ref({
  totalPatientsToday: 0,
  avgWaitTime: 0,
  activeDoctors: 0,
  activePolys: 0
})
const loading = ref(true)

// Format wait time
const formatWaitTime = (minutes) => {
  if (!minutes) return '0 min'
  return `${minutes} min`
}

// Fetch stats from API
const fetchStats = async () => {
  try {
    const { baseURL } = useApi()
    
    // 1. Fetch total completed patients from dedicated endpoint
    let totalCompletedToday = 0
    try {
      const completedResponse = await fetch(`${baseURL}/v1/customer/info/total-completed`)
      if (completedResponse.ok) {
        const result = await completedResponse.json()
        if (result.success && result.data) {
          totalCompletedToday = result.data.total_completed || 0
          console.log('📊 Got total completed from API:', totalCompletedToday)
        }
      }
    } catch (e) {
      console.log('Total completed endpoint not accessible:', e.message)
    }
    
    // 2. Try to fetch from staff/admin dashboard if token exists
    // This gives us additional stats like avg wait time
    let dashboardData = null
    const staffToken = localStorage.getItem('staff_token')
    
    if (staffToken) {
      try {
        // Try staff dashboard first
        const staffResponse = await fetch(`${baseURL}/v1/staff/dashboard`, {
          headers: {
            'Authorization': `Bearer ${staffToken}`,
            'Accept': 'application/json'
          }
        })
        
        if (staffResponse.ok) {
          const result = await staffResponse.json()
          if (result.success && result.data) {
            // Parse staff dashboard data
            // Structure: { staff: {...}, dashboard: [{ total_today, waiting, done, ... }] }
            const dashboardItems = result.data.dashboard || []
            if (dashboardItems.length > 0) {
              // Sum up total_today from all polys
              const totalToday = dashboardItems.reduce((sum, item) => sum + (item.total_today || 0), 0)
              const totalDone = dashboardItems.reduce((sum, item) => sum + (item.done || 0), 0)
              const avgWaitSum = dashboardItems.reduce((sum, item) => sum + (item.avg_waiting_time || 0), 0)
              const avgWait = dashboardItems.length > 0 ? Math.round(avgWaitSum / dashboardItems.length) : 0
              
              dashboardData = {
                totalPatientsToday: totalToday,
                completedToday: totalDone,
                avgWaitTime: avgWait
              }
              console.log('📊 Got stats from staff dashboard:', dashboardData)
            }
          }
        }
      } catch (e) {
        console.log('Staff dashboard not accessible:', e.message)
      }
    }
    
    // Use total completed from dedicated endpoint as priority
    if (totalCompletedToday > 0) {
      if (!dashboardData) dashboardData = {}
      dashboardData.totalPatientsToday = totalCompletedToday
    }

    // 2. Fetch polys and doctors to count active polys with today's schedule
    let activePolysCount = 0
    try {
      // Fetch polys and doctors in parallel
      const [polysResponse, doctorsResponse] = await Promise.all([
        fetch(`${baseURL}/v1/customer/info/polys`),
        fetch(`${baseURL}/v1/customer/info/doctors`)
      ])
      
      const polysResult = polysResponse.ok ? await polysResponse.json() : { data: [] }
      const doctorsResult = doctorsResponse.ok ? await doctorsResponse.json() : { data: [] }
      
      const polysData = polysResult.data || []
      const doctorsData = doctorsResult.data || []
      
      // Get today's day of week (1=Mon, ..., 7=Sun)
      const today = new Date().getDay()
      const dayOfWeek = today === 0 ? 7 : today
      
      console.log('📊 StatsSection - Checking polys for day_of_week:', dayOfWeek)
      
      // Collect poly IDs that should be counted (same logic as useQueueTypes)
      const activePolyIds = new Set()
      
      // First: Check polys with service_hours for today
      polysData.forEach(poly => {
        if (poly.is_active && poly.service_hours && Array.isArray(poly.service_hours)) {
          const hasTodayServiceHours = poly.service_hours.some(
            sh => sh.day_of_week === dayOfWeek && sh.is_active
          )
          if (hasTodayServiceHours) {
            activePolyIds.add(poly.id)
            console.log(`  ✅ ${poly.name} - from poly service_hours`)
          }
        }
      })
      
      // Fallback: Also add polys that have doctor schedules for today
      doctorsData.forEach(doc => {
        if (doc.schedules && Array.isArray(doc.schedules)) {
          const hasTodaySchedule = doc.schedules.some(s => s.day_of_week === dayOfWeek)
          if (hasTodaySchedule && !activePolyIds.has(doc.poly_id)) {
            activePolyIds.add(doc.poly_id)
            console.log(`  ✅ poly_id ${doc.poly_id} - from doctor ${doc.name} schedule`)
          }
        }
      })
      
      activePolysCount = activePolyIds.size
      console.log('📊 StatsSection - Active polys with today schedule:', activePolysCount)
    } catch (e) {
      console.error('Error fetching polys:', e)
    }

    // 3. Fetch queue types for stats (total patients, avg wait)
    let totalPatients = 0
    let avgWait = 0
    
    try {
      const queueTypesResponse = await fetch(`${baseURL}/v1/customer/info/queue-types`)
      if (queueTypesResponse.ok) {
        const result = await queueTypesResponse.json()
        const data = result.data || []
        
        // Get active queue types
        const activeQueueTypes = data.filter(qt => qt.is_active)
        
        // Try to get stats if available in queue types (some backends might provide it)
        totalPatients = data.reduce((sum, qt) => sum + (qt.today_count || qt.total_today || 0), 0)
        
        const polysWithData = activeQueueTypes.filter(qt => (qt.today_count || qt.total_today || 0) > 0)
        if (polysWithData.length > 0) {
           const totalWeightedTime = polysWithData.reduce((sum, qt) => {
            const waitTime = qt.avg_waiting_time || qt.avg_service_minutes || 0
            const count = qt.today_count || qt.total_today || 1
            return sum + (waitTime * count)
          }, 0)
          const totalCount = polysWithData.reduce((sum, qt) => sum + (qt.today_count || qt.total_today || 0), 0)
          avgWait = totalCount > 0 ? Math.round(totalWeightedTime / totalCount) : 0
        } else {
           // Fallback to average of service minutes
           avgWait = activeQueueTypes.length > 0 
           ? Math.round(activeQueueTypes.reduce((sum, qt) => sum + (qt.avg_service_minutes || 0), 0) / activeQueueTypes.length)
           : 0
        }
      }
    } catch (e) {
      console.error('Error fetching queue types:', e)
    }

    // 3. Fetch doctors to calculate "Doctors on Duty" (Active Doctors)
    let activeDoctorsCount = 0
    try {
      const doctorsResponse = await fetch(`${baseURL}/v1/customer/info/doctors`)
      if (doctorsResponse.ok) {
        const result = await doctorsResponse.json()
        const doctorsData = result.data || []
        
        // Get today's day of week (1=Mon, ..., 7=Sun)
        const today = new Date().getDay()
        const dayOfWeek = today === 0 ? 7 : today
        
        // Filter doctors who have a schedule for today
        activeDoctorsCount = doctorsData.filter(doc => {
          if (!doc.schedules || !Array.isArray(doc.schedules)) return false
          // Check if any schedule matches today
          return doc.schedules.some(sch => sch.day_of_week === dayOfWeek && (!sch.is_active || sch.is_active === true)) // Assume active if field missing or true
        }).length
      }
    } catch (e) {
      console.error('Error fetching doctors:', e)
    }
    
    // Combine data
    stats.value = {
      totalPatientsToday: dashboardData?.totalPatientsToday || dashboardData?.total_today || totalPatients,
      avgWaitTime: dashboardData?.avgWaitTime || dashboardData?.avg_waiting_time || avgWait,
      activeDoctors: dashboardData?.activeDoctors || activeDoctorsCount,
      activePolys: dashboardData?.activePolys || activePolysCount
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
        label="Total Pasien Hari Ini" 
        :value="loading ? '...' : stats.totalPatientsToday.toString()"
      />
      <StatCard 
        :icon="Clock" 
        label="Rata-rata Waktu Tunggu" 
        :value="loading ? '...' : formatWaitTime(stats.avgWaitTime)"
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
