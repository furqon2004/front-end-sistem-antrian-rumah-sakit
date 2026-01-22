<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Loader2, User, Clock, Users, Stethoscope } from 'lucide-vue-next'
import { ticketStorage } from '@/utils/ticketStorage'

const { checkTicketInQueue } = useQueueStatusCheck()
const { baseURL } = useApi()

const loading = ref(true)
const userQueues = ref([])
const doctors = ref([])
const queueTypes = ref([])
let pollInterval = null

// Fetch doctors data to get doctor names
const fetchDoctors = async () => {
  try {
    const response = await fetch(`${baseURL}/v1/customer/info/doctors`)
    if (response.ok) {
      const result = await response.json()
      doctors.value = result.data || []
    }
  } catch (e) {
    console.error('Failed to fetch doctors:', e)
  }
}

// Fetch queue types to get poly_id mapping
const fetchQueueTypes = async () => {
  try {
    const response = await fetch(`${baseURL}/v1/customer/info/queue-types`)
    if (response.ok) {
      const result = await response.json()
      queueTypes.value = result.data || []
    }
  } catch (e) {
    console.error('Failed to fetch queue types:', e)
  }
}

// Get poly_id from queue type ID
const getPolyIdFromQueueType = (queueTypeId) => {
  const qt = queueTypes.value.find(q => q.id === queueTypeId)
  return qt?.poly_id || null
}

// Get doctor for a specific poly on current day
const getDoctorForPoly = (polyId) => {
  if (!polyId) return null
  
  const today = new Date().getDay()
  const dayOfWeek = today === 0 ? 7 : today
  
  const doctor = doctors.value.find(doc => {
    if (doc.poly_id !== polyId) return false
    if (!doc.schedules) return false
    return doc.schedules.some(s => s.day_of_week === dayOfWeek)
  })
  
  return doctor ? doctor.name : null
}

// Load and check status of user's tickets
const loadUserQueueStatus = async () => {
  const tickets = ticketStorage.getTickets()
  
  if (!tickets || tickets.length === 0) {
    userQueues.value = []
    loading.value = false
    return
  }
  
  const queueStatuses = []
  
  for (const ticket of tickets) {
    try {
      const result = await checkTicketInQueue(ticket.token, ticket.queue_type_id)
      
      if (result.exists && result.status !== 'DONE' && result.status !== 'CANCELLED') {
        // Get poly_id from queue type
        const polyId = getPolyIdFromQueueType(ticket.queue_type_id)
        const doctorName = getDoctorForPoly(polyId)
        
        queueStatuses.push({
          id: ticket.id,
          name: ticket.queue_type_name,
          polyId: polyId,
          status: result.status === 'CALLED' || result.status === 'SERVING' ? 'serving' : 'active',
          // Use display_number or ticket_number for full format like "A-003"
          current: ticket.display_number || ticket.ticket_number || ticket.queue_number,
          // remaining_queues now shows correct count of people ahead (calculated in useQueueStatusCheck)
          waiting: result.remaining_queues ?? 0,
          eta: result.estimated_waiting_minutes ?? 15,
          doctorName: doctorName,
          ticketStatus: result.status
        })
      }
    } catch (e) {
      console.error('Failed to check ticket status:', e)
    }
  }
  
  userQueues.value = queueStatuses
  loading.value = false
}

// Polling for real-time updates
const startPolling = () => {
  pollInterval = setInterval(() => {
    loadUserQueueStatus()
  }, 15000) // Poll every 15 seconds
}

onMounted(async () => {
  await fetchQueueTypes()
  await fetchDoctors()
  await loadUserQueueStatus()
  startPolling()
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

const statusMap = {
  active: {
    label: 'Menunggu',
    badge: 'bg-blue-100 text-blue-700'
  },
  serving: {
    label: 'Dipanggil',
    badge: 'bg-green-100 text-green-700 animate-pulse'
  },
  closed: {
    label: 'Selesai',
    badge: 'bg-gray-200 text-gray-700'
  }
}
</script>

<template>
  <!-- FULL WIDTH BACKGROUND -->
  <section class="py-20">
    <div class="max-w-7xl mx-auto px-4 md:px-6">
      <h2 class="text-3xl font-bold mb-2">
        Status Antrian Real-time
      </h2>
      <p class="text-gray-600 mb-10">
        Pantau nomor antrian terkini dari setiap layanan yang Anda ambil
      </p>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!userQueues || userQueues.length === 0" class="text-center py-12">
        <p class="text-gray-500">Anda belum mengambil antrian. Silakan ambil nomor antrian di atas.</p>
      </div>

      <!-- Queue Status Grid -->
      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="queue in userQueues"
          :key="queue.id"
          class="border rounded-xl p-6 bg-white relative transition-all duration-200 hover:shadow-lg"
          :class="{
            'border-green-300 bg-green-50': queue.status === 'serving',
            'border-gray-200': queue.status !== 'serving'
          }"
        >
          <!-- HEADER -->
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-semibold text-lg">{{ queue.name }}</h3>
            <span 
              class="text-xs px-3 py-1 rounded-full"
              :class="statusMap[queue.status]?.badge || 'bg-gray-200 text-gray-700'"
            >
              {{ statusMap[queue.status]?.label || queue.ticketStatus }}
            </span>
          </div>

          <!-- CONTENT -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p class="text-sm text-gray-500 mb-1">Nomor Antrian</p>
              <p class="text-3xl font-bold font-mono">{{ queue.current }}</p>
            </div>

            <div class="text-right">
              <p class="text-sm text-gray-500 mb-1">Sisa Antrian</p>
              <p class="text-xl font-semibold flex items-center justify-end gap-1">
                <Users class="w-4 h-4 text-gray-400" />
                {{ queue.waiting }}
              </p>
            </div>
          </div>

          <!-- DOCTOR INFO -->
          <div v-if="queue.doctorName" class="border-t pt-4 mb-4">
            <p class="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <Stethoscope class="w-4 h-4" /> Dokter Bertugas
            </p>
            <p class="font-semibold text-gray-900">{{ queue.doctorName }}</p>
          </div>

          <!-- ESTIMATED WAIT TIME -->
          <div class="border-t pt-4">
            <p class="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <Clock class="w-4 h-4" /> Estimasi Waktu Tunggu
            </p>
            <p class="font-semibold">
              {{ queue.waiting > 0 ? queue.eta + ' menit' : 'Segera dipanggil' }}
            </p>
          </div>

          <!-- CALLED NOTIFICATION -->
          <div 
            v-if="queue.status === 'serving'" 
            class="mt-4 p-3 bg-green-100 rounded-lg text-center"
          >
            <p class="text-green-800 font-bold animate-pulse">
              🔔 Giliran Anda! Silakan menuju loket.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
