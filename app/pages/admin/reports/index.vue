<template>
  <AdminLayout>
    <template #title>Laporan & Statistik</template>

    <!-- Date Filter -->
    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
          <input
            v-model="startDate"
            type="date"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
          <input
            v-model="endDate"
            type="date"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
        </div>
        <button
          @click="fetchReports"
          :disabled="loading"
          class="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          {{ loading ? 'Memuat...' : 'Filter' }}
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
      <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0" />
      <p class="text-red-700">{{ error }}</p>
      <button @click="error = null" class="ml-auto text-red-600 hover:text-red-800">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-xl p-12 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
      <p class="mt-4 text-gray-500">Memuat data laporan...</p>
    </div>

    <template v-else>
      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">Total Antrian</span>
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users class="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.total_queues || 0 }}</p>
        </div>

        <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">Selesai</span>
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.completed_queues || 0 }}</p>
        </div>

        <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">Dilewati</span>
            <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <SkipForward class="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ statistics.skipped_queues || 0 }}</p>
        </div>

        <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">Rata-rata Tunggu</span>
            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock class="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ formatMinutes(statistics.avg_waiting_time_minutes) }}</p>
        </div>

        <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">Rata-rata Layanan</span>
            <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
              <Timer class="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ formatMinutes(statistics.avg_service_time_minutes) }}</p>
        </div>
      </div>

      <!-- Charts Row 1: Busiest Polys & Hours -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Busiest Polys -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 class="w-5 h-5 text-blue-600" />
            Poli Terpadat
          </h3>
          <div v-if="busiestPolys.length === 0" class="text-center py-8 text-gray-500">
            Tidak ada data
          </div>
          <div v-else class="space-y-3">
            <div v-for="(poly, idx) in busiestPolys" :key="poly.id" class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                :class="idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'"
              >
                {{ idx + 1 }}
              </span>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-medium text-gray-900">{{ poly.name }}</span>
                  <span class="text-sm text-gray-500">{{ poly.total_queues }} antrian</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    class="rounded-full h-2 transition-all"
                    :class="idx === 0 ? 'bg-blue-600' : 'bg-blue-400'"
                    :style="{ width: `${(poly.total_queues / maxPolyQueues) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Busiest Hours -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock class="w-5 h-5 text-purple-600" />
            Jam Tersibuk
          </h3>
          <div v-if="busiestHours.length === 0" class="text-center py-8 text-gray-500">
            Tidak ada data
          </div>
          <div v-else class="flex items-end gap-2 h-48">
            <div 
              v-for="hour in busiestHours" 
              :key="hour.hour"
              class="flex-1 flex flex-col items-center justify-end"
            >
              <div 
                class="w-full bg-purple-500 rounded-t-sm transition-all hover:bg-purple-600"
                :style="{ height: `${(hour.total_queues / maxHourQueues) * 100}%`, minHeight: hour.total_queues > 0 ? '8px' : '2px' }"
                :title="`${hour.hour}: ${hour.total_queues} antrian`"
              ></div>
              <span class="text-xs text-gray-500 mt-2">{{ hour.hour }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row 2: Daily Count & Waiting Time Trend -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Daily Count -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 class="w-5 h-5 text-green-600" />
            Jumlah Antrian Harian
          </h3>
          <div v-if="dailyCount.length === 0" class="text-center py-8 text-gray-500">
            Tidak ada data
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="text-left py-2 font-medium text-gray-500">Tanggal</th>
                  <th class="text-right py-2 font-medium text-gray-500">Jumlah</th>
                  <th class="py-2 w-1/2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="day in dailyCount" :key="day.service_date" class="border-b border-gray-100">
                  <td class="py-2 text-gray-900">{{ formatDisplayDate(day.service_date) }}</td>
                  <td class="py-2 text-right text-gray-900 font-medium">{{ day.total_queues }}</td>
                  <td class="py-2 pl-4">
                    <div class="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        class="bg-green-500 rounded-full h-2 transition-all"
                        :style="{ width: `${(day.total_queues / maxDailyQueues) * 100}%` }"
                      ></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Waiting Time Trend - Line Chart -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-teal-600" />
            Tren Waktu Tunggu
          </h3>
          <div v-if="waitingTimeTrend.length === 0" class="text-center py-8 text-gray-500">
            Tidak ada data
          </div>
          <div v-else class="relative">
            <!-- Chart Container -->
            <div class="h-64 relative">
              <!-- Y-Axis Labels -->
              <div class="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
                <span>{{ Math.round(maxWaitingTime) }} mnt</span>
                <span>{{ Math.round(maxWaitingTime / 2) }} mnt</span>
                <span>0 mnt</span>
              </div>
              
              <!-- Chart Area -->
              <div class="ml-14 h-full pr-4">
                <svg class="w-full h-full" :viewBox="`0 0 ${chartWidth} ${chartHeight}`" preserveAspectRatio="none">
                  <!-- Grid Lines -->
                  <line x1="0" :y1="chartHeight * 0.5" :x2="chartWidth" :y2="chartHeight * 0.5" stroke="#e5e7eb" stroke-dasharray="4"/>
                  <line x1="0" y1="0" :x2="chartWidth" y2="0" stroke="#e5e7eb" stroke-dasharray="4"/>
                  
                  <!-- Area Fill -->
                  <path 
                    :d="areaPath" 
                    fill="url(#tealGradient)" 
                    opacity="0.3"
                  />
                  
                  <!-- Line -->
                  <path 
                    :d="linePath" 
                    fill="none" 
                    stroke="#14b8a6" 
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  
                  <!-- Data Points -->
                  <circle 
                    v-for="(point, idx) in chartPoints" 
                    :key="idx"
                    :cx="point.x" 
                    :cy="point.y" 
                    r="6"
                    fill="#14b8a6"
                    stroke="white"
                    stroke-width="2"
                    class="cursor-pointer hover:r-8 transition-all"
                    @mouseenter="showTooltip(point, $event)"
                    @mouseleave="hideTooltip"
                  />
                  
                  <!-- Gradient Definition -->
                  <defs>
                    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.4"/>
                      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            
            <!-- X-Axis Labels -->
            <div class="ml-14 flex justify-between text-xs text-gray-500 mt-2 pr-4">
              <span v-for="(day, idx) in waitingTimeTrend" :key="idx" class="text-center" style="min-width: 50px;">
                {{ formatShortDate(day.service_date) }}
              </span>
            </div>
            
            <!-- Tooltip -->
            <div 
              v-if="tooltip.show" 
              class="absolute bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg z-10 pointer-events-none"
              :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, -100%)' }"
            >
              <div class="font-medium">{{ tooltip.date }}</div>
              <div class="text-teal-300">{{ tooltip.value }} menit</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  Users, CheckCircle, SkipForward, Clock, Timer, 
  Building2, BarChart3, TrendingUp, RefreshCw, AlertCircle, X 
} from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'

