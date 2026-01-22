<script setup>
import { Phone, SkipForward, RefreshCw, Play, CheckCircle, Clock, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next'
import StaffLayout from '@/components/staff/StaffLayout.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

// Check authentication
const { isAuthenticated } = useStaffAuth()
const router = useRouter()

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/login')
  }
})

// Queue operations
const {
  getQueueList,
  getSkippedQueue,
  callNext,
  skipTicket,
  recallTicket,
  recallSkippedTicket,
  startService,
  finishService,
  getDashboardStats
} = useStaffQueue()

// Queue types for name lookup
const { getQueueTypes } = useAdminQueueTypes()
const queueTypesMap = ref({})

// State
const currentTicket = ref(null)
const waitingQueue = ref([])
const skippedQueue = ref([])
const loading = ref(true)
const actionLoading = ref(false)
const error = ref(null)
const successMessage = ref(null)

// Dashboard Stats
const dashboardStats = ref({
  total_today: 0,
  waiting: 0,
  serving: 0,
  done: 0,
  avg_waiting_time: 0
})

const fetchStats = async () => {
  const result = await getDashboardStats()
  if (result.success) {
    dashboardStats.value = result.data
  }
}

// Service timer state
const serviceStartTime = ref(null)
const elapsedSeconds = ref(0)
let timerInterval = null

// Format elapsed time to MM:SS or HH:MM:SS
const formatElapsedTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Start the timer
const startTimer = () => {
  serviceStartTime.value = new Date()
  elapsedSeconds.value = 0
  
  // Update every second
  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor((new Date() - serviceStartTime.value) / 1000)
  }, 1000)
}

// Stop the timer and return elapsed time in minutes
const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  const minutes = Math.round(elapsedSeconds.value / 60 * 100) / 100
  console.log(`⏱️ Service duration: ${formatElapsedTime(elapsedSeconds.value)} (${minutes} minutes)`)
  return minutes
}

// Fetch queue types for name lookup
const fetchQueueTypes = async () => {
  const result = await getQueueTypes()
  if (result.success && result.data) {
    // Create a map of queue_type_id -> queue_type object
    const map = {}
    result.data.forEach(qt => {
      map[qt.id] = qt
    })
    queueTypesMap.value = map
    console.log('📋 Queue types loaded:', Object.keys(map).length)
  }
}

// Helper to add queue type name to ticket
const enrichTicketWithQueueType = (ticket) => {
  const queueType = queueTypesMap.value[ticket.queue_type_id]
  return {
    ...ticket,
    queue_type_name: queueType?.name || ticket.queue_type?.name || ticket.queue_type_name || 'Layanan'
  }
}

// Pagination states
const ITEMS_PER_PAGE = 5
const waitingPage = ref(1)
const skippedPage = ref(1)

// Modal states
const showSkipModal = ref(false)
const showRecallModal = ref(false)
const showStartModal = ref(false)
const showCompleteModal = ref(false)
const showRecallSkippedModal = ref(false)
const ticketToRecall = ref(null)

// Computed for pagination
const paginatedWaitingQueue = computed(() => {
  const start = (waitingPage.value - 1) * ITEMS_PER_PAGE
  return waitingQueue.value.slice(start, start + ITEMS_PER_PAGE)
})

const totalWaitingPages = computed(() => Math.ceil(waitingQueue.value.length / ITEMS_PER_PAGE))

const paginatedSkippedQueue = computed(() => {
  const start = (skippedPage.value - 1) * ITEMS_PER_PAGE
  return skippedQueue.value.slice(start, start + ITEMS_PER_PAGE)
})

const totalSkippedPages = computed(() => Math.ceil(skippedQueue.value.length / ITEMS_PER_PAGE))

// Status colors
const statusColors = {
  WAITING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CALLED: 'bg-blue-100 text-blue-800 border-blue-200',
  SERVING: 'bg-green-100 text-green-800 border-green-200',
  DONE: 'bg-gray-100 text-gray-800 border-gray-200',
  SKIPPED: 'bg-red-100 text-red-800 border-red-200'
}

const fetchQueue = async () => {
  // First, make sure queue types are loaded
  if (Object.keys(queueTypesMap.value).length === 0) {
    await fetchQueueTypes()
  }
  
  // Fetch today's queue (WAITING, CALLED, SERVING)
  const result = await getQueueList()
  
  if (result.success) {
    const data = result.data.map(enrichTicketWithQueueType)
    
    // Find current ticket (CALLED or SERVING)
    currentTicket.value = data.find(t => t.status === 'CALLED' || t.status === 'SERVING') || null
    
    // Get waiting queue only (exclude CANCELLED and SKIPPED)
    waitingQueue.value = data.filter(t => t.status === 'WAITING')
  } else {
    error.value = result.error
  }
  
  // Fetch skipped queue from dedicated endpoint
  const skippedResult = await getSkippedQueue()
  if (skippedResult.success) {
    skippedQueue.value = skippedResult.data.map(enrichTicketWithQueueType)
  }
  
  // Fetch dashboard stats
  await fetchStats()
  
  loading.value = false
}

