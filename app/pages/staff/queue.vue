<script setup>
import { Phone, SkipForward, RefreshCw, Play, CheckCircle, Clock, ChevronLeft, ChevronRight, RotateCcw, Stethoscope, Users } from 'lucide-vue-next'
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
  getDoctorsList,
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
const allQueueData = ref([]) // Raw queue data from API
const currentTicket = ref(null) // Currently selected doctor's active ticket
const currentTicketsByDoctor = ref({}) // Map: doctorId -> current ticket (CALLED/SERVING)
const waitingQueue = ref([]) // Filtered by selected doctor
const waitingQueueByDoctor = ref({}) // Map: doctorId -> waiting tickets
const skippedQueue = ref([])
const loading = ref(true)
const actionLoading = ref(false)
const error = ref(null)
const successMessage = ref(null)

// Override map: ticketId -> doctorId (to persist forced assignments through auto-refresh)
const doctorAssignmentOverrides = ref({})

// Toast alert state
const toast = ref({
  show: false,
  message: '',
  type: 'success' // 'success', 'error', 'info'
})
let toastTimeout = null

// Show toast alert
const showToast = (message, type = 'success') => {
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }
  
  toast.value = { show: true, message, type }
  
  // Auto-hide after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Doctor state
const doctors = ref([]) // List of doctors for this poly
const selectedDoctorId = ref(null) // Currently selected doctor filter (null = all)

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

// Per-doctor modal states
const showPerDoctorModal = ref(false)
const perDoctorAction = ref(null) // 'recall', 'skip', 'start', 'finish', 'call'
const perDoctorTarget = ref(null) // The doctor object

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
  
  // Fetch dashboard stats first to get staff's poly_id
  const statsResult = await getDashboardStats()
  if (statsResult.success) {
    dashboardStats.value = statsResult.data
  }
  
  // Get staff's poly_id for filtering doctors
  const staffPolyId = dashboardStats.value.poly_id
  
  // Fetch doctors list filtered by staff's poly
  const doctorsResult = await getDoctorsList(staffPolyId)
  if (doctorsResult.success) {
    doctors.value = doctorsResult.data
    console.log('👨‍⚕️ Loaded doctors for poly', staffPolyId, ':', doctors.value.map(d => d.name))
  }
  
  // Fetch today's queue (WAITING, CALLED, SERVING)
  const result = await getQueueList()
  
  if (result.success) {
    const data = result.data.map(enrichTicketWithQueueType)
    allQueueData.value = data
    
    // Group current tickets (CALLED/SERVING) by doctor_id
    const currentByDoctor = {}
    const waitingByDoctor = {}
    
    // Initialize empty arrays for each doctor
    doctors.value.forEach(doc => {
      currentByDoctor[doc.id] = null
      waitingByDoctor[doc.id] = []
    })
    
    // Categorize each ticket - NO unassigned category, all go to actual doctors
    let roundRobinIndex = 0
    const doctorIds = doctors.value.map(d => d.id)
    const firstDoctorId = doctorIds[0] || null
    console.log('🎫 Processing tickets, available doctors:', doctorIds)
    console.log('🎫 Tickets:', data.map(t => ({ id: t.id, display: t.display_number, doctor_id: t.doctor_id, status: t.status })))
    
    data.forEach(ticket => {
      // Check if there's a forced assignment override for this ticket
      let doctorId = doctorAssignmentOverrides.value[ticket.id] || ticket.doctor_id
      
      // For CALLED/SERVING tickets - use override or original doctor_id
      // If no doctor_id, assign to first available doctor
      if (ticket.status === 'CALLED' || ticket.status === 'SERVING') {
        const targetDoctorId = doctorId || firstDoctorId
        
        if (targetDoctorId && !currentByDoctor[targetDoctorId]) {
          currentByDoctor[targetDoctorId] = { ...ticket, doctor_id: targetDoctorId }
          console.log(`  🎯 CALLED/SERVING ticket ${ticket.display_number} for doctor: ${targetDoctorId}${doctorAssignmentOverrides.value[ticket.id] ? ' (OVERRIDE)' : ''}`)
        }
      } else if (ticket.status === 'WAITING') {
        // For WAITING tickets - distribute using round-robin if no doctor_id
        if (!doctorId && doctorIds.length > 0) {
          doctorId = doctorIds[roundRobinIndex % doctorIds.length]
          roundRobinIndex++
          console.log(`  📌 WAITING ticket ${ticket.display_number} assigned to doctor: ${doctorId} (round-robin)`)
        } else if (!doctorId && firstDoctorId) {
          doctorId = firstDoctorId
        }
        
        if (doctorId && !waitingByDoctor[doctorId]) {
          waitingByDoctor[doctorId] = []
        }
        if (doctorId) {
          waitingByDoctor[doctorId].push(ticket)
        }
      }
    })
    
    console.log('📊 Grouped by doctor:', { 
      currentByDoctor: Object.fromEntries(Object.entries(currentByDoctor).map(([k, v]) => [k, v?.display_number || null])),
      waitingByDoctor: Object.fromEntries(Object.entries(waitingByDoctor).map(([k, v]) => [k, v.length]))
    })
    
    currentTicketsByDoctor.value = currentByDoctor
    waitingQueueByDoctor.value = waitingByDoctor
    
    // Set current view based on selected doctor
    updateCurrentView()
  } else {
    error.value = result.error
  }
  
  // Fetch skipped queue from dedicated endpoint
  const skippedResult = await getSkippedQueue()
  if (skippedResult.success) {
    skippedQueue.value = skippedResult.data.map(enrichTicketWithQueueType)
  }
  
  loading.value = false
}

