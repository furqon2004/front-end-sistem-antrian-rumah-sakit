<script setup>
import { Users, Clock, Timer, Activity } from 'lucide-vue-next'
import StaffLayout from '@/components/staff/StaffLayout.vue'
import StatsCard from '@/components/staff/StatsCard.vue'

// Check authentication
const { isAuthenticated } = useStaffAuth()
const router = useRouter()

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/login')
  }
})

// Dashboard stats
const stats = ref({
  total_today: 0,
  remaining: 0,
  avg_service_minutes: 0,
  poly_name: 'Loading...',
  current_status: 'active'
})

const loading = ref(true)
const error = ref(null)

const { getDashboardStats } = useStaffQueue()

// Fetch dashboard stats
const fetchStats = async () => {
  try {
    loading.value = true
    const result = await getDashboardStats()
    
    if (result.success && result.data) {
      // Map API response to component state
      stats.value = {
        total_today: result.data.total_today || 0,
        remaining: result.data.waiting || 0,
        avg_service_minutes: result.data.avg_waiting_time || 0,
        poly_name: result.data.poly_name || 'Poli',
        current_status: result.data.poly_status || 'active'
      }
      console.log('📊 Dashboard stats loaded:', stats.value)
    } else {
      error.value = result.error || 'Gagal memuat statistik'
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err)
    error.value = 'Gagal memuat statistik'
  } finally {
    loading.value = false
  }
}

// Auto-refresh every 10 seconds
let refreshInterval = null

onMounted(() => {
  fetchStats()
  refreshInterval = setInterval(fetchStats, 10000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <StaffLayout>
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p class="text-gray-600">
          {{ stats.poly_name }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-800">{{ error }}</p>
        <button
          @click="fetchStats"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
          Coba Lagi
        </button>
      </div>

      <!-- Stats Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Antrian Hari Ini"
          :value="stats.total_today"
          :icon="Users"
          color="blue"
        />
        
        <StatsCard
          title="Antrian Tersisa"
          :value="stats.remaining"
          :icon="Clock"
          color="orange"
        />
        
        <StatsCard
          title="Rata-rata Waktu"
          :value="`${stats.avg_service_minutes} menit`"
          :icon="Timer"
          color="green"
        />
        
        <StatsCard
          title="Status Poli"
          :value="stats.current_status === 'active' ? 'Aktif' : 'Istirahat'"
          :icon="Activity"
          :color="stats.current_status === 'active' ? 'green' : 'purple'"
        />
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          Aksi Cepat
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NuxtLink
            to="/staff/queue"
            class="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition group"
          >
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-black">
                Kelola Antrian
              </h3>
              <p class="text-sm text-gray-600">
                Panggil dan layani pasien
              </p>
            </div>
            <Users class="w-6 h-6 text-gray-400 group-hover:text-black" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </StaffLayout>
</template>