// Call next ticket
const handleCallNext = async () => {
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  const result = await callNext()
  
  if (result.success) {
    successMessage.value = result.message
    await fetchQueue()
  } else {
    error.value = result.error
  }
  
  actionLoading.value = false
}

// Skip ticket - show modal first
const openSkipModal = () => {
  if (!currentTicket.value) return
  showSkipModal.value = true
}

const confirmSkip = async () => {
  showSkipModal.value = false
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  const result = await skipTicket(currentTicket.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    await fetchQueue()
  } else {
    error.value = result.error
  }
  
  actionLoading.value = false
}

// Recall ticket - show modal first
const openRecallModal = () => {
  if (!currentTicket.value) return
  showRecallModal.value = true
}

const confirmRecall = async () => {
  showRecallModal.value = false
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  const result = await recallTicket(currentTicket.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    await fetchQueue()
  } else {
    error.value = result.error
  }
  
  actionLoading.value = false
}

// Handle re-queue skipped ticket - show modal first
const openRecallSkippedModal = (ticket) => {
  ticketToRecall.value = ticket
  showRecallSkippedModal.value = true
}

const confirmRecallSkipped = async () => {
  showRecallSkippedModal.value = false
  
  if (!ticketToRecall.value) return
  
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  // Use recallSkippedTicket to change status from SKIPPED → WAITING
  const result = await recallSkippedTicket(ticketToRecall.value.id)
  
  if (result.success) {
    successMessage.value = result.message || 'Nomor yang dilewati berhasil ditambahkan ke antrian menunggu'
    await fetchQueue()
  } else {
    error.value = result.error
  }
  
  ticketToRecall.value = null
  actionLoading.value = false
}

// Start service - show modal first
const openStartModal = () => {
  if (!currentTicket.value) return
  showStartModal.value = true
}

const confirmStartService = async () => {
  showStartModal.value = false
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  const result = await startService(currentTicket.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    // Start the timer when service begins
    startTimer()
    await fetchQueue()
  } else {
    error.value = result.error
  }
  
  actionLoading.value = false
}

// Complete service - show modal first
const openCompleteModal = () => {
  if (!currentTicket.value) return
  showCompleteModal.value = true
}

const confirmComplete = async () => {
  showCompleteModal.value = false
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  // Stop timer and get elapsed minutes
  const serviceDuration = stopTimer()
  
  const result = await finishService(currentTicket.value.id)
  
  if (result.success) {
    successMessage.value = `${result.message} (Durasi layanan: ${formatElapsedTime(elapsedSeconds.value)})`
    // Reset timer state
    elapsedSeconds.value = 0
    serviceStartTime.value = null
    await fetchQueue()
  } else {
    error.value = result.error
  }
  
  actionLoading.value = false
}

// Auto-refresh every 3 seconds
let refreshInterval = null

