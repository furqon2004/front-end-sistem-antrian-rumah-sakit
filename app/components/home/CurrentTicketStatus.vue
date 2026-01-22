<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Ticket, Users, Clock, AlertCircle } from 'lucide-vue-next'
import { ticketStorage } from '@/utils/ticketStorage'

const { checkTicketInQueue } = useQueueStatusCheck()
const router = useRouter()

const activeTicket = ref(null)
const allTicketsCount = ref(0)
const loading = ref(true)
const statusData = ref(null)
let pollInterval = null

// Load ticket from storage
const loadTicket = async () => {
  const tickets = ticketStorage.getTickets()
  allTicketsCount.value = tickets.length
  
  // Get the most recent ticket that is not done
  if (tickets && tickets.length > 0) {
    // Sort by date descending
    const latest = tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    
    // Check status
    loading.value = true
    const result = await checkTicketInQueue(latest.token, latest.queue_type_id)
    
    if (result.exists && result.status !== 'DONE' && result.status !== 'CANCELLED' && result.status !== 'COMPLETED') {
      activeTicket.value = latest
      statusData.value = result
    } else {
      activeTicket.value = null // Latest ticket is done
    }
    loading.value = false
  } else {
    activeTicket.value = null
    loading.value = false
  }
}

// Polling
const startPolling = () => {
  pollInterval = setInterval(async () => {
    if (activeTicket.value) {
      const result = await checkTicketInQueue(activeTicket.value.token, activeTicket.value.queue_type_id)
      if (result.exists && result.status !== 'DONE' && result.status !== 'CANCELLED' && result.status !== 'COMPLETED') {
        statusData.value = result
      } else {
        // Ticket finished/cancelled while watching
        activeTicket.value = null
        statusData.value = null
      }
    }
  }, 10000) // Poll every 10s
}

// Go to ticket page
const viewTicket = () => {
  if (activeTicket.value) {
    router.push(`/ticket?token=${activeTicket.value.token}`)
  }
}

onMounted(() => {
  loadTicket()
  startPolling()
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div v-if="loading" class="max-w-7xl mx-auto px-4 md:px-6 pt-6">
    <div class="animate-pulse bg-gray-200 h-24 rounded-xl"></div>
  </div>

  <div v-else-if="activeTicket" class="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-2">
    <div 
      class="bg-white border rounded-xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:border-gray-300 transition"
      @click="viewTicket"
    >
      <div class="flex items-center gap-4 w-full md:w-auto">
        <div 
          class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          :class="statusData?.status === 'CALLED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'"
        >
          <Ticket class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-0.5">
            Tiket Aktif Anda
            <span v-if="allTicketsCount > 1" class="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              +{{ allTicketsCount - 1 }} lainnya
            </span>
          </p>
          <h3 class="text-xl font-bold font-mono">{{ activeTicket.queue_number }}</h3>
          <p class="text-xs text-gray-400">{{ activeTicket.queue_type_name }}</p>
        </div>
      </div>

      <div class="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
        <div class="text-center md:text-right">
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
          <span 
            class="px-3 py-1 text-xs font-bold rounded-full"
            :class="{
              'bg-blue-100 text-blue-700': statusData?.status === 'WAITING',
              'bg-green-100 text-green-700 animate-pulse': statusData?.status === 'CALLED' || statusData?.status === 'SERVING',
              'bg-gray-100 text-gray-700': !statusData?.status
            }"
          >
            {{ statusData?.status || 'Active' }}
          </span>
        </div>

        <div v-if="statusData?.remaining_queues !== undefined" class="text-center md:text-right border-l pl-6 border-gray-100">
           <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Sisa Antrian</p>
           <p class="font-bold text-gray-900 flex items-center gap-1">
             <Users class="w-3 h-3" /> {{ statusData.remaining_queues }}
           </p>
        </div>

        <div v-if="statusData?.estimated_waiting_minutes" class="text-center md:text-right border-l pl-6 border-gray-100 hidden sm:block">
           <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Estimasi</p>
           <p class="font-bold text-gray-900 flex items-center gap-1">
             <Clock class="w-3 h-3" /> {{ statusData.estimated_waiting_minutes }} m
           </p>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-2">
    <!-- Optional: Promo / Call to Action if no ticket -->
    <div class="bg-gray-900 text-white rounded-xl p-6 flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-4">
        <div class="bg-white/10 p-3 rounded-full">
           <AlertCircle class="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 class="font-bold text-lg">Belum Mengambil Nomor Antrian?</h3>
          <p class="text-gray-300 text-sm">Pilih layanan di bawah untuk mengambil nomor antrian Anda.</p>
        </div>
      </div>
    </div>
  </div>
</template>