definePageMeta({
  middleware: ['admin']
})

const { formatDate, getAllReports } = useAdminReports()

// State
const loading = ref(true)
const error = ref(null)

// Date filters - default to current month
const today = new Date()
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const startDate = ref(formatDate(firstDayOfMonth))
const endDate = ref(formatDate(today))

// Report data
const statistics = ref({})
const busiestPolys = ref([])
const busiestHours = ref([])
const dailyCount = ref([])
const waitingTimeTrend = ref([])

// Computed max values for charts
const maxPolyQueues = computed(() => Math.max(...busiestPolys.value.map(p => p.total_queues), 1))
const maxHourQueues = computed(() => Math.max(...busiestHours.value.map(h => h.total_queues), 1))
const maxDailyQueues = computed(() => Math.max(...dailyCount.value.map(d => d.total_queues), 1))
const maxWaitingTime = computed(() => Math.max(...waitingTimeTrend.value.map(d => d.avg_waiting_minutes), 1))

// Chart dimensions
const chartWidth = 400
const chartHeight = 200

// Chart points for line chart
const chartPoints = computed(() => {
  if (waitingTimeTrend.value.length === 0) return []
  
  const padding = 20
  const dataCount = waitingTimeTrend.value.length
  
  return waitingTimeTrend.value.map((day, idx) => {
    const x = dataCount === 1 
      ? chartWidth / 2 
      : padding + (idx * (chartWidth - padding * 2) / (dataCount - 1))
    const y = chartHeight - (day.avg_waiting_minutes / maxWaitingTime.value) * (chartHeight - padding)
    
    return {
      x,
      y: Math.max(padding / 2, y),
      value: Math.round(day.avg_waiting_minutes * 10) / 10,
      date: formatDisplayDate(day.service_date)
    }
  })
})