onMounted(() => {
  fetchQueue()
  refreshInterval = setInterval(fetchQueue, 3000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  // Cleanup service timer
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

// Clear messages after 3 seconds
watch([successMessage, error], () => {
  if (successMessage.value || error.value) {
    setTimeout(() => {
      successMessage.value = null
      error.value = null
    }, 3000)
  }
})
</script>

<template>
  <StaffLayout>
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Kelola Antrian
        </h1>
        <p class="text-gray-600">
          Panggil dan layani pasien
        </p>
      </div>

      <!-- Dashboard Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p class="text-xs text-gray-500 uppercase font-semibold mb-1">Total Hari Ini</p>
          <p class="text-2xl font-bold text-gray-900">{{ dashboardStats.total_today }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-yellow-100">
          <p class="text-xs text-yellow-600 uppercase font-semibold mb-1">Menunggu</p>
          <p class="text-2xl font-bold text-yellow-700">{{ dashboardStats.waiting }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
          <p class="text-xs text-blue-600 uppercase font-semibold mb-1">Dilayani</p>
          <p class="text-2xl font-bold text-blue-700">{{ dashboardStats.serving }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-green-100">
          <p class="text-xs text-green-600 uppercase font-semibold mb-1">Selesai</p>
          <p class="text-2xl font-bold text-green-700">{{ dashboardStats.done }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p class="text-xs text-gray-500 uppercase font-semibold mb-1">Avg Waktu Tunggu</p>
          <p class="text-2xl font-bold text-gray-900">{{ dashboardStats.avg_waiting_time }}<span class="text-sm font-normal text-gray-500 ml-1">mnt</span></p>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
        {{ successMessage }}
      </div>
      
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>

      <div v-else class="space-y-6">
        <!-- Current Ticket -->
        <div class="bg-white rounded-2xl p-8 shadow-lg border-2 border-black">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">
            Nomor Saat Ini
          </h2>
          
          <div v-if="currentTicket" class="space-y-6">
            <!-- Large Display Number -->
            <div class="text-center py-8 bg-black text-white rounded-xl">
              <p class="text-6xl font-bold mb-2">
                {{ currentTicket.display_number }}
              </p>
              <p :class="['inline-block px-4 py-2 rounded-full text-sm font-medium border', statusColors[currentTicket.status]]">
                {{ currentTicket.status }}
              </p>
            </div>

            <!-- Ticket Info -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-600">Waktu Ambil</p>
                <p class="font-semibold">{{ new Date(currentTicket.issued_at).toLocaleTimeString('id-ID') }}</p>
              </div>
              <div v-if="currentTicket.called_at">
                <p class="text-gray-600">Waktu Panggil</p>
                <p class="font-semibold">{{ new Date(currentTicket.called_at).toLocaleTimeString('id-ID') }}</p>
              </div>
            </div>
            
            <!-- Service Timer Display -->
            <div v-if="serviceStartTime && currentTicket.status === 'SERVING'" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <p class="text-sm text-green-600 mb-1">⏱️ Waktu Layanan</p>
              <p class="text-3xl font-bold text-green-700 font-mono">{{ formatElapsedTime(elapsedSeconds) }}</p>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-2xl">
            <Clock class="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p class="text-lg font-medium">Tidak ada nomor yang sedang dilayani</p>
            <p class="text-sm mt-2">Klik "Panggil Berikutnya" untuk memulai</p>
          </div>
        </div>
      </div>

        <!-- Actions Row (Always Visible) -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-4">
          <h3 class="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Kontrol Antrian</h3>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              @click="openRecallModal"
              :disabled="actionLoading || !currentTicket || currentTicket.status === 'SERVING'"
              class="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <RefreshCw class="w-4 h-4" />
              <span class="text-sm font-medium">Recall</span>
            </button>
            
            <button
              @click="openSkipModal"
              :disabled="actionLoading || !currentTicket || currentTicket.status === 'SERVING'"
              class="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <SkipForward class="w-4 h-4" />
              <span class="text-sm font-medium">Skip</span>
            </button>
            
            <button
              @click="openStartModal"
              :disabled="actionLoading || !currentTicket || currentTicket.status !== 'CALLED'"
              class="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <Play class="w-4 h-4" />
              <span class="text-sm font-medium">Mulai</span>
            </button>
            
            <button
              @click="openCompleteModal"
              :disabled="actionLoading || !currentTicket || currentTicket.status !== 'SERVING'"
              class="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <CheckCircle class="w-4 h-4" />
              <span class="text-sm font-medium">Selesai</span>
            </button>
          </div>
        </div>

        <!-- Call Next Button -->
        <button
          @click="handleCallNext"
          :disabled="actionLoading || currentTicket"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-semibold"
        >
          <Phone class="w-6 h-6" />
          <span>Panggil Berikutnya</span>
        </button>

        <!-- Waiting Queue -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Antrian Menunggu ({{ waitingQueue.length }})
          </h2>
          
          <div v-if="waitingQueue.length > 0" class="space-y-2">
            <div
              v-for="ticket in paginatedWaitingQueue"
              :key="ticket.id"
              class="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <div class="flex items-center gap-4">
                <div class="text-2xl font-bold text-gray-900">
                  {{ ticket.display_number }}
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-800">
                    {{ ticket.queue_type?.name || ticket.queue_type_name || 'Layanan' }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ new Date(ticket.issued_at).toLocaleTimeString('id-ID') }}
                  </div>
                </div>
              </div>
              <span :class="['px-3 py-1 rounded-full text-xs font-medium border', statusColors[ticket.status]]">
                {{ ticket.status }}
              </span>
            </div>
            
            <!-- Waiting Queue Pagination -->
            <div v-if="totalWaitingPages > 1" class="flex items-center justify-center gap-2 pt-4">
              <button
                @click="waitingPage = Math.max(1, waitingPage - 1)"
                :disabled="waitingPage === 1"
                class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft class="w-5 h-5" />
              </button>
              <span class="text-sm text-gray-600">
                {{ waitingPage }} / {{ totalWaitingPages }}
              </span>
              <button
                @click="waitingPage = Math.min(totalWaitingPages, waitingPage + 1)"
                :disabled="waitingPage === totalWaitingPages"
                class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-gray-500">
            <p>Tidak ada antrian menunggu</p>
          </div>
        </div>

        <!-- Skipped Queue Section -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
          <h2 class="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
            <SkipForward class="w-5 h-5" />
            Antrian Terlewati ({{ skippedQueue.length }})
          </h2>
          
          <div v-if="skippedQueue.length > 0" class="space-y-2">
            <div
              v-for="ticket in paginatedSkippedQueue"
              :key="ticket.id"
              class="flex items-center justify-between p-4 border border-red-200 rounded-xl hover:bg-red-50 transition"
            >
              <div class="flex items-center gap-4">
                <div class="text-2xl font-bold text-red-800">
                  {{ ticket.display_number }}
                </div>
                <div>
                  <div class="text-sm font-medium text-red-700">
                    {{ ticket.queue_type?.name || ticket.queue_type_name || 'Layanan' }}
                  </div>
                  <div class="text-xs text-red-500">
                    {{ new Date(ticket.issued_at).toLocaleTimeString('id-ID') }}
                  </div>
                </div>
              </div>
              <button
                @click="openRecallSkippedModal(ticket)"
                :disabled="actionLoading"
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <RotateCcw class="w-4 h-4" />
                <span class="text-sm font-medium">Kembalikan ke Antrian</span>
              </button>
            </div>
            
            <!-- Skipped Queue Pagination -->
            <div v-if="totalSkippedPages > 1" class="flex items-center justify-center gap-2 pt-4">
              <button
                @click="skippedPage = Math.max(1, skippedPage - 1)"
                :disabled="skippedPage === 1"
                class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft class="w-5 h-5" />
              </button>
              <span class="text-sm text-gray-600">
                {{ skippedPage }} / {{ totalSkippedPages }}
              </span>
              <button
                @click="skippedPage = Math.min(totalSkippedPages, skippedPage + 1)"
                :disabled="skippedPage === totalSkippedPages"
                class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-gray-500">
            <p>Tidak ada antrian terlewati</p>
          </div>
        </div>
      </div>
    <!-- Skip Confirmation Modal -->
    <ConfirmModal
      :show="showSkipModal"
      title="Skip Antrian"
      message="Apakah Anda yakin ingin melewati nomor ini? Nomor akan masuk ke daftar terlewati dan dapat dipanggil kembali oleh staff."
      confirm-text="Ya, Skip"
      cancel-text="Batal"
      type="warning"
      @confirm="confirmSkip"
      @cancel="showSkipModal = false"
    />

      <!-- Recall Confirmation Modal -->
      <ConfirmModal
        :show="showRecallModal"
        title="Recall Antrian"
        message="Apakah Anda yakin ingin memanggil ulang nomor ini?"
        confirm-text="Ya, Panggil Ulang"
        cancel-text="Batal"
        type="info"
        @confirm="confirmRecall"
        @cancel="showRecallModal = false"
      />

      <!-- Recall Skipped Confirmation Modal -->
      <ConfirmModal
        :show="showRecallSkippedModal"
        title="Kembalikan ke Antrian"
        :message="`Apakah Anda yakin ingin mengembalikan nomor ${ticketToRecall?.display_number || ''} ke antrian menunggu? Nomor akan ditambahkan ke posisi paling bawah antrian.`"
        confirm-text="Ya, Kembalikan"
        cancel-text="Batal"
        type="info"
        @confirm="confirmRecallSkipped"
        @cancel="showRecallSkippedModal = false"
      />

      <!-- Start Service Confirmation Modal -->
      <ConfirmModal
        :show="showStartModal"
        title="Mulai Layanan"
        message="Apakah Anda yakin ingin memulai layanan untuk pasien ini? Timer akan mulai dihitung."
        confirm-text="Ya, Mulai"
        cancel-text="Batal"
        type="info"
        @confirm="confirmStartService"
        @cancel="showStartModal = false"
      />
      <!-- Complete Service Confirmation Modal -->
    <ConfirmModal
      :show="showCompleteModal"
      title="Selesai Layanan"
      message="Apakah layanan untuk pasien ini sudah selesai?"
      confirm-text="Ya, Selesai"
      cancel-text="Batal"
      type="success"
      @confirm="confirmComplete"
      @cancel="showCompleteModal = false"
    />
  </StaffLayout>
</template>
