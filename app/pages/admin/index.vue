<template>
  <AdminLayout>
    <template #title>Dashboard</template>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalToday }}</p>
            <p class="text-sm text-gray-500">Antrian Hari Ini</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <Clock class="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.remaining }}</p>
            <p class="text-sm text-gray-500">Antrian Tersisa</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.completed }}</p>
            <p class="text-sm text-gray-500">Selesai Dilayani</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Timer class="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.avgServiceTime }} mnt</p>
            <p class="text-sm text-gray-500">Rata-rata Layanan</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Busiest Poly -->
      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          <TrendingUp class="w-5 h-5 inline mr-2" />
          Poli Terpadat Hari Ini
        </h2>
        
        <div v-if="loading" class="animate-pulse space-y-3">
          <div class="h-10 bg-gray-200 rounded"></div>
          <div class="h-10 bg-gray-200 rounded"></div>
          <div class="h-10 bg-gray-200 rounded"></div>
        </div>

        <div v-else-if="polyStats.length === 0" class="text-center py-8 text-gray-500">
          <p>Belum ada data antrian hari ini</p>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="(poly, index) in sortedPolyStats" 
            :key="poly.id"
            class="flex items-center gap-3"
          >
            <span 
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-gray-300 text-gray-700' :
                index === 2 ? 'bg-orange-300 text-orange-900' :
                'bg-gray-100 text-gray-600'
              ]"
            >
              {{ index + 1 }}
            </span>
            <div class="flex-1">
              <div class="flex justify-between items-center mb-1">
                <span class="font-medium text-gray-900">{{ poly.name }}</span>
                <span class="text-sm text-gray-600">{{ poly.total }} antrian</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-500"
                  :class="index === 0 ? 'bg-gray-900' : 'bg-gray-400'"
                  :style="{ width: `${(poly.total / maxPolyTotal) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Peak Hours -->
      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          <Activity class="w-5 h-5 inline mr-2" />
          Jam Sibuk Hari Ini
        </h2>
        
        <div v-if="loading" class="animate-pulse">
          <div class="h-40 bg-gray-200 rounded"></div>
        </div>

        <div v-else class="flex items-end justify-between gap-2 h-40">
          <div 
            v-for="hour in peakHours" 
            :key="hour.hour"
            class="flex-1 flex flex-col items-center"
          >
            <div 
              class="w-full rounded-t transition-all duration-300 cursor-pointer hover:opacity-80"
              :class="hour.isPeak ? 'bg-gray-900' : 'bg-gray-300'"
              :style="{ height: `${(hour.count / maxHourCount) * 100}%`, minHeight: '8px' }"
              :title="`${hour.hour}:00 - ${hour.count} antrian`"
            ></div>
            <span class="text-xs text-gray-500 mt-1">{{ hour.hour }}</span>
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Jam Tersibuk</p>
              <p class="font-bold text-gray-900">{{ peakHourLabel }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Total Jam Sibuk</p>
              <p class="font-bold text-gray-900">{{ peakHourCount }} antrian</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Akses Cepat</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <NuxtLink 
          to="/admin/polys"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
        >
          <Building2 class="w-8 h-8 text-gray-700" />
          <span class="text-sm font-medium">Poliklinik</span>
        </NuxtLink>

        <NuxtLink 
          to="/admin/queue-types"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
        >
          <ListTodo class="w-8 h-8 text-gray-700" />
          <span class="text-sm font-medium">Jenis Antrian</span>
        </NuxtLink>

        <NuxtLink 
          to="/admin/doctors"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
        >
          <Stethoscope class="w-8 h-8 text-gray-700" />
          <span class="text-sm font-medium">Dokter</span>
        </NuxtLink>

        <NuxtLink 
          to="/admin/schedules"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
        >
          <Calendar class="w-8 h-8 text-gray-700" />
          <span class="text-sm font-medium">Jadwal</span>
        </NuxtLink>

        <NuxtLink 
          to="/admin/staff"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
        >
          <Users class="w-8 h-8 text-gray-700" />
          <span class="text-sm font-medium">Staff</span>
        </NuxtLink>

        <NuxtLink 
          to="/admin/reports"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition"
        >
          <BarChart3 class="w-8 h-8 text-gray-700" />
          <span class="text-sm font-medium">Laporan</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Per Poly Stats Table -->
    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Detail Antrian Per Poli Hari Ini</h2>
      
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">Memuat data...</p>
      </div>

      <div v-else-if="polyStats.length === 0" class="text-center py-8 text-gray-500">
        <p>Belum ada data antrian hari ini</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Poli</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-gray-500">Total</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-gray-500">Menunggu</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-gray-500">Dilayani</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-gray-500">Selesai</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-gray-500">Rata-rata</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="poly in polyStats" 
              :key="poly.id"
              class="border-b border-gray-100 hover:bg-gray-50"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 class="w-4 h-4 text-gray-700" />
                  </div>
                  <span class="font-medium text-gray-900">{{ poly.name }}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-center text-gray-900 font-bold">{{ poly.total }}</td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {{ poly.waiting }}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ poly.serving || 0 }}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {{ poly.completed }}
                </span>
              </td>
              <td class="py-3 px-4 text-center text-gray-600">{{ poly.avgTime }} mnt</td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50">
            <tr class="font-semibold">
              <td class="py-3 px-4 text-gray-900">Total</td>
              <td class="py-3 px-4 text-center text-gray-900">{{ totalStats.total }}</td>
              <td class="py-3 px-4 text-center text-yellow-700">{{ totalStats.waiting }}</td>
              <td class="py-3 px-4 text-center text-blue-700">{{ totalStats.serving }}</td>
              <td class="py-3 px-4 text-center text-green-700">{{ totalStats.completed }}</td>
              <td class="py-3 px-4 text-center text-gray-600">{{ totalStats.avgTime }} mnt</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  Users, Clock, CheckCircle, Timer, Building2, Stethoscope, 
  BarChart3, TrendingUp, Activity, ListTodo, Calendar 
} from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'

