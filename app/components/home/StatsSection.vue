<script setup>
import { ref, onMounted } from 'vue'
import StatCard from '@/components/home/StatCard.vue'
import { Users, Stethoscope, Activity, CalendarCheck } from 'lucide-vue-next'

// Stats data - will be fetched from API
const stats = ref({
  completedPatientsToday: 0, // Only DONE status patients (estimated from quota)
  totalRegisteredToday: 0, // Total patients registered today (from quota)
  activeDoctors: 0,
  activePolys: 0
})
const loading = ref(true)

// Fetch stats from API
const fetchStats = async () => {
  try {
    const { baseURL } = useApi()
    
    let totalCompletedToday = 0
    let totalRegistered = 0
    let activeDoctorsCount = 0
    let activePolysCount = 0
    let gotStatsFromDashboard = false
    
    // Step 1: Try staff dashboard if token exists (most accurate source for done/waiting)
    const staffToken = localStorage.getItem('staff_token')
    
    if (staffToken) {
      try {
        console.log('📊 Fetching stats from staff dashboard...')
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
            // Sum up DONE and WAITING count from ALL polys
            totalCompletedToday = dashboardItems.reduce((sum, item) => sum + (item.done || 0), 0)
            // Total registered = done + waiting + serving
            totalRegistered = dashboardItems.reduce((sum, item) => sum + (item.done || 0) + (item.waiting || 0) + (item.serving || 0), 0)
            gotStatsFromDashboard = true
            console.log('✅ Got stats from staff dashboard:', { done: totalCompletedToday, registered: totalRegistered })
          }
        }
      } catch (e) {
        console.log('Staff dashboard not accessible:', e.message)
      }
    }
    
    // Step 2: Fetch doctors for active doctors, polys count, and quota-based estimation
    try {
      const doctorsResult = await $fetch(`${baseURL}/v1/customer/info/doctors`).catch(() => null)
      
      if (doctorsResult?.data) {
        const doctorsData = doctorsResult.data
        
        // Get today's day of week (1=Mon, ..., 7=Sun)
        const today = new Date().getDay()
        const dayOfWeek = today === 0 ? 7 : today
        
        // Calculate Active Doctors
        activeDoctorsCount = doctorsData.filter(doc => {
          if (!doc.schedules || !Array.isArray(doc.schedules)) return false
          return doc.schedules.some(sch => sch.day_of_week === dayOfWeek && (!sch.is_active || sch.is_active === true))
        }).length
        
        // Calculate Active Polys and collect quota data
        const activePolyIds = new Set()
        let totalBooked = 0
        
        doctorsData.forEach(doc => {
          if (doc.schedules && Array.isArray(doc.schedules)) {
            const schedule = doc.schedules.find(s => s.day_of_week === dayOfWeek)
            if (schedule) {
              activePolyIds.add(String(doc.poly_id))
              
              // Calculate booked from quota (max - remaining)
              const max = schedule.max_quota || 0
              const remaining = schedule.remaining_quota !== undefined ? schedule.remaining_quota : max
              totalBooked += Math.max(0, max - remaining)
            }
          }
        })
        activePolysCount = activePolyIds.size
        
        // Step 3: If no stats from dashboard, use quota-based data
        if (!gotStatsFromDashboard && totalBooked > 0) {
          console.log('📊 Using quota-based data. Total booked:', totalBooked)
          totalRegistered = totalBooked
          // For completed, we estimate based on booked count without waiting info
          // Since we can't get exact done count, use booked as estimate
          totalCompletedToday = totalBooked
        }
      }
    } catch (e) {
      console.error('Error fetching doctors:', e)
    }
    
    // Set final stats
    stats.value = {
      completedPatientsToday: totalCompletedToday,
      totalRegisteredToday: totalRegistered,
      activeDoctors: activeDoctorsCount,
      activePolys: activePolysCount
    }
    
    console.log('📊 Final stats:', stats.value)
    
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
        :icon="CalendarCheck" 
        label="Total Pasien Terdaftar Hari Ini" 
        :value="loading ? '...' : stats.totalRegisteredToday.toString()"
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
    
    <!-- DEBUG INFO (Hidden unless hovered/active - easy way for user to check) -->
    <div class="mt-8 p-4 bg-gray-100 rounded text-xs text-gray-500 font-mono hidden">
      DEBUG: 
      Registered: {{ stats.totalRegisteredToday }} | 
      Completed: {{ stats.completedPatientsToday }}
    </div>
  </section>
</template>