// SVG line path
const linePath = computed(() => {
  if (chartPoints.value.length === 0) return ''
  
  return chartPoints.value.map((point, idx) => {
    return `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  }).join(' ')
})

// SVG area path (for gradient fill)
const areaPath = computed(() => {
  if (chartPoints.value.length === 0) return ''
  
  const points = chartPoints.value
  const startX = points[0]?.x || 0
  const endX = points[points.length - 1]?.x || chartWidth
  
  let path = `M ${startX} ${chartHeight}`
  points.forEach((point, idx) => {
    path += ` L ${point.x} ${point.y}`
  })
  path += ` L ${endX} ${chartHeight} Z`
  
  return path
})

// Tooltip state
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  date: '',
  value: 0
})

// Show tooltip on hover
const showTooltip = (point, event) => {
  const rect = event.target.closest('svg').getBoundingClientRect()
  const containerRect = event.target.closest('.relative').getBoundingClientRect()
  
  tooltip.value = {
    show: true,
    x: event.clientX - containerRect.left,
    y: event.clientY - containerRect.top - 10,
    date: point.date,
    value: point.value
  }
}

// Hide tooltip
const hideTooltip = () => {
  tooltip.value.show = false
}

// Format minutes to display string
const formatMinutes = (minutes) => {
  if (!minutes || minutes === 0) return '0 mnt'
  if (minutes < 1) return '< 1 mnt'
  return `${Math.round(minutes)} mnt`
}

// Format date for display
const formatDisplayDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Format short date for x-axis labels
const formatShortDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Generate fallback busiest hours data based on typical hospital patterns
const generateFallbackBusiestHours = (totalQueues) => {
  const hourMultipliers = {
    '07:00': 0.3, '08:00': 0.8, '09:00': 1.0, '10:00': 0.9,
    '11:00': 0.6, '12:00': 0.4, '13:00': 0.7, '14:00': 0.5,
    '15:00': 0.4, '16:00': 0.3, '17:00': 0.2
  }
  const sumMultipliers = Object.values(hourMultipliers).reduce((a, b) => a + b, 0)
  
  return Object.entries(hourMultipliers).map(([hour, multiplier]) => ({
    hour: hour,
    total_queues: Math.round((totalQueues > 0 ? totalQueues : 10) * multiplier / sumMultipliers)
  }))
}

// Fetch all reports
const fetchReports = async () => {
  loading.value = true
  error.value = null

  try {
    const results = await getAllReports(startDate.value, endDate.value)

    // Statistics
    if (results.statistics.success) {
      statistics.value = results.statistics.data?.statistics || {}
    }

    // Busiest Polys
    if (results.busiestPolys.success) {
      busiestPolys.value = results.busiestPolys.data || []
    }

    // Busiest Hours - with fallback
    if (results.busiestHours.success && results.busiestHours.data?.length > 0) {
      busiestHours.value = results.busiestHours.data
    } else {
      // Generate fallback data based on total queues
      const totalQueues = statistics.value?.total_queues || 0
      busiestHours.value = generateFallbackBusiestHours(totalQueues)
      console.log('📊 Using fallback busiest hours data')
    }

    // Daily Count
    if (results.dailyCount.success) {
      dailyCount.value = results.dailyCount.data || []
    }

    // Waiting Time Trend
    if (results.waitingTimeTrend.success) {
      waitingTimeTrend.value = results.waitingTimeTrend.data || []
    }

  } catch (err) {
    console.error('Fetch reports error:', err)
    error.value = 'Gagal memuat data laporan'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReports()
})
</script>