// Update current view based on selected doctor
const updateCurrentView = () => {
  if (selectedDoctorId.value) {
    // Show specific doctor's queue
    currentTicket.value = currentTicketsByDoctor.value[selectedDoctorId.value] || null
    waitingQueue.value = waitingQueueByDoctor.value[selectedDoctorId.value] || []
  } else {
    // Show all - first found current ticket and all waiting
    currentTicket.value = Object.values(currentTicketsByDoctor.value).find(t => t) || null
    waitingQueue.value = Object.values(waitingQueueByDoctor.value).flat()
  }
}

// Watch for doctor selection change
watch(selectedDoctorId, () => {
  updateCurrentView()
})

// Computed: doctors with active tickets count
const doctorsWithCounts = computed(() => {
  return doctors.value.map(doc => ({
    ...doc,
    currentTicket: currentTicketsByDoctor.value[doc.id],
    waitingCount: (waitingQueueByDoctor.value[doc.id] || []).length,
    hasActiveTicket: !!currentTicketsByDoctor.value[doc.id]
  }))
})

// Check if any doctors are available
const hasMultipleDoctors = computed(() => {
  return doctors.value.length >= 1
})

// Call next ticket (for selected doctor if multiple doctors)
const handleCallNext = async (doctorId = null) => {
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  // Use provided doctorId or fall back to selected doctor
  const targetDoctorId = doctorId || selectedDoctorId.value
  const result = await callNext(targetDoctorId)
  
  if (result.success) {
    successMessage.value = result.message
    showToast(`✅ ${result.message || 'Berhasil memanggil pasien berikutnya'}`, 'success')
    // Non-blocking fetch - update UI in background
    fetchQueue()
  } else {
    error.value = result.error
    showToast(`❌ ${result.error || 'Gagal memanggil'}`, 'error')
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
    showToast(`⏭️ ${result.message || 'Pasien berhasil dilewati'}`, 'info')
    // Non-blocking fetch
    fetchQueue()
  } else {
    error.value = result.error
    showToast(`❌ ${result.error || 'Gagal melewati'}`, 'error')
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
    showToast(`📢 ${result.message || 'Pasien berhasil dipanggil ulang'}`, 'success')
    // Non-blocking fetch
    fetchQueue()
  } else {
    error.value = result.error
    showToast(`❌ ${result.error || 'Gagal memanggil ulang'}`, 'error')
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
    showToast(`▶️ ${result.message || 'Layanan dimulai'}`, 'success')
    // Start the timer when service begins
    startTimer()
    // Non-blocking fetch
    fetchQueue()
  } else {
    error.value = result.error
    showToast(`❌ ${result.error || 'Gagal memulai layanan'}`, 'error')
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
    const durationText = `(Durasi: ${formatElapsedTime(elapsedSeconds.value)})`
    successMessage.value = `${result.message} ${durationText}`
    showToast(`✅ Layanan selesai ${durationText}`, 'success')
    // Reset timer state
    elapsedSeconds.value = 0
    serviceStartTime.value = null
    // Non-blocking fetch
    fetchQueue()
  } else {
    error.value = result.error
    showToast(`❌ ${result.error || 'Gagal menyelesaikan layanan'}`, 'error')
  }
  
  actionLoading.value = false
}