// Page meta
definePageMeta({
  middleware: ['admin']
})

// Use admin dashboard composable
const { 
  getDashboardStats, 
  getPeakHours, 
  calculateSummary,
  generateFallbackPeakHours 
} = useAdminDashboard()

// Reactive state
const loading = ref(true)
const stats = ref({
  totalToday: 0,
  remaining: 0,
  completed: 0,
  avgServiceTime: 0
})
const polyStats = ref([])
const peakHours = ref([])

// Computed properties
const sortedPolyStats = computed(() => {
  return [...polyStats.value].sort((a, b) => b.total - a.total)
})

const maxPolyTotal = computed(() => {
  return Math.max(...polyStats.value.map(p => p.total), 1)
})

const maxHourCount = computed(() => {
  return Math.max(...peakHours.value.map(h => h.count), 1)
})

const peakHourLabel = computed(() => {
  const peak = peakHours.value.find(h => h.isPeak)
  return peak ? `${peak.hour}:00 - ${peak.hour + 1}:00` : '-'
})

const peakHourCount = computed(() => {
  const peak = peakHours.value.find(h => h.isPeak)
  return peak ? peak.count : 0
})

const totalStats = computed(() => {
  const total = polyStats.value.reduce((sum, p) => sum + p.total, 0)
  const waiting = polyStats.value.reduce((sum, p) => sum + p.waiting, 0)
  const serving = polyStats.value.reduce((sum, p) => sum + (p.serving || 0), 0)
  const completed = polyStats.value.reduce((sum, p) => sum + p.completed, 0)
  
  // Use weighted average based on completed count (same as calculateSummary)
  // Only count polys that have actual data (completed > 0)
  const polysWithData = polyStats.value.filter(p => p.completed > 0)
  let avgTime = 0
  if (polysWithData.length > 0) {
    const totalWeightedTime = polysWithData.reduce((sum, p) => sum + (p.avgTime * p.completed), 0)
    const totalCompleted = polysWithData.reduce((sum, p) => sum + p.completed, 0)
    avgTime = totalCompleted > 0 ? Math.round(totalWeightedTime / totalCompleted) : 0
  }
  
  return { total, waiting, serving, completed, avgTime }
})

/**
 * Fetch all dashboard data from API
 */
const fetchDashboardData = async () => {
  loading.value = true

  try {
    // Fetch dashboard statistics from /v1/admin/dashboard
    const dashboardResult = await getDashboardStats()
    
    if (dashboardResult.success) {
      polyStats.value = dashboardResult.data
      stats.value = calculateSummary(dashboardResult.data)
    }

    // Fetch peak hours data
    const peakHoursResult = await getPeakHours()
    
    if (peakHoursResult.success && peakHoursResult.data.length > 0) {
      peakHours.value = peakHoursResult.data
    } else {
      // Generate fallback peak hours if API doesn't provide
      peakHours.value = generateFallbackPeakHours(stats.value.totalToday)
    }

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}

// Fetch data on mount
onMounted(() => {
  fetchDashboardData()
})
</script>