// ============ Per-Doctor Action Handlers ============
// These functions show confirmation modal before executing actions

// Open per-doctor confirmation modal
const openPerDoctorConfirm = (action, doc) => {
  perDoctorAction.value = action
  perDoctorTarget.value = doc
  showPerDoctorModal.value = true
}

// Get modal message based on action
const getPerDoctorModalMessage = computed(() => {
  const doc = perDoctorTarget.value
  const ticket = doc?.currentTicket?.display_number || doc?.id
  
  switch (perDoctorAction.value) {
    case 'call':
      return `Panggil pasien berikutnya untuk ${doc?.name || 'dokter ini'}?`
    case 'recall':
      return `Panggil ulang nomor ${ticket} untuk ${doc?.name}?`
    case 'skip':
      return `Lewati nomor ${ticket} untuk ${doc?.name}? Pasien bisa dipanggil kembali nanti.`
    case 'start':
      return `Mulai layanan untuk nomor ${ticket} (${doc?.name})?`
    case 'finish':
      return `Selesaikan layanan untuk nomor ${ticket} (${doc?.name})?`
    default:
      return 'Apakah Anda yakin?'
  }
})

// Get modal title based on action
const getPerDoctorModalTitle = computed(() => {
  switch (perDoctorAction.value) {
    case 'call': return ' Panggil Pasien'
    case 'recall': return 'Panggil Ulang'
    case 'finish': return 'Selesaikan Layanan'
    default: return 'Konfirmasi'
  }
})

// Execute per-doctor action after confirmation
const confirmPerDoctorAction = async () => {
  showPerDoctorModal.value = false
  
  const doc = perDoctorTarget.value
  if (!doc) return
  
  actionLoading.value = true
  error.value = null
  successMessage.value = null
  
  // === OPTIMISTIC UPDATE - Update UI immediately before API returns ===
  const doctorId = doc.id
  
  // For non-call actions, do optimistic update
  if (perDoctorAction.value === 'start' && doc.currentTicket) {
    // Update status to SERVING immediately
    currentTicketsByDoctor.value[doctorId] = { ...doc.currentTicket, status: 'SERVING' }
    updateCurrentView()
  } else if (perDoctorAction.value === 'skip' && doc.currentTicket) {
    // Remove from current immediately
    currentTicketsByDoctor.value[doctorId] = null
    updateCurrentView()
  } else if (perDoctorAction.value === 'finish' && doc.currentTicket) {
    // Remove from current immediately
    currentTicketsByDoctor.value[doctorId] = null
    updateCurrentView()
  }
  // === END OPTIMISTIC UPDATE ===
  
  let result = null
  
  switch (perDoctorAction.value) {
    case 'call':
      result = await callNext(doc.id)
      if (result.success && result.data) {
        // Use ticket data from API response and FORCE assign to clicked doctor
        const calledTicket = result.data.ticket || result.data
        const ticketWithDoctor = { 
          ...calledTicket, 
          status: 'CALLED',
          doctor_id: doctorId // Force assign to the doctor that was clicked
        }
        
        // IMPORTANT: Save override so auto-refresh respects this assignment
        doctorAssignmentOverrides.value[calledTicket.id] = doctorId
        console.log('💾 Saved override: ticket', calledTicket.id, '-> doctor', doctorId)
        
        // Update UI with the actual called ticket
        currentTicketsByDoctor.value[doctorId] = ticketWithDoctor
        
        // Remove from waiting queue if present (from ALL doctor queues, since it might be in wrong queue)
        Object.keys(waitingQueueByDoctor.value).forEach(docId => {
          waitingQueueByDoctor.value[docId] = (waitingQueueByDoctor.value[docId] || []).filter(t => t.id !== calledTicket.id)
        })
        
        updateCurrentView()
        console.log('✅ Called ticket', calledTicket.display_number, 'assigned to doctor', doctorId)
        showToast(`✅ ${doc.name}: ${calledTicket.display_number || result.message || 'Pasien dipanggil'}`, 'success')
      } else if (result.success) {
        showToast(`✅ ${doc.name}: ${result.message || 'Pasien dipanggil'}`, 'success')
        fetchQueue() // Fallback fetch if no data returned
      }
      break
      
    case 'recall':
      if (!doc.currentTicket) break
      result = await recallTicket(doc.currentTicket.id)
      if (result.success) {
        showToast(`📢 ${doc.name}: Pasien dipanggil ulang`, 'success')
      }
      break
      
    case 'skip':
      if (!doc.currentTicket) break
      result = await skipTicket(doc.currentTicket.id)
      if (result.success) {
        // Remove override since ticket is no longer active
        delete doctorAssignmentOverrides.value[doc.currentTicket.id]
        showToast(`⏭️ ${doc.name}: Pasien dilewati`, 'info')
      }
      break
      
    case 'start':
      if (!doc.currentTicket) break
      result = await startService(doc.currentTicket.id)
      if (result.success) {
        showToast(`▶️ ${doc.name}: Layanan dimulai`, 'success')
      }
      break
      
    case 'finish':
      if (!doc.currentTicket) break
      result = await finishService(doc.currentTicket.id)
      if (result.success) {
        // Remove override since ticket is done
        delete doctorAssignmentOverrides.value[doc.currentTicket.id]
        showToast(`✅ ${doc.name}: Layanan selesai`, 'success')
      }
      break
  }
  
  // Handle result for non-call actions
  if (result && perDoctorAction.value !== 'call') {
    if (result.success) {
      successMessage.value = result.message
      // Background fetch to sync with server (non-blocking)
      fetchQueue()
    } else {
      error.value = result.error
      showToast(`❌ ${result.error}`, 'error')
      // Revert optimistic update on error
      fetchQueue()
    }
  } else if (result && !result.success) {
    error.value = result.error
    showToast(`❌ ${result.error}`, 'error')
    fetchQueue()
  }
  
  // Reset
  perDoctorAction.value = null
  perDoctorTarget.value = null
  actionLoading.value = false
}

// Cancel per-doctor modal
const cancelPerDoctorAction = () => {
  showPerDoctorModal.value = false
  perDoctorAction.value = null
  perDoctorTarget.value = null
}

// Legacy handlers - now open modal first
const handleRecallForDoctor = (doc) => openPerDoctorConfirm('recall', doc)
const handleSkipForDoctor = (doc) => openPerDoctorConfirm('skip', doc)
const handleStartForDoctor = (doc) => openPerDoctorConfirm('start', doc)
const handleFinishForDoctor = (doc) => openPerDoctorConfirm('finish', doc)
const handleCallForDoctor = (doc) => openPerDoctorConfirm('call', doc)

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

      <!-- Toast Notification -->
      <Transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="toast.show" 
          class="fixed top-4 right-4 z-50 max-w-sm w-full shadow-lg rounded-xl pointer-events-auto"
          :class="{
            'bg-green-500 text-white': toast.type === 'success',
            'bg-red-500 text-white': toast.type === 'error',
            'bg-blue-500 text-white': toast.type === 'info'
          }"
        >
          <div class="p-4">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">{{ toast.message }}</p>
              <button 
                @click="toast.show = false" 
                class="ml-4 text-white/80 hover:text-white focus:outline-none"
              >
                <span class="sr-only">Tutup</span>
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>

      <div v-else class="space-y-6">
        <!-- Doctor Tabs (when multiple doctors available) -->
        

        <!-- Per-Doctor Grid Cards (when multiple doctors) -->
        <div v-if="hasMultipleDoctors" class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Stethoscope class="w-5 h-5" />
            Kelola Antrian Per Dokter
          </h2>
          
          <div :class="[
            'grid gap-4',
            doctorsWithCounts.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
            doctorsWithCounts.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          ]">
            <div 
              v-for="doc in doctorsWithCounts" 
              :key="doc.id"
              :class="[
                'bg-white rounded-2xl p-6 border-2 transition shadow-sm',
                doc.hasActiveTicket ? 'border-green-400 shadow-lg' : 'border-gray-200'
              ]"
            >
              <!-- Doctor Header -->
              <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <h3 class="font-bold text-gray-900 flex items-center gap-2">
                  <Stethoscope class="w-5 h-5 text-blue-600" />
                  {{ doc.name }}
                </h3>
                <div class="flex items-center gap-2">
                  <span class="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    {{ doc.waitingCount }} menunggu
                  </span>
                  <span v-if="doc.hasActiveTicket" class="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                    Aktif
                  </span>
                </div>
              </div>
              
              <!-- Current Ticket Display -->
              <div v-if="doc.currentTicket" class="mb-4">
                <div class="text-center py-6 bg-black text-white rounded-xl">
                  <p class="text-5xl font-bold mb-2">{{ doc.currentTicket.display_number }}</p>
                  <p :class="['inline-block px-4 py-1 rounded-full text-sm font-medium border', statusColors[doc.currentTicket.status]]">
                    {{ doc.currentTicket.status === 'SERVING' ? 'Sedang Dilayani' : 'Dipanggil' }}
                  </p>
                </div>
                
                <!-- Ticket Info -->
                <div class="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-500">
                  <div>
                    <span class="text-gray-400">Ambil:</span>
                    {{ new Date(doc.currentTicket.issued_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                  <div v-if="doc.currentTicket.called_at">
                    <span class="text-gray-400">Panggil:</span>
                    {{ new Date(doc.currentTicket.called_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                </div>
              </div>
              
              <!-- Empty State -->
              <div v-else class="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mb-4">
                <Clock class="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p class="text-sm">Tidak ada pasien</p>
              </div>
              
              <!-- Control Buttons Grid -->
              <div class="grid grid-cols-4 gap-2 mb-3">
                <button
                  @click="handleRecallForDoctor(doc)"
                  :disabled="actionLoading || !doc.currentTicket || doc.currentTicket.status === 'SERVING'"
                  class="flex flex-col items-center justify-center p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title="Recall"
                >
                  <RefreshCw class="w-4 h-4" />
                  <span class="text-xs mt-1">Recall</span>
                </button>
                
                <button
                  @click="handleSkipForDoctor(doc)"
                  :disabled="actionLoading || !doc.currentTicket || doc.currentTicket.status === 'SERVING'"
                  class="flex flex-col items-center justify-center p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title="Skip"
                >
                  <SkipForward class="w-4 h-4" />
                  <span class="text-xs mt-1">Skip</span>
                </button>
                
                <button
                  @click="handleStartForDoctor(doc)"
                  :disabled="actionLoading || !doc.currentTicket || doc.currentTicket.status !== 'CALLED'"
                  class="flex flex-col items-center justify-center p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title="Mulai"
                >
                  <Play class="w-4 h-4" />
                  <span class="text-xs mt-1">Mulai</span>
                </button>
                
                <button
                  @click="handleFinishForDoctor(doc)"
                  :disabled="actionLoading || !doc.currentTicket || doc.currentTicket.status !== 'SERVING'"
                  class="flex flex-col items-center justify-center p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title="Selesai"
                >
                  <CheckCircle class="w-4 h-4" />
                  <span class="text-xs mt-1">Selesai</span>
                </button>
              </div>
              
              <!-- Call Next Button -->
              <button
                @click="handleCallForDoctor(doc)"
                :disabled="actionLoading || doc.hasActiveTicket || doc.waitingCount === 0"
                :class="[
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition font-semibold',
                  doc.hasActiveTicket || doc.waitingCount === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                ]"
              >
                <Phone class="w-5 h-5" />
                Panggil Berikutnya
              </button>
            </div>
          </div>
        </div>
        </div>

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
                    <span v-if="ticket.doctor_id && doctors.find(d => d.id === ticket.doctor_id)" class="ml-2 text-blue-600">
                      • {{ doctors.find(d => d.id === ticket.doctor_id)?.name }}
                    </span>
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

    <!-- Per-Doctor Action Confirmation Modal -->
    <ConfirmModal
      :show="showPerDoctorModal"
      :title="getPerDoctorModalTitle"
      :message="getPerDoctorModalMessage"
      confirm-text="Ya, Lanjutkan"
      cancel-text="Batal"
      :type="perDoctorAction === 'skip' ? 'warning' : perDoctorAction === 'finish' ? 'success' : 'info'"
      @confirm="confirmPerDoctorAction"
      @cancel="cancelPerDoctorAction"
    />
  </StaffLayout>
</template>
